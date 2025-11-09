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

      // Update user_stats for gamification tracking
      const savings = reservation.original_price - reservation.total_price
      const { data: currentStats } = await supabaseAdmin
        .from('user_stats')
        .select('*')
        .eq('user_id', reservation.customer_id)
        .single()

      if (currentStats) {
        // Calculate streak
        const today = new Date().toISOString().split('T')[0]
        const lastPickup = currentStats.last_reservation_date
        let newStreak = currentStats.current_streak_days || 0
        let newLongestStreak = currentStats.longest_streak_days || 0

        if (lastPickup) {
          const lastDate = new Date(lastPickup)
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toISOString().split('T')[0]

          if (lastPickup === yesterdayStr) {
            // Consecutive day - increment streak
            newStreak += 1
          } else if (lastPickup !== today) {
            // Streak broken - reset to 1
            newStreak = 1
          }
          // If lastPickup === today, don't change streak (same day)
        } else {
          // First pickup ever
          newStreak = 1
        }

        if (newStreak > newLongestStreak) {
          newLongestStreak = newStreak
        }

        await supabaseAdmin
          .from('user_stats')
          .update({
            total_reservations: (currentStats.total_reservations || 0) + 1,
            total_money_saved: (currentStats.total_money_saved || 0) + savings,
            points_earned: (currentStats.points_earned || 0) + pointsToAward,
            current_streak_days: newStreak,
            longest_streak_days: newLongestStreak,
            last_reservation_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', reservation.customer_id)
      }
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
    console.error('Edge Function Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
