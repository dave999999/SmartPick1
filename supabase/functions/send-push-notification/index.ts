// Edge Function: send-push-notification
// Sends Web Push notifications for location-based, favorite partner, and expiring offers

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

interface PushNotificationPayload {
  type: 'nearby' | 'favorite_partner' | 'expiring';
  offer_id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  user_ids?: string[]; // Optional: target specific users
  location?: { lat: number; lng: number; radius_km: number }; // For nearby notifications
  partner_id?: string; // For favorite partner notifications
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req)
  }

  const secureHeaders = getCorsHeaders(req)

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      db: { schema: 'public' },
      global: {
        headers: { 'x-connection-pool': 'transaction' }
      }
    })

    // Get Web Push VAPID keys
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@smartpick.ge'

    // Parse request body
    const payload: PushNotificationPayload = await req.json()

    // Get target users based on notification type
    let targetUserIds: string[] = payload.user_ids || []

    if (!targetUserIds.length) {
      // Determine target users based on notification type
      if (payload.type === 'nearby' && payload.location) {
        // Find users within radius (requires location data in customers table)
        // For now, get all users with nearby notifications enabled
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('user_id, subscription')
          .eq('notification_types->nearby', true)

        targetUserIds = subscriptions?.map(s => s.user_id) || []
      } else if (payload.type === 'favorite_partner' && payload.partner_id) {
        // Find users who favorited this partner
        const { data: favorites } = await supabase
          .from('customer_favorites')
          .select('customer_id')
          .eq('partner_id', payload.partner_id)

        const favoritedUserIds = favorites?.map(f => f.customer_id) || []

        // Filter to users with favorite_partner notifications enabled
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('user_id, subscription')
          .eq('notification_types->favorite_partner', true)
          .in('user_id', favoritedUserIds)

        targetUserIds = subscriptions?.map(s => s.user_id) || []
      } else if (payload.type === 'expiring') {
        // Send to all users with expiring notifications enabled
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('user_id, subscription')
          .eq('notification_types->expiring', true)

        targetUserIds = subscriptions?.map(s => s.user_id) || []
      }
    }

    // Get push subscriptions for target users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription')
      .in('user_id', targetUserIds)

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`)
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Prepare notification
    const notification = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      tag: `${payload.type}-${payload.offer_id}`,
      data: {
        url: `/offer/${payload.offer_id}`,
        type: payload.type,
        offer_id: payload.offer_id,
        ...payload.data
      },
      actions: [
        {
          action: 'view',
          title: 'View Offer'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ]
    }

    // Send push notifications using web-push
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscription = JSON.parse(sub.subscription)
          
          // Use web-push library (via npm:web-push in Deno)
          const webpush = await import('npm:web-push@3.6.6')
          
          webpush.setVapidDetails(
            vapidSubject,
            vapidPublicKey,
            vapidPrivateKey
          )

          await webpush.sendNotification(
            subscription,
            JSON.stringify(notification)
          )

          return { user_id: sub.user_id, success: true }
        } catch (error) {
          console.error(`Failed to send notification to user ${sub.user_id}:`, error)
          
          // If subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', sub.user_id)
          }
          
          return { user_id: sub.user_id, success: false, error: error.message }
        }
      })
    )

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failureCount = results.length - successCount

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        total: results.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
