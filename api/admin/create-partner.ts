import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server not configured with service role env vars' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const {
      email,
      password,
      name,
      phone,
      business_name,
      business_type,
      description,
      address,
      city,
      latitude,
      longitude,
      open_24h,
      open_time,
      close_time,
    } = req.body || {};

    if (!email || !business_name || !business_type || !address || !city) {
      return res.status(400).json({ error: 'Missing required fields (email, business_name, business_type, address, city)' });
    }

    // Create or get Auth user first
    let userId: string | null = null;
    // Try to find existing auth user by email
    // Supabase Admin API doesn’t have direct lookup by email (as of now). We'll try create and catch duplicate.
    const createResp = await admin.auth.admin.createUser({
      email,
      password: password || undefined,
      email_confirm: true,
      user_metadata: { name, phone },
    });

    if (createResp.error) {
      // If user exists, try to get their id via users table (public mirror) or return friendly error
      // Fallback: fetch from public.users by email to get id
      const { data: existing } = await admin.from('users').select('id').eq('email', email).maybeSingle();
      if (!existing) throw createResp.error;
      userId = existing.id as string;
    } else {
      userId = createResp.data.user?.id || null;
    }

    if (!userId) return res.status(500).json({ error: 'Failed to resolve user id' });

    // Ensure public.users row matches Auth user id
    await admin.from('users').upsert({
      id: userId,
      email,
      name: name || business_name,
      phone: phone || null,
      role: 'PARTNER',
      status: 'ACTIVE',
    });

    // Insert partner profile
    const { error: partnerErr } = await admin.from('partners').insert({
      user_id: userId,
      business_name,
      business_type,
      phone: phone || null,
      email,
      address,
      city,
      status: 'APPROVED',
      description: description || null,
      latitude,
      longitude,
      open_24h: !!open_24h,
      business_hours: open_24h ? null : { open: open_time, close: close_time },
    });
    if (partnerErr) throw partnerErr;

    return res.status(200).json({ success: true, user_id: userId });
  } catch (e: any) {
    console.error('create-partner error', e);
    return res.status(500).json({ error: e?.message || 'Unknown error' });
  }
}

