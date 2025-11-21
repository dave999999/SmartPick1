import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req)
  }

  const corsHeaders = getCorsHeaders(req)

  try {
    // Create admin client with service_role key and connection pooling
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

    console.log('🔄 Running auto-expire failed pickups...')

    // Call the auto-expire function
    const { data, error } = await supabaseAdmin.rpc('auto_expire_failed_pickups')

    if (error) {
      console.error('❌ Error running auto-expire:', error)
      throw error
    }

    const results = data || []
    console.log(`✅ Processed ${results.length} expired reservations`)

    // Log each result
    results.forEach((result: any) => {
      console.log(`  - Reservation ${result.reservation_id}: ${result.message}`)
      if (result.ban_applied) {
        console.log(`    ⛔ User ${result.user_email} permanently banned`)
      } else if (result.penalty_applied) {
        console.log(`    ⚠️  User ${result.user_email} received penalty`)
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Edge Function Error:', message, error)
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
