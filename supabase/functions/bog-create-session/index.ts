// supabase/functions/bog-create-session/index.ts
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createBOGClient } from "../../../src/lib/payments/bog.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { checkRateLimit, getRateLimitIdentifier, rateLimitResponse } from '../_shared/rateLimit.ts';
import { createLogger } from '../_shared/logger.ts';

const logger = createLogger('bog-create-session');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    logger.debug('Request received');

    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logger.error('No Authorization header');
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

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

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      logger.error('Authentication failed', authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    logger.info('User authenticated');

    // Rate limiting: 10 payment sessions per minute per user
    const identifier = getRateLimitIdentifier(req, user.id);
    const rateLimit = await checkRateLimit(supabase, identifier, 'create-session', 10, 60);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const { gel_amount, points } = body;

    if (!gel_amount || !points || gel_amount <= 0 || points <= 0) {
      logger.error('Invalid input parameters');
      return new Response(
        JSON.stringify({ error: "Invalid gel_amount or points" }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate points/GEL ratio (1 GEL = 100 points, allow ±1 point tolerance)
    const expectedPoints = Math.floor(gel_amount * 100);
    if (Math.abs(points - expectedPoints) > 1) {
      logger.error('Invalid points/GEL ratio');
      return new Response(
        JSON.stringify({ error: "Invalid points to GEL ratio" }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    logger.info('Creating order', { points, gelAmount: gel_amount });

    // 3. Create order in database (PENDING)
    const { data: order, error: orderErr } = await supabase
      .from("point_purchase_orders")
      .insert({
        user_id: user.id,
        points,
        gel_amount,
        unit_price: 0.01, // 1 GEL = 100 points = 0.01 GEL per point
        status: "PENDING",
      })
      .select()
      .single();

    if (orderErr || !order) {
      logger.error('Failed to create order', orderErr);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    logger.info('Order created');

    // 4. Initialize BOG client and create payment session
    const bog = createBOGClient();

    const baseUrl = Deno.env.get("PUBLIC_BASE_URL") || "http://localhost:5173";
    const callbackUrl = Deno.env.get("BOG_CALLBACK_URL") || `${Deno.env.get("SUPABASE_URL")}/functions/v1/bog-webhook`;

    logger.info('Creating BOG payment session', { amount: gel_amount });

    let result;
    try {
      result = await bog.createPaymentSession({
        amount: gel_amount,
        currency: "GEL",
        orderId: order.id,
        userId: user.id,
        returnUrl: `${baseUrl}/profile?purchase=success&orderId=${order.id}`,
        callbackUrl,
        description: `SmartPoints Purchase: ${points} points`,
        metadata: { points, gel_amount },
      });
      logger.info('BOG session created successfully');
    } catch (bogError) {
      logger.error('BOG API error', bogError);
      
      // Mark order as failed
      await supabase
        .from("point_purchase_orders")
        .update({ 
          status: "FAILED",
          metadata: { error: bogError.message, timestamp: new Date().toISOString() }
        })
        .eq("id", order.id);
      
      // Return friendly error message
      return new Response(
        JSON.stringify({ 
          error: "Payment service temporarily unavailable. Your account has not been charged. Please contact support if your BOG merchant account is not yet approved.",
          details: bogError.message 
        }),
        { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 5. Update order with provider session ID
    await supabase
      .from("point_purchase_orders")
      .update({ provider_session_id: result.sessionId })
      .eq("id", order.id);

    logger.info('Payment session created successfully');

    // 6. Return redirect URL to frontend
    return new Response(
      JSON.stringify({ redirectUrl: result.redirectUrl }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (err) {
    logger.error('Fatal error', err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});


