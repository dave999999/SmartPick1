// supabase/functions/bog-webhook/index.ts
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createBOGClient } from "../../../src/lib/payments/bog.ts";
import { checkRateLimit, getRateLimitIdentifier, rateLimitResponse } from '../_shared/rateLimit.ts';
import { getSecureHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { bogWebhookSchema, validateData, getValidationErrorMessage } from '../_shared/validation.ts';
import { createLogger } from '../_shared/logger.ts';

const logger = createLogger('bog-webhook');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const secureHeaders = getSecureHeaders(req);

  try {
    logger.debug('Webhook received');

    // 1. Create Supabase client with service role and connection pooling
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: { persistSession: false },
        db: { schema: 'public' },
        global: {
          headers: { 'x-connection-pool': 'transaction' }
        }
      }
    );

    // SECURITY: Rate limiting - 100 webhook calls per minute from same IP
    // BOG should not send more than a few per minute normally
    const rateLimitId = getRateLimitIdentifier(req);
    const rateLimit = await checkRateLimit(supabase, rateLimitId, 'bog-webhook', 100, 60);
    
    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded');
      return rateLimitResponse(rateLimit);
    }

    // 2. REQUIRED: Verify Auth-Key header for security
    const authKey = req.headers.get("Auth-Key");
    const expectedKey = Deno.env.get("BOG_AUTH_KEY");

    // CRITICAL: Webhook MUST have Auth-Key configured
    if (!expectedKey) {
      logger.error('SECURITY ERROR: BOG_AUTH_KEY not configured');
      return new Response(JSON.stringify({ 
        error: "Webhook disabled for security - BOG_AUTH_KEY not configured" 
      }), { 
        status: 503, // Service Unavailable
        headers: secureHeaders
      });
    }

    if (authKey !== expectedKey) {
      logger.error('Invalid Auth-Key');
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: secureHeaders
      });
    }

    // 3. Parse and validate webhook body with Zod schema
    const body = await req.json();
    logger.debug('Webhook data received');

    const bog = createBOGClient();
    const rawData = bog.parseWebhookData(body);

    // SECURITY: Validate webhook data structure to prevent injection attacks
    const validationResult = validateData(bogWebhookSchema, {
      order_id: rawData.orderId,
      external_order_id: rawData.externalOrderId || 'unknown',
      status: rawData.status,
      payment_hash: rawData.paymentHash,
      transaction_id: rawData.transactionId,
      card_mask: rawData.cardMask,
      amount: rawData.amount,
    });

    if (!validationResult.success) {
      const errorMsg = getValidationErrorMessage(validationResult.errors);
      logger.error('Webhook validation failed', undefined, { error: errorMsg });
      return new Response(JSON.stringify({ error: "Invalid webhook data", details: errorMsg }), { 
        status: 400,
        headers: secureHeaders
      });
    }

    const data = {
      orderId: validationResult.data.order_id,
      externalOrderId: validationResult.data.external_order_id,
      status: validationResult.data.status,
      transactionId: validationResult.data.transaction_id,
      paymentHash: validationResult.data.payment_hash,
      cardMask: validationResult.data.card_mask,
    };

    logger.info('Webhook data validated', { status: data.status });

    // 4. Load order from database
    const { data: order, error: orderErr } = await supabase
      .from("point_purchase_orders")
      .select("*")
      .eq("id", data.orderId)
      .single();

    if (orderErr || !order) {
      logger.error('Order not found', orderErr);
      return new Response(JSON.stringify({ error: "Order not found" }), { 
        status: 200, // Return 200 to prevent BOG from retrying
        headers: secureHeaders
      });
    }

    logger.info('Order found', { currentStatus: order.status });

    // 5. Idempotent check - if already processed, return success
    if (order.status === "PAID" || order.status === "FAILED") {
      logger.info('Order already processed', { status: order.status });
      return new Response(JSON.stringify({ message: "Already processed" }), { 
        status: 200,
        headers: secureHeaders
      });
    }

    // 6. Map BOG status to internal status
    const mapped = bog.mapBOGStatus(data.status);
    logger.debug('Status mapped', { rawStatus: data.status, mappedStatus: mapped.status });

    // 7. Handle SUCCESS status
    if (mapped.status === "SUCCESS") {
      logger.info('Processing successful payment');

      // Update order status to PAID
      const { error: updateErr } = await supabase
        .from("point_purchase_orders")
        .update({
          status: "PAID",
          provider_transaction_id: data.transactionId,
          metadata: {
            ...order.metadata,
            webhook_received_at: new Date().toISOString(),
            webhook_data: body,
          },
        })
        .eq("id", order.id)
        .eq("status", "PENDING"); // Only update if still pending

      if (updateErr) {
        logger.error('Failed to update order', updateErr);
        throw new Error('Failed to update order status');
      }

      // Get current user points
      const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("user_points")
        .eq("id", order.user_id)
        .single();

      if (userErr) {
        logger.error('Failed to get user', userErr);
        throw new Error('Failed to get user data');
      }

      const currentPoints = userData?.user_points || 0;
      const newPoints = currentPoints + order.points;

      logger.info('Crediting points');

      // Update user points
      const { error: pointsErr } = await supabase
        .from("users")
        .update({ user_points: newPoints })
        .eq("id", order.user_id);

      if (pointsErr) {
        logger.error('Failed to update user points', pointsErr);
        throw new Error('Failed to credit points');
      }

      // Insert points history record
      const { error: historyErr } = await supabase
        .from("points_history")
        .insert({
          user_id: order.user_id,
          delta: order.points,
          reason: "POINT_PURCHASE",
          balance_after: newPoints,
          metadata: {
            order_id: order.id,
            provider: "BOG",
            transaction_id: data.transactionId,
            gel_amount: order.gel_amount,
          },
        });

      if (historyErr) {
        logger.error('Failed to insert points history', historyErr);
        // Don't throw - points are already credited
      }

      logger.info('Payment processed successfully');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Payment processed",
          orderId: order.id,
          pointsCredited: order.points
        }), 
        { 
          status: 200,
          headers: secureHeaders
        }
      );
    }

    // 8. Handle FAILED or CANCELLED status
    logger.info('Processing failed/cancelled payment');

    await supabase
      .from("point_purchase_orders")
      .update({
        status: "FAILED",
        provider_transaction_id: data.transactionId,
        metadata: {
          ...order.metadata,
          webhook_received_at: new Date().toISOString(),
          webhook_data: body,
        },
      })
      .eq("id", order.id)
      .eq("status", "PENDING");

    logger.info('Order marked as failed');

    return new Response(
      JSON.stringify({ success: true, message: "Payment failed/cancelled" }), 
      { 
        status: 200,
        headers: secureHeaders
      }
    );

  } catch (err) {
    logger.error('Fatal error', err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { 
        status: 200, // Return 200 to prevent BOG from retrying on unrecoverable errors
        headers: secureHeaders
      }
    );
  }
});
