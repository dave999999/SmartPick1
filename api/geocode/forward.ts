import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'Missing address parameter' });
  }

  try {
    // Call Nominatim API for forward geocoding (address -> coordinates)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address as string)}&format=json&limit=1&countrycodes=ge`,
      {
        headers: {
          'User-Agent': 'SmartPick-Admin/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    return res.status(200).json(data[0]);
  } catch (error: any) {
    console.error('Forward geocoding error:', error);
    return res.status(500).json({ error: error?.message || 'Geocoding failed' });
  }
}
