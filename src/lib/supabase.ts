import { createClient } from '@supabase/supabase-js';

// Read Supabase configuration from Vite env variables
// Set these in Vercel project settings as Environment Variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

// If missing, run in demo mode (no network calls)
const DEMO_MODE = !supabaseUrl || !supabaseAnonKey;

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
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
      Accept: 'application/json',
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
        'Demo mode: Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
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
        'Demo mode: Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
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
        'Demo mode: Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
};

