import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { lat, lon } = req.query as { lat?: string; lon?: string };
    if (!lat || !lon) return res.status(400).json({ error: 'Missing lat or lon' });

    const url = `https://geocode.maps.co/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json`;
    const upstream = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream error', statusText: upstream.statusText });
    }
    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch geocode', message: e?.message || 'Unknown error' });
  }
}

