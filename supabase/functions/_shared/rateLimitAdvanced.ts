// Enhanced Rate Limiting with IP tracking, geo-blocking, and suspicious activity detection
// Professional production-grade implementation

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  blocked?: boolean;
  blockReason?: string;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  trackIP?: boolean;
  trackUserAgent?: boolean;
  blockOnExceed?: boolean;
}

interface RequestMetadata {
  ip: string;
  userAgent?: string;
  countryCode?: string;
}

/**
 * Enhanced rate limiting with IP tracking and blocking
 * @param supabase - Supabase client with service role
 * @param identifier - Unique identifier (user ID, IP, etc)
 * @param action - Action name (e.g., 'mark-pickup', 'create-order')
 * @param maxRequests - Maximum requests allowed in window
 * @param windowSeconds - Time window in seconds
 * @param metadata - Request metadata (IP, user agent, country)
 * @returns Rate limit result with blocking status
 */
export async function checkRateLimitAdvanced(
  supabase: SupabaseClient,
  identifier: string,
  action: string,
  maxRequests: number,
  windowSeconds: number,
  metadata?: RequestMetadata
): Promise<RateLimitResult> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);

    // SECURITY: Check IP blocklist first (fast fail)
    if (metadata?.ip) {
      const { data: isBlocked } = await supabase.rpc('is_ip_blocked', {
        p_ip_address: metadata.ip
      });

      if (isBlocked) {
        console.warn(`[rate-limit] Blocked IP attempted access: ${metadata.ip}`);
        return {
          allowed: false,
          limit: maxRequests,
          remaining: 0,
          resetAt: new Date(now.getTime() + 86400000), // 24 hours
          blocked: true,
          blockReason: 'IP address is blocked due to suspicious activity'
        };
      }
    }

    // Check rate limit records within the window
    const { data: records, error: fetchError } = await supabase
      .from('rate_limits')
      .select('id, created_at, ip_address')
      .eq('identifier', identifier)
      .eq('action', action)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[rate-limit] Error fetching records:', fetchError);
      // Fail open (allow request) on database errors to prevent service disruption
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

    // Calculate reset time based on oldest record
    const oldestRecord = records && records.length > 0 
      ? records[records.length - 1] 
      : null;
    
    const resetAt = oldestRecord
      ? new Date(new Date(oldestRecord.created_at).getTime() + windowSeconds * 1000)
      : new Date(now.getTime() + windowSeconds * 1000);

    if (allowed) {
      // Insert new rate limit record with metadata
      const insertData: any = {
        identifier,
        action,
        key: `${identifier}:${action}`,
        created_at: now.toISOString(),
      };

      // Add optional metadata
      if (metadata?.ip) insertData.ip_address = metadata.ip;
      if (metadata?.userAgent) insertData.user_agent = metadata.userAgent;
      if (metadata?.countryCode) insertData.country_code = metadata.countryCode;

      await supabase
        .from('rate_limits')
        .insert(insertData);
    } else {
      // SECURITY: Log rate limit exceeded as suspicious activity
      console.warn(`[rate-limit] Rate limit exceeded: ${identifier} - ${action} (${requestCount}/${maxRequests})`);

      // Log to suspicious activity if IP provided
      if (metadata?.ip) {
        await supabase.rpc('log_suspicious_activity', {
          p_user_id: identifier.startsWith('user:') ? identifier.split(':')[1] : null,
          p_ip_address: metadata.ip,
          p_activity_type: 'rate_limit_exceeded',
          p_severity: requestCount > maxRequests * 2 ? 'high' : 'medium',
          p_details: {
            action,
            request_count: requestCount,
            limit: maxRequests,
            window_seconds: windowSeconds,
            user_agent: metadata.userAgent
          },
          p_auto_block: requestCount > maxRequests * 5 // Auto-block if 5x over limit
        });
      }
    }

    return {
      allowed,
      limit: maxRequests,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('[rate-limit] Unexpected error:', error);
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
 * Get comprehensive request metadata from headers
 */
export function getRequestMetadata(req: Request): RequestMetadata {
  // Get IP from various proxy headers (Cloudflare, Vercel, AWS, etc.)
  const ip = 
    req.headers.get('cf-connecting-ip') ||          // Cloudflare
    req.headers.get('x-real-ip') ||                 // Nginx
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() || // Load balancer
    req.headers.get('x-client-ip') ||               // Apache
    req.headers.get('fastly-client-ip') ||          // Fastly CDN
    req.headers.get('true-client-ip') ||            // Akamai
    'unknown';

  // Get user agent
  const userAgent = req.headers.get('user-agent') || undefined;

  // Get country code (Cloudflare, Vercel)
  const countryCode = 
    req.headers.get('cf-ipcountry') ||              // Cloudflare
    req.headers.get('x-vercel-ip-country') ||       // Vercel
    undefined;

  return {
    ip,
    userAgent,
    countryCode
  };
}

/**
 * Get identifier for rate limiting
 * Prefers authenticated user ID, falls back to IP address
 */
export function getRateLimitIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  const metadata = getRequestMetadata(req);
  return `ip:${metadata.ip}`;
}

/**
 * Create rate limit error response with proper headers
 */
export function rateLimitResponse(result: RateLimitResult, corsHeaders?: Record<string, string>): Response {
  const retryAfterSeconds = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);

  const message = result.blocked 
    ? result.blockReason || 'Access denied'
    : `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`;

  return new Response(
    JSON.stringify({
      error: result.blocked ? 'Access Denied' : 'Rate Limit Exceeded',
      message,
      limit: result.limit,
      remaining: 0,
      resetAt: result.resetAt.toISOString(),
      retryAfter: retryAfterSeconds,
      blocked: result.blocked || false
    }),
    {
      status: result.blocked ? 403 : 429,
      headers: {
        ...(corsHeaders || {}),
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetAt.toISOString(),
      },
    }
  );
}

/**
 * Backward compatible rate limit check (maintains existing API)
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  // Call advanced version without metadata for backward compatibility
  return checkRateLimitAdvanced(supabase, identifier, action, maxRequests, windowSeconds);
}

/**
 * Geo-blocking check (optional security layer)
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param blockedCountries - Array of blocked country codes
 * @returns true if country is blocked
 */
export function isCountryBlocked(countryCode?: string, blockedCountries: string[] = []): boolean {
  if (!countryCode || blockedCountries.length === 0) return false;
  return blockedCountries.includes(countryCode.toUpperCase());
}

/**
 * Bot detection based on user agent patterns
 * @param userAgent - User agent string
 * @returns true if likely a bot
 */
export function isSuspiciousUserAgent(userAgent?: string): boolean {
  if (!userAgent) return true; // No user agent = suspicious

  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /go-http-client/i,
    /java\//i,
    /Apache-HttpClient/i,
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * EXAMPLE USAGE IN EDGE FUNCTIONS:
 * 
 * import { checkRateLimitAdvanced, getRequestMetadata, rateLimitResponse } from '../_shared/rateLimit.ts'
 * 
 * serve(async (req: Request) => {
 *   const metadata = getRequestMetadata(req);
 *   
 *   // Check rate limit with IP tracking
 *   const rateLimit = await checkRateLimitAdvanced(
 *     supabase,
 *     getRateLimitIdentifier(req, user?.id),
 *     'mark-pickup',
 *     30,  // 30 requests
 *     60,  // per minute
 *     metadata
 *   );
 *   
 *   if (!rateLimit.allowed) {
 *     return rateLimitResponse(rateLimit, corsHeaders);
 *   }
 *   
 *   // Continue with business logic...
 * });
 */
