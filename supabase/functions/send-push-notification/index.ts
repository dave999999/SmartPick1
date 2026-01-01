// Edge Function: send-push-notification
// Sends push notifications using Firebase Cloud Messaging V1 API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Get Firebase access token using service account
async function getFirebaseAccessToken(): Promise<string> {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID')!
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')!
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')!.replace(/\\n/g, '\n')

  // Create JWT
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  }

  // Encode JWT (using jose library for Deno)
  const jose = await import('https://deno.land/x/jose@v4.14.4/index.ts')
  const privateKeyObj = await jose.importPKCS8(privateKey, 'RS256')
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader(header)
    .sign(privateKeyObj)

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })

  const data = await response.json()
  return data.access_token
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Web Push VAPID keys
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@smartpick.ge'

    // Parse request body
    const payload: PushNotificationPayload = await req.json()

    const { userId, title, body, data = {} }: PushNotificationPayload = await req.json()

    if (!userId || !title || !body) {
      throw new Error('Missing required fields: userId, title, body')
    }

    // Get user's FCM token
    const { data: subscription, error: subError } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', userId)
      .maybeSingle()

    if (subError) throw subError
    
    if (!subscription?.fcm_token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No FCM token found for user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get Firebase access token
    const accessToken = await getFirebaseAccessToken()
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID')!

    // Send FCM message using V1 API
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
    const fcmResponse = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        message: {
          token: subscription.fcm_token,
          notification: {
            title,
            body
          },
          data,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              click_action: 'FLUTTER_NOTIFICATION_CLICK'
            }
          }
        }
      }|| error.statusCode === 404) {
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
