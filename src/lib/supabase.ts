import { createClient } from '@supabase/supabase-js';

// ✅ Live Supabase configuration
const supabaseUrl = 'https://***REMOVED_PROJECT_ID***.supabase.co';
const supabaseAnonKey =
  '***REMOVED_ANON_KEY_2***';

// 🔒 If these are missing, fallback to demo mode
const DEMO_MODE = !supabaseUrl || !supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});

export const isDemoMode = DEMO_MODE;

// Auth helpers
export const signInWithEmail = async (email: string, password: string) => {
  if (DEMO_MODE) {
    return {
      data: null,
      error: new Error(
        'Demo mode: Supabase not configured. Please check your environment variables.'
      ),
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string
) => {
  if (DEMO_MODE) {
    return {
      data: null,
      error: new Error(
        'Demo mode: Supabase not configured. Please check your environment variables.'
      ),
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });
  return { data, error };
};

export const signInWithGoogle = async () => {
  if (DEMO_MODE) {
    return {
      data: null,
      error: new Error(
        'Demo mode: Supabase not configured. Please check your environment variables.'
      ),
    };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });
  return { data, error };
};

export const signOut = async () => {
  if (DEMO_MODE) return { error: null };
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  if (DEMO_MODE) {
    return { user: null, error: null };
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};
