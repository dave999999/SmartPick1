// Supabase Edge Function to handle reservation pickup with points
// This runs with service_role permissions, allowing it to modify points

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client with service_role (full permissions)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get current user using admin client with the JWT token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      console.error('Auth error:', userError)
      throw new Error('Unauthorized')
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

    // Get reservation details
    const { data: reservation, error: reservationError } = await supabaseAdmin
      .from('reservations')
      .select(`
        *,
        offer:offers(
          partner_id,
          title
        ),
        customer:users!reservations_customer_id_fkey(
          id,
          name
        )
      `)
      .eq('id', reservation_id)
      .single()

    if (reservationError || !reservation) {
      throw new Error('Reservation not found')
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

    // Verify status is ACTIVE
    if (reservation.status !== 'ACTIVE') {
      throw new Error(`Reservation status is ${reservation.status}, must be ACTIVE`)
    }

    // Update reservation to PICKED_UP
    const { error: updateError } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'PICKED_UP',
        picked_up_at: new Date().toISOString()
      })
      .eq('id', reservation_id)

    if (updateError) {
      console.error('Update reservation error:', updateError)
      throw new Error(`Failed to update reservation: ${updateError.message}`)
    }

    console.log('✅ Reservation updated to PICKED_UP successfully')

    // Award points to customer (5 points for completing pickup)
    const pointsToAward = reservation.points_spent || 5
    
    // Award customer points - update user_points table directly
    try {
      const { data: currentPoints } = await supabaseAdmin
        .from('user_points')
        .select('balance')
        .eq('user_id', reservation.customer_id)
        .single()
      
      const oldBalance = currentPoints?.balance || 0
      const newBalance = oldBalance + pointsToAward

      await supabaseAdmin
        .from('user_points')
        .upsert({
          user_id: reservation.customer_id,
          balance: newBalance
        })

      await supabaseAdmin
        .from('point_transactions')
        .insert({
          user_id: reservation.customer_id,
          change: pointsToAward,
          reason: 'PICKUP_COMPLETE',
          balance_before: oldBalance,
          balance_after: newBalance,
          metadata: {
            reservation_id: reservation_id,
            partner_id: partner.id,
            offer_id: reservation.offer_id
          }
        })

      // Note: user_stats is updated automatically by the database trigger
      // The trigger 'update_user_stats_on_pickup' handles:
      // - total_reservations increment
      // - total_money_saved calculation
      // - streak calculation (via update_user_streak_on_date)
      // - achievement checking (via check_user_achievements)
    } catch (err) {
      console.error('Failed to award customer points:', err)
    }

    // Award points to partner (5 points for successful pickup)
    try {
      const { data: currentPartnerPoints } = await supabaseAdmin
        .from('partner_points')
        .select('balance')
        .eq('partner_id', partner.id)
        .single()
      
      const oldBalance = currentPartnerPoints?.balance || 0
      const newBalance = oldBalance + pointsToAward

      await supabaseAdmin
        .from('partner_points')
        .upsert({
          partner_id: partner.id,
          balance: newBalance
        })

      await supabaseAdmin
        .from('partner_point_transactions')
        .insert({
          partner_id: partner.id,
          change: pointsToAward,
          reason: 'PICKUP_REWARD',
          balance_before: oldBalance,
          balance_after: newBalance,
          metadata: {
            reservation_id: reservation_id,
            customer_id: reservation.customer_id,
            offer_id: reservation.offer_id
          }
        })
    } catch (err) {
      console.error('Failed to award partner points:', err)
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
        points_awarded: {
          customer: pointsToAward,
          partner: pointsToAward
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Edge Function Error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
