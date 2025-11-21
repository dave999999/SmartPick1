import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'public' },
  global: {
    headers: { 'x-connection-pool': 'transaction' }
  }
})

async function sendTelegramMessage(chatId: string, subject: string, message: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🔔 <b>${subject}</b>\n\n${message}`,
        parse_mode: 'HTML'
      })
    })
    return await response.json()
  } catch (error) {
    console.error('Telegram error:', error)
    return { ok: false, error }
  }
}

async function sendEmail(email: string, subject: string, message: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'SmartPick <noreply@smartpick.ge>',
        to: email,
        subject: `📢 ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">📢 ${subject}</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
              <p>SmartPick - Your Restaurant Deals Platform</p>
            </div>
          </div>
        `
      })
    })
    return await response.json()
  } catch (error) {
    console.error('Email error:', error)
    return { error }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req)
  }

  const corsHeaders = getCorsHeaders(req)

  try {
    const { announcementId } = await req.json()

    if (!announcementId) {
      return new Response(JSON.stringify({ error: 'Missing announcement ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get announcement details
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .single()

    if (announcementError || !announcement) {
      return new Response(JSON.stringify({ error: 'Announcement not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { subject, message, target_audience } = announcement
    let targetUsers: any[] = []

    // Get target users/partners based on audience
    if (target_audience === 'all_users') {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'USER')
      targetUsers = data || []
    } else if (target_audience === 'all_partners') {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'PARTNER')
      targetUsers = data || []
    } else if (target_audience === 'everyone') {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name')
      targetUsers = data || []
    }

    let emailsSent = 0
    let telegramsSent = 0

    // Send to each user
    for (const user of targetUsers) {
      // Send email
      if (user.email) {
        const emailResult = await sendEmail(user.email, subject, message)
        if (!emailResult.error) emailsSent++
      }

      // Get Telegram chat ID
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('telegram_chat_id, enable_telegram')
        .eq('user_id', user.id)
        .single()

      if (prefs?.enable_telegram && prefs?.telegram_chat_id) {
        const telegramResult = await sendTelegramMessage(prefs.telegram_chat_id, subject, message)
        if (telegramResult.ok) telegramsSent++
      }
    }

    return new Response(JSON.stringify({
      success: true,
      stats: {
        total_targets: targetUsers.length,
        emails_sent: emailsSent,
        telegrams_sent: telegramsSent
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
