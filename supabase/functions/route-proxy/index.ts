import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const from = body?.from
    const to = body?.to
    const profile = body?.profile || 'driving'

    if (!from || !to || typeof from.lat !== 'number' || typeof from.lng !== 'number' || typeof to.lat !== 'number' || typeof to.lng !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid coordinates' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const url = `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    const osrmRes = await fetch(url)
    if (!osrmRes.ok) {
      const text = await osrmRes.text()
      return new Response(JSON.stringify({ error: 'OSRM request failed', details: text }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const data = await osrmRes.json()
    const route = data?.routes?.[0]
    if (!route) {
      return new Response(JSON.stringify({ error: 'No route found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const coordinates = route.geometry.coordinates // [lng, lat][]
    const distance = route.distance
    const duration = route.duration

    return new Response(
      JSON.stringify({ coordinates, distance, duration }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error', message: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
