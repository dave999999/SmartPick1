import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface NotificationRequest {
  userId: string
  message: string
  type: 'partner' | 'customer'
}

async function sendTelegramMessage(chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  })

  const data = await response.json()
  return data
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { userId, message, type }: NotificationRequest = await req.json()

    if (!userId || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get user's Telegram connection from database
    const { data: connection, error: connectionError } = await supabase
      .from('notification_preferences')
      .select('telegram_chat_id, enable_telegram')
      .eq('user_id', userId)
      .single()

    if (connectionError || !connection) {
      console.log(`No Telegram connection found for user ${userId}`)
      return new Response(JSON.stringify({
        success: false,
        message: 'User has not connected Telegram'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!connection.enable_telegram || !connection.telegram_chat_id) {
      console.log(`Telegram notifications disabled for user ${userId}`)
      return new Response(JSON.stringify({
        success: false,
        message: 'Telegram notifications disabled'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Send the message
    const result = await sendTelegramMessage(connection.telegram_chat_id, message)

    if (!result.ok) {
      console.error('Telegram API error:', result)
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to send message',
        details: result
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Notification sent successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error processing notification:', error)
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
