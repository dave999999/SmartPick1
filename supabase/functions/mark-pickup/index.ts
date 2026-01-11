// Supabase Edge Function to handle reservation pickup with points
// This runs with service_role permissions, allowing it to modify points

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { checkRateLimitAdvanced, getRequestMetadata, getRateLimitIdentifier, rateLimitResponse } from '../_shared/rateLimitAdvanced.ts'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

// Declare Deno for TypeScript tooling (runtime has it)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req)
  }

  const corsHeaders = getCorsHeaders(req)

  try {
    // Create Supabase client first for rate limiting
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: { schema: 'public' },
        global: {
          headers: { 'x-connection-pool': 'transaction' }
        }
      }
    )

    // Get auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '')

    // Get current user using admin client with the JWT token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      console.error('Auth error:', userError)
      throw new Error('Unauthorized')
    }

    // SECURITY: Enhanced rate limiting with IP tracking - 30 pickups per minute per user/IP
    const metadata = getRequestMetadata(req);
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = await checkRateLimitAdvanced(
      supabaseAdmin, 
      rateLimitId, 
      'mark-pickup', 
      30, 
      60,
      metadata
    );
    
    if (!rateLimit.allowed) {
      console.log(`[mark-pickup] Rate limit exceeded for ${rateLimitId} from IP ${metadata.ip}`);
      return rateLimitResponse(rateLimit, corsHeaders);
    }

    // Get request body
    const { reservation_id } = await req.json()
    if (!reservation_id) {
      throw new Error('reservation_id is required')
    }

    // Verify user is the partner who owns this reservation
    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (partnerError || !partner) {
      throw new Error('User is not a partner')
    }

    // Get reservation details (keep selection simple to avoid relationship errors)
    const { data: reservation, error: reservationError } = await supabaseAdmin
      .from('reservations')
      .select('id, partner_id, customer_id, status, picked_up_at, offer_id')
      .eq('id', reservation_id)
      .single()

    if (reservationError || !reservation) {
      console.error('❌ Fetch reservation error:', reservationError)
      throw new Error(`Reservation fetch failed: ${reservationError?.message ?? 'Unknown error'}`)
    }

    // Verify partner owns this reservation
    if (reservation.partner_id !== partner.id) {
      throw new Error('This reservation belongs to another partner')
    }

    // Check if partner is trying to mark their own reservation
    const isPartnerOwnReservation = reservation.customer_id === user.id
    if (isPartnerOwnReservation) {
      console.warn('⚠️ Partner is marking their own reservation as picked up:', {
        partner_id: partner.id,
        customer_id: reservation.customer_id,
        user_id: user.id
      })
    }

    // Idempotent: if already PICKED_UP, return success
    if (reservation.status === 'PICKED_UP') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Reservation already marked as picked up',
          reservation: {
            id: reservation_id,
            status: 'PICKED_UP',
            picked_up_at: reservation.picked_up_at ?? new Date().toISOString()
          },
          handled_by_triggers: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Verify status is ACTIVE
    if (reservation.status !== 'ACTIVE') {
      throw new Error(`Reservation status is ${reservation.status}, must be ACTIVE`)
    }

    console.log('📝 Attempting to update reservation to PICKED_UP...', {
      reservation_id,
      current_status: reservation.status,
      customer_id: reservation.customer_id
    })

    // Update reservation to PICKED_UP (atomic status check prevents replay attacks)
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'PICKED_UP',
        picked_up_at: new Date().toISOString()
      })
      .eq('id', reservation_id)
      .eq('status', 'ACTIVE')  // SECURITY: Atomic check - prevents QR replay if already PICKED_UP/CANCELLED
      .eq('partner_id', partner.id)
      .select()

    if (updateError) {
      console.error('❌ Update reservation error:', {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      })
      const details = (updateError as any)?.details ?? null
      const hint = (updateError as any)?.hint ?? null
      const code = (updateError as any)?.code ?? null
      throw new Error(`Failed to update reservation: ${updateError.message}${details ? ` | details: ${details}` : ''}${hint ? ` | hint: ${hint}` : ''}${code ? ` | code: ${code}` : ''}`)
    }

    console.log('✅ Reservation updated to PICKED_UP successfully:', updateData)

    // Important: Do NOT adjust points here. Database triggers handle escrow release.
    // The following responsibilities are delegated to SQL triggers:
    // - Transfer held points from escrow_points to partner_points on PICKED_UP
    // - Log partner_point_transactions with reason 'PICKUP_REWARD'
    // Any direct balance/transaction writes here would double-count.

    // 🚀 BROADCAST: Notify customer's UI that pickup is confirmed
    // This triggers the success dialog on customer's device immediately
    try {
      // Calculate saved amount from offer
      const { data: offerData } = await supabaseAdmin
        .from('offers')
        .select('original_price, discounted_price')
        .eq('id', reservation.offer_id)
        .single()
      
      const savedAmount = offerData
        ? (offerData.original_price - offerData.discounted_price)
        : 0
      
      console.log(`💰 Calculated saved amount: ${savedAmount} GEL from offer:`, offerData)

      // Broadcast to customer via realtime channel
      await supabaseAdmin
        .channel(`pickup-${reservation_id}`)
        .send({
          type: 'broadcast',
          event: 'pickup_confirmed',
          payload: { savedAmount }
        })
      
      console.log(`📡 Broadcast sent to channel pickup-${reservation_id}`)
    } catch (broadcastError) {
      // Don't fail the entire operation if broadcast fails
      console.error('⚠️ Failed to send pickup broadcast:', broadcastError)
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reservation marked as picked up',
        reservation: {
          id: reservation_id,
          status: 'PICKED_UP',
          picked_up_at: new Date().toISOString()
        },
        handled_by_triggers: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    // Normalize error for client visibility
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Edge Function Error:', message, error)
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
