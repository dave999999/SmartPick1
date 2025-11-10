// ================================================
// SERVER-SIDE RATE LIMITING EDGE FUNCTION
// Uses Supabase database as rate limit store (no Redis needed)
// ================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, cf-connecting-ip',
}

interface RateLimitConfig {
  maxAttempts: number;
  windowSeconds: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'login': { maxAttempts: 5, windowSeconds: 900 },        // 5 per 15 min
  'signup': { maxAttempts: 3, windowSeconds: 3600 },      // 3 per hour
  'reservation': { maxAttempts: 10, windowSeconds: 3600 }, // 10 per hour
  'offer_create': { maxAttempts: 20, windowSeconds: 3600 } // 20 per hour
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service_role
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

    const { action, identifier } = await req.json()

    if (!action || !identifier) {
      return new Response(
        JSON.stringify({ error: 'action and identifier are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const config = RATE_LIMITS[action]
    if (!config) {
      return new Response(
        JSON.stringify({ error: 'Invalid action type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get client IP for additional tracking
    const clientIp = req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-forwarded-for') || 
                     'unknown'

    const key = `${action}:${identifier}:${clientIp}`
    const now = new Date()
    const windowStart = new Date(now.getTime() - (config.windowSeconds * 1000))

    // Check existing rate limit records
    const { data: existingRecords, error: fetchError } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('key', key)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching rate limits:', fetchError)
      // Fail open (allow) on database errors to prevent service disruption
      return new Response(
        JSON.stringify({ 
          allowed: true, 
          remaining: config.maxAttempts,
          message: 'Rate limit check unavailable'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const attemptCount = existingRecords?.length || 0
    const remaining = Math.max(0, config.maxAttempts - attemptCount)

    // Calculate reset time
    const oldestRecord = existingRecords?.[existingRecords.length - 1]
    const resetAt = oldestRecord 
      ? new Date(new Date(oldestRecord.created_at).getTime() + (config.windowSeconds * 1000))
      : now

    if (attemptCount >= config.maxAttempts) {
      const minutesUntilReset = Math.ceil((resetAt.getTime() - now.getTime()) / 60000)
      
      return new Response(
        JSON.stringify({
          allowed: false,
          remaining: 0,
          resetAt: resetAt.toISOString(),
          message: `Too many ${action} attempts. Please try again in ${minutesUntilReset} minute${minutesUntilReset > 1 ? 's' : ''}.`
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Record this check attempt
    const { error: insertError } = await supabaseAdmin
      .from('rate_limits')
      .insert({
        key,
        action,
        identifier,
        ip_address: clientIp,
        created_at: now.toISOString()
      })

    if (insertError) {
      console.error('Error inserting rate limit:', insertError)
      // Continue even if insert fails (fail open)
    }

    // Clean up old records (keep last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
    await supabaseAdmin
      .from('rate_limits')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())

    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: remaining - 1,
        resetAt: resetAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Rate limit error:', error)
    
    // Fail open (allow) to prevent blocking legitimate users on errors
    return new Response(
      JSON.stringify({ 
        allowed: true,
        remaining: 99,
        message: 'Rate limit service unavailable'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
