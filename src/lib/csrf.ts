import { logger } from '@/lib/logger';
/**
 * CSRF Protection Client
 * 
 * Generates and validates CSRF tokens via Supabase Edge Function.
 * Protects sensitive operations from cross-site request forgery.
 */

import { useState, useEffect } from 'react';
import { supabase } from './supabase';

interface CSRFToken {
  token: string;
  expiresAt: string;
}

// In-memory cache for current CSRF token
let cachedToken: CSRFToken | null = null;

/**
 * Get or generate a CSRF token
 * Caches token to avoid repeated calls
 */
export async function getCSRFToken(): Promise<string | null> {
  try {
    // Return cached token if still valid
    if (cachedToken && new Date(cachedToken.expiresAt) > new Date()) {
      return cachedToken.token;
    }

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      logger.warn('No session found, cannot generate CSRF token');
      return null;
    }

    // Generate new token via Edge Function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/csrf-token/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        }
      }
    );

    if (!response.ok) {
      logger.error('Failed to generate CSRF token:', response.status);
      return null;
    }

    const data = await response.json();
    
    cachedToken = {
      token: data.csrfToken,
      expiresAt: data.expiresAt
    };

    return data.csrfToken;

  } catch (error) {
    logger.error('CSRF token generation error:', error);
    return null;
  }
}

/**
 * Validate a CSRF token (server-side check)
 */
export async function validateCSRFToken(token: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return false;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/csrf-token/validate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ csrfToken: token })
      }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.valid === true;

  } catch (error) {
    logger.error('CSRF token validation error:', error);
    return false;
  }
}

/**
 * Clear cached CSRF token (e.g., after logout)
 */
export function clearCSRFToken(): void {
  cachedToken = null;
}

/**
 * Middleware: Add CSRF token to request headers
 * Use this for sensitive operations (reservations, offers, admin actions)
 */
export async function withCSRFToken(
  fetchOptions: RequestInit = {}
): Promise<RequestInit> {
  const token = await getCSRFToken();
  
  if (!token) {
    // No token available - let the request proceed without it
    // Server will reject if CSRF is required
    return fetchOptions;
  }

  return {
    ...fetchOptions,
    headers: {
      ...fetchOptions.headers,
      'X-CSRF-Token': token
    }
  };
}

/**
 * Hook for React components: Get CSRF token on mount
 */
export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchToken() {
      const csrfToken = await getCSRFToken();
      if (mounted) {
        setToken(csrfToken);
        setLoading(false);
      }
    }

    fetchToken();

    return () => {
      mounted = false;
    };
  }, []);

  return { token, loading };
}

// Listen for auth state changes and refresh token
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    clearCSRFToken();
  } else if (event === 'SIGNED_IN') {
    // Pre-fetch token for better UX
    getCSRFToken().catch((err) => logger.error('[CSRF] Failed to prefetch token:', err));
  }
});
