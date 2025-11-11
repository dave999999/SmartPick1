/**
 * Server-Side Rate Limiter Client
 * 
 * Calls Supabase Edge Function for server-side rate limiting.
 * Replaces client-side localStorage checks with secure server validation.
 */

import { supabase } from './supabase';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: string;
  message?: string;
}

/**
 * Check rate limit via server-side Edge Function
 * @param action - Type of action (login, signup, reservation, offer_create, offer_delete, partner_application, admin_action)
 * @param identifier - User identifier (email, userId, etc.)
 * @returns Rate limit result
 */
export async function checkServerRateLimit(
  action: 'login' | 'signup' | 'reservation' | 'offer_create' | 'offer_delete' | 'partner_application' | 'admin_action',
  identifier: string
): Promise<RateLimitResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rate-limit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action, identifier })
      }
    );

    if (response.status === 429) {
      const data = await response.json();
      return {
        allowed: false,
        remaining: 0,
        resetAt: data.resetAt,
        message: data.message
      };
    }

    if (!response.ok) {
      console.error('Rate limit check failed:', response.status, response.statusText);
      // Fail open (allow) on errors to prevent service disruption
      // This includes 400, 404, 500, etc.
      return { allowed: true, remaining: 99 };
    }

    const data = await response.json();
    return {
      allowed: data.allowed !== false,
      remaining: data.remaining || 0,
      resetAt: data.resetAt,
      message: data.message
    };

  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open (allow) on network errors
    return { allowed: true, remaining: 99 };
  }
}

/**
 * Combined rate limit check: client-side first, then server-side
 * This provides fast feedback while maintaining server-side security
 */
export async function checkRateLimitHybrid(
  action: 'login' | 'signup' | 'reservation' | 'offer_create',
  identifier: string
): Promise<RateLimitResult> {
  // Client-side check first (fast feedback)
  const clientCheck = await checkClientRateLimit(action, identifier);
  if (!clientCheck.allowed) {
    return clientCheck;
  }

  // Server-side check (authoritative)
  return await checkServerRateLimit(action, identifier);
}

/**
 * Client-side rate limit check (fast, but not secure)
 * Used only for UX feedback, not security
 */
async function checkClientRateLimit(
  action: string,
  identifier: string
): Promise<RateLimitResult> {
  const LIMITS = {
    login: { max: 5, windowMs: 15 * 60 * 1000 },
    signup: { max: 3, windowMs: 60 * 60 * 1000 },
    reservation: { max: 10, windowMs: 60 * 60 * 1000 },
    offer_create: { max: 20, windowMs: 60 * 60 * 1000 }
  };

  const config = LIMITS[action as keyof typeof LIMITS];
  if (!config) {
    return { allowed: true, remaining: 99 };
  }

  try {
    const key = `rate_limit_${action}_${identifier}`;
    const stored = localStorage.getItem(key);
    const now = Date.now();

    if (!stored) {
      return { allowed: true, remaining: config.max - 1 };
    }

    const attempts: number[] = JSON.parse(stored);
    const recentAttempts = attempts.filter(t => now - t < config.windowMs);
    const remaining = Math.max(0, config.max - recentAttempts.length);

    if (recentAttempts.length >= config.max) {
      const resetAt = new Date(recentAttempts[0] + config.windowMs);
      const minutesUntilReset = Math.ceil((resetAt.getTime() - now) / 60000);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: resetAt.toISOString(),
        message: `Too many ${action} attempts. Please try again in ${minutesUntilReset} minute${minutesUntilReset > 1 ? 's' : ''}.`
      };
    }

    return { allowed: true, remaining };

  } catch (error) {
    console.error('Client rate limit error:', error);
    return { allowed: true, remaining: 99 };
  }
}

/**
 * Record attempt in client-side storage (for UX only)
 */
export function recordClientAttempt(action: string, identifier: string): void {
  try {
    const key = `rate_limit_${action}_${identifier}`;
    const stored = localStorage.getItem(key);
    const now = Date.now();

    const attempts: number[] = stored ? JSON.parse(stored) : [];
    attempts.push(now);

    localStorage.setItem(key, JSON.stringify(attempts));
  } catch (error) {
    console.error('Failed to record attempt:', error);
  }
}

// Backwards compatibility: export old function name
export const checkRateLimit = checkRateLimitHybrid;
