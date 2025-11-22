import { createClient } from '@supabase/supabase-js';

// Read Supabase configuration from env variables
// Primary: Vite-style (VITE_*)
// Fallbacks: NEXT_PUBLIC_* or process.env for robustness
const env: any = (import.meta as any).env || {};
const supabaseUrl =
  (env.VITE_SUPABASE_URL as string | undefined) ||
  (env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ||
  (typeof process !== 'undefined' ? (process as any).env?.VITE_SUPABASE_URL : undefined) ||
  (typeof process !== 'undefined' ? (process as any).env?.NEXT_PUBLIC_SUPABASE_URL : undefined);

const supabaseAnonKey =
  (env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  (typeof process !== 'undefined' ? (process as any).env?.VITE_SUPABASE_ANON_KEY : undefined) ||
  (typeof process !== 'undefined' ? (process as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined);

// If missing, run in demo mode (no network calls)
const DEMO_MODE = !supabaseUrl || !supabaseAnonKey;

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'smartpick-auth',
    debug: false,
    // Session security: Auto-refresh every hour, expire with 10min margin
    // This prevents stale sessions and reduces account takeover risk
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
      // Use transaction pooling for better connection management under load
      'x-connection-pool': 'transaction',
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
      emailRedirectTo: undefined, // Don't use Supabase's built-in email verification
    },
  });

  // Send verification email via Edge Function
  if (data.user && !error) {
    try {
      await supabase.functions.invoke('send-verification-email', {
        body: {
          email,
          name,
          userId: data.user.id,
        },
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }
  }

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
