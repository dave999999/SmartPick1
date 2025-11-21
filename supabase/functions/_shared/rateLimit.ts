// Shared rate limiting utility for Edge Functions
// Uses Supabase database to track request counts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface RateLimitConfig {
  maxRequests: number;  // Max requests allowed
  windowSeconds: number; // Time window in seconds
}

/**
 * Check if request is within rate limit
 * @param supabase - Supabase client with service role
 * @param identifier - Unique identifier (user ID, IP, etc)
 * @param action - Action name (e.g., 'mark-pickup', 'create-order')
 * @param maxRequests - Maximum requests allowed in window
 * @param windowSeconds - Time window in seconds
 * @returns Rate limit result
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);

    // Check existing rate limit records within the window
    const { data: records, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('action', action)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[rate-limit] Error fetching records:', fetchError);
      // Fail open (allow request) rather than blocking everything
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests,
        resetAt: new Date(now.getTime() + windowSeconds * 1000),
      };
    }

    const requestCount = records?.length || 0;
    const remaining = Math.max(0, maxRequests - requestCount - 1);
    const allowed = requestCount < maxRequests;

    // Get oldest record to calculate reset time
    const oldestRecord = records && records.length > 0 
      ? records[records.length - 1] 
      : null;
    
    const resetAt = oldestRecord
      ? new Date(new Date(oldestRecord.created_at).getTime() + windowSeconds * 1000)
      : new Date(now.getTime() + windowSeconds * 1000);

    if (allowed) {
      // Insert new rate limit record
      await supabase
        .from('rate_limits')
        .insert({
          identifier,
          action,
          created_at: now.toISOString(),
        });
    }

    return {
      allowed,
      limit: maxRequests,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('[rate-limit] Error:', error);
    // Fail open - allow request if rate limit check fails
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    };
  }
}

/**
 * Get identifier for rate limiting
 * Prefers authenticated user ID, falls back to IP address
 */
export function getRateLimitIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Get IP from various headers (Cloudflare, Vercel, etc.)
  const ip = 
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'anonymous';
  
  return `ip:${ip}`;
}

/**
 * Create rate limit error response
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Try again after ${result.resetAt.toISOString()}`,
      limit: result.limit,
      remaining: 0,
      resetAt: result.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': result.resetAt.toISOString(),
      },
    }
  );
}
