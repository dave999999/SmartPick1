// ================================================
// CSRF TOKEN GENERATION AND VALIDATION
// Protects sensitive operations from cross-site request forgery
// ================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { checkRateLimit, getRateLimitIdentifier, rateLimitResponse } from '../_shared/rateLimit.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req)
  }

  const secureHeaders = getCorsHeaders(req)

  try {
    // Create Supabase client with connection pooling
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

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...secureHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting: 60 CSRF tokens per minute per user (generous for legitimate use)
    const identifier = getRateLimitIdentifier(req, user.id);
    const rateLimit = await checkRateLimit(supabaseAdmin, identifier, 'csrf-token', 60, 60);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const url = new URL(req.url)

    // GENERATE TOKEN
    if (req.method === 'POST' && url.pathname.endsWith('/generate')) {
      // Generate secure random token
      const tokenBytes = new Uint8Array(32)
      crypto.getRandomValues(tokenBytes)
      const csrfToken = Array.from(tokenBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const expiresAt = new Date(Date.now() + 3600000) // 1 hour expiry

      // Store token in database
      const { error: insertError } = await supabaseAdmin
        .from('csrf_tokens')
        .insert({
          user_id: user.id,
          token: csrfToken,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error storing CSRF token:', insertError)
        throw new Error('Failed to generate CSRF token')
      }

      // Clean up expired tokens for this user
      await supabaseAdmin
        .from('csrf_tokens')
        .delete()
        .eq('user_id', user.id)
        .lt('expires_at', new Date().toISOString())

      return new Response(
        JSON.stringify({ 
          csrfToken,
          expiresAt: expiresAt.toISOString()
        }),
        { 
          status: 200, 
          headers: { 
            ...secureHeaders, 
            'Content-Type': 'application/json'
          } 
        }
      )
    }

    // VALIDATE TOKEN
    if (req.method === 'POST' && url.pathname.endsWith('/validate')) {
      const { csrfToken } = await req.json()

      if (!csrfToken) {
        return new Response(
          JSON.stringify({ valid: false, error: 'No CSRF token provided' }),
          { status: 400, headers: { ...secureHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check token exists and is valid
      const { data: tokenRecord, error: fetchError } = await supabaseAdmin
        .from('csrf_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('token', csrfToken)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (fetchError || !tokenRecord) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Invalid or expired CSRF token' 
          }),
          { status: 403, headers: { ...secureHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Token is valid - optionally mark as used (one-time tokens)
      // For now, we'll let them be reused within the 1-hour window
      
      return new Response(
        JSON.stringify({ valid: true }),
        { status: 200, headers: { ...secureHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      { status: 404, headers: { ...secureHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('CSRF token error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...secureHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
