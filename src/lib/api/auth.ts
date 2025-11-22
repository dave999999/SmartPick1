import { supabase, isDemoMode } from '../supabase';
import { User } from '../types';
import { setUser as setSentryUser, clearUser as clearSentryUser } from '../sentry';

// Helper: wait briefly for a just-created profile row to appear
// Used only around signup/first-auth flows. Capped to ~1.5s by default.
const waitForUserProfile = async (userId: string, timeoutMs = 1500): Promise<User | null> => {
  const start = Date.now();
  const intervals = [100, 200, 400, 800];
  for (const d of intervals) {
    if (Date.now() - start >= timeoutMs) break;
    await new Promise(r => setTimeout(r, d));
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (data) return data as User;
  }
  return null;
};

/**
 * Authentication Module
 * Handles user authentication, session management, and profile operations
 */

export const getCurrentUser = async (): Promise<{ user: User | null; error?: unknown }> => {
  if (isDemoMode) {
    return { user: null };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) return { user: null, error };
    if (!user) return { user: null };

    // Try to read public profile; if missing, do not block long waits here
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!userData) {
      // Optional short retry only if we recently initiated an auth flow (post-signup/OAuth)
      let shouldShortWait = false;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const tsStr = localStorage.getItem('recentAuthTs');
          if (tsStr) {
            const ts = parseInt(tsStr, 10);
            if (!Number.isNaN(ts) && Date.now() - ts < 30_000) {
              shouldShortWait = true;
            } else {
              localStorage.removeItem('recentAuthTs');
            }
          }
        }
      } catch {}

      if (shouldShortWait) {
        // One-time safety ensure and short, capped wait
        try { await supabase.rpc('ensure_user_profile'); } catch {}
        const ensured = await waitForUserProfile(user.id, 1500);
        if (ensured) {
          try { localStorage.removeItem('recentAuthTs'); } catch {}
          return { user: ensured };
        }
      } else {
        // Fire-and-forget an ensure attempt without blocking
        try { await supabase.rpc('ensure_user_profile'); } catch {}
      }

      // Return fast; caller can retry later
      return { user: null };
    }

    if (userError) return { user: null, error: userError };
    return { user: userData as User };
  } catch (error) {
    return { user: null, error };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  if (isDemoMode) {
    return { 
      data: null, 
      error: new Error('Demo mode: Please configure Supabase to enable authentication') 
    };
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  // Set Sentry user context on successful login
  if (data?.user && !error) {
    setSentryUser(data.user.id, data.user.email, data.user.user_metadata?.name);
  }
  
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string, name: string) => {
  if (isDemoMode) {
    return { 
      data: null, 
      error: new Error('Demo mode: Please configure Supabase to enable authentication') 
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

  try {
    // Mark recent auth flow so getCurrentUser can do a short retry if needed
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('recentAuthTs', String(Date.now()));
    }
    // Attempt to ensure profile immediately and wait briefly for consistency
    const userId = data?.user?.id;
    if (userId) {
      try { await supabase.rpc('ensure_user_profile'); } catch {}
      await waitForUserProfile(userId, 1500);
      
      // Send verification email via Edge Function
      try {
        await supabase.functions.invoke('send-verification-email', {
          body: {
            email,
            name,
            userId,
          },
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }
    }
  } catch {}
  return { data, error };
};

export const signInWithGoogle = async () => {
  if (isDemoMode) {
    return { 
      data: null, 
      error: new Error('Demo mode: Please configure Supabase to enable authentication') 
    };
  }
  
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('recentAuthTs', String(Date.now()));
    }
  } catch {}

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });
  return { data, error };
};

export const signOut = async () => {
  if (isDemoMode) {
    return { error: null };
  }

  const { error } = await supabase.auth.signOut();
  
  // Clear Sentry user context on logout
  if (!error) {
    clearSentryUser();
  }
  
  return { error };
};

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  if (isDemoMode) {
    return { data: null, error: new Error('Demo mode') };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        phone: updates.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { data: null, error };
  }
};

/**
 * Update or set password for current user
 * Works for both OAuth users (sets initial password) and email users (updates password)
 */
export const updatePassword = async (newPassword: string) => {
  if (isDemoMode) {
    return { error: new Error('Demo mode: Password update disabled') };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating password:', error);
    return { error };
  }
};
