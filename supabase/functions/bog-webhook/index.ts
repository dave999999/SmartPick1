// supabase/functions/bog-webhook/index.ts
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createBOGClient } from "../../../src/lib/payments/bog.ts";
import { checkRateLimit, getRateLimitIdentifier, rateLimitResponse } from '../_shared/rateLimit.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { bogWebhookSchema, validateData, getValidationErrorMessage } from '../_shared/validation.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    console.log('[bog-webhook] Webhook received');

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
      console.error(`[bog-webhook] Rate limit exceeded for ${rateLimitId}`);
      return rateLimitResponse(rateLimit);
    }

    // 2. REQUIRED: Verify Auth-Key header for security
    const authKey = req.headers.get("Auth-Key");
    const expectedKey = Deno.env.get("BOG_AUTH_KEY");

    // CRITICAL: Webhook MUST have Auth-Key configured
    if (!expectedKey) {
      console.error('[bog-webhook] SECURITY ERROR: BOG_AUTH_KEY not configured!');
      return new Response(JSON.stringify({ 
        error: "Webhook disabled for security - BOG_AUTH_KEY not configured" 
      }), { 
        status: 503, // Service Unavailable
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (authKey !== expectedKey) {
      console.error('[bog-webhook] Invalid Auth-Key');
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Parse and validate webhook body with Zod schema
    const body = await req.json();
    console.log('[bog-webhook] Webhook body:', JSON.stringify(body, null, 2));

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
      console.error('[bog-webhook] Validation failed:', errorMsg);
      return new Response(JSON.stringify({ error: "Invalid webhook data", details: errorMsg }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
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

    console.log('[bog-webhook] Parsed data:', { 
      orderId: data.orderId, 
      status: data.status,
      transactionId: data.transactionId 
    });

    // 4. Load order from database
    const { data: order, error: orderErr } = await supabase
      .from("point_purchase_orders")
      .select("*")
      .eq("id", data.orderId)
      .single();

    if (orderErr || !order) {
      console.error('[bog-webhook] Order not found:', data.orderId, orderErr);
      return new Response(JSON.stringify({ error: "Order not found" }), { 
        status: 200, // Return 200 to prevent BOG from retrying
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[bog-webhook] Order found:', { 
      id: order.id, 
      currentStatus: order.status,
      userId: order.user_id,
      points: order.points
    });

    // 5. Idempotent check - if already processed, return success
    if (order.status === "PAID" || order.status === "FAILED") {
      console.log('[bog-webhook] Order already processed with status:', order.status);
      return new Response(JSON.stringify({ message: "Already processed" }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. Map BOG status to internal status
    const mapped = bog.mapBOGStatus(data.status);
    console.log('[bog-webhook] Status mapped:', { raw: data.status, mapped: mapped.status });

    // 7. Handle SUCCESS status
    if (mapped.status === "SUCCESS") {
      console.log('[bog-webhook] Processing successful payment');

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
        console.error('[bog-webhook] Failed to update order:', updateErr);
        throw new Error('Failed to update order status');
      }

      // Get current user points
      const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("user_points")
        .eq("id", order.user_id)
        .single();

      if (userErr) {
        console.error('[bog-webhook] Failed to get user:', userErr);
        throw new Error('Failed to get user data');
      }

      const currentPoints = userData?.user_points || 0;
      const newPoints = currentPoints + order.points;

      console.log('[bog-webhook] Crediting points:', { 
        currentPoints, 
        pointsToAdd: order.points, 
        newPoints 
      });

      // Update user points
      const { error: pointsErr } = await supabase
        .from("users")
        .update({ user_points: newPoints })
        .eq("id", order.user_id);

      if (pointsErr) {
        console.error('[bog-webhook] Failed to update user points:', pointsErr);
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
        console.error('[bog-webhook] Failed to insert points history:', historyErr);
        // Don't throw - points are already credited
      }

      console.log('[bog-webhook] Payment processed successfully');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Payment processed",
          orderId: order.id,
          pointsCredited: order.points
        }), 
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 8. Handle FAILED or CANCELLED status
    console.log('[bog-webhook] Processing failed/cancelled payment');

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

    console.log('[bog-webhook] Order marked as failed');

    return new Response(
      JSON.stringify({ success: true, message: "Payment failed/cancelled" }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('[bog-webhook] Fatal error:', err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { 
        status: 200, // Return 200 to prevent BOG from retrying on unrecoverable errors
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
