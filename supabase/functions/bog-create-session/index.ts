// supabase/functions/bog-create-session/index.ts
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createBOGClient } from "../../../src/lib/payments/bog.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { checkRateLimit, getRateLimitIdentifier, rateLimitResponse } from '../_shared/rateLimit.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    console.log('[bog-create-session] Request received');

    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('[bog-create-session] No Authorization header');
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
      console.error('[bog-create-session] Auth failed:', authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('[bog-create-session] User authenticated:', user.id);

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
      console.error('[bog-create-session] Invalid input:', { gel_amount, points });
      return new Response(
        JSON.stringify({ error: "Invalid gel_amount or points" }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate points/GEL ratio (1 GEL = 100 points, allow ±1 point tolerance)
    const expectedPoints = Math.floor(gel_amount * 100);
    if (Math.abs(points - expectedPoints) > 1) {
      console.error('[bog-create-session] Invalid points/GEL ratio:', { gel_amount, points, expectedPoints });
      return new Response(
        JSON.stringify({ error: "Invalid points to GEL ratio" }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('[bog-create-session] Creating order:', { user_id: user.id, points, gel_amount });

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
      console.error('[bog-create-session] Failed to create order:', orderErr);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('[bog-create-session] Order created:', order.id);

    // 4. Initialize BOG client and create payment session
    const bog = createBOGClient();

    const baseUrl = Deno.env.get("PUBLIC_BASE_URL") || "http://localhost:5173";
    const callbackUrl = Deno.env.get("BOG_CALLBACK_URL") || `${Deno.env.get("SUPABASE_URL")}/functions/v1/bog-webhook`;

    console.log('[bog-create-session] Creating BOG payment session:', {
      amount: gel_amount,
      orderId: order.id,
      returnUrl: `${baseUrl}/profile?purchase=success&orderId=${order.id}`,
      callbackUrl,
    });

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
      console.log('[bog-create-session] BOG session created:', result.sessionId);
    } catch (bogError) {
      console.error('[bog-create-session] BOG API error:', bogError);
      
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

    console.log('[bog-create-session] Success, redirectUrl:', result.redirectUrl);

    // 6. Return redirect URL to frontend
    return new Response(
      JSON.stringify({ redirectUrl: result.redirectUrl }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (err) {
    console.error('[bog-create-session] Fatal error:', err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});


