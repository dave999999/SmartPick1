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

    // Also create client with user's token to verify permissions
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
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
      throw new Error(`Failed to update reservation: ${updateError.message}`)
    }

    // Award points to customer (5 points for completing pickup)
    const pointsToAward = reservation.points_spent || 5
    
    const { error: customerPointsError } = await supabaseAdmin.rpc('add_user_points', {
      p_user_id: reservation.customer_id,
      p_amount: pointsToAward,
      p_reason: 'PICKUP_COMPLETE',
      p_metadata: {
        reservation_id: reservation_id,
        partner_id: partner.id,
        offer_id: reservation.offer_id
      }
    })

    if (customerPointsError) {
      console.error('Failed to award customer points:', customerPointsError)
      // Don't throw - pickup succeeded even if points failed
    }

    // Award points to partner (5 points for successful pickup)
    const { error: partnerPointsError } = await supabaseAdmin.rpc('add_partner_points', {
      p_partner_user_id: user.id,
      p_amount: pointsToAward,
      p_reason: 'PICKUP_REWARD',
      p_metadata: {
        reservation_id: reservation_id,
        customer_id: reservation.customer_id,
        offer_id: reservation.offer_id
      }
    })

    if (partnerPointsError) {
      console.error('Failed to award partner points:', partnerPointsError)
      // Don't throw - pickup succeeded even if points failed
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
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
