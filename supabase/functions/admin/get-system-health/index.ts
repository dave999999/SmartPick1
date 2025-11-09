// Minimal admin health Edge Function (skeleton)
// Validates JWT and returns simple health signals. Expand as needed.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  try {
    const auth = req.headers.get('authorization') || ''
    if (!auth.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Basic response; real checks can include simple DB pings via PostgREST or service key
    const started = Date.now()
    // Placeholder latency (client-side time)
    const latencyMs = Date.now() - started

    return new Response(
      JSON.stringify({
        ok: true,
        latency_ms: latencyMs,
        cron: { status: 'unknown' },
        bot: { telegram: 'unknown' },
        timestamp: new Date().toISOString(),
      }),
      { headers: { 'content-type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 })
  }
})

