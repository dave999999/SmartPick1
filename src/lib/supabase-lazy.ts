// Lazy loader for Supabase client to defer heavy vendor bundle until needed.
// Provides getSupabase() returning a cached instance.
// Does not alter existing supabase.ts implementation for compatibility.

import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;
let loading: Promise<SupabaseClient> | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  if (cached) return cached;
  if (loading) return loading;
  loading = import('./supabase').then(mod => {
    cached = mod.supabase;
    return cached!;
  });
  return loading;
}
