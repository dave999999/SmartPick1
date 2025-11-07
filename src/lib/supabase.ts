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

// Optional wrapper to instrument and/or block users.upsert calls which can trigger 409 conflicts.
// - VITE_DEBUG_USER_UPSERT=true -> logs stack traces when users.upsert is invoked
// - VITE_BLOCK_USER_UPSERT=true -> short-circuits users.upsert to a no-op (no network call)
(() => {
  const debug = (import.meta as any).env?.VITE_DEBUG_USER_UPSERT === 'true';
  const block = (import.meta as any).env?.VITE_BLOCK_USER_UPSERT === 'true';
  if (!debug && !block) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalFrom: any = (supabase as any).from.bind(supabase);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).from = (table: string) => {
    const query: any = originalFrom(table);

    if (table === 'users' && query.upsert) {
      const originalUpsert = query.upsert.bind(query);

      query.upsert = (...args: any[]) => {
        if (debug) {
          const stack = new Error().stack?.split('\n').slice(2, 8).join('\n');
          console.warn('[DEBUG] Detected users.upsert invocation. Args:', args, '\nStack:', stack);
        }

        if (block) {
          // Mimic a successful response without performing the request
          return Promise.resolve({ data: null, error: null, status: 200, statusText: 'blocked' });
        }

        return originalUpsert(...args);
      };
    }
    return query;
  };

  if (debug) console.info('[DEBUG] users.upsert instrumentation enabled');
  if (block) console.info('[DEBUG] users.upsert is currently blocked (no-op)');
})();

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
