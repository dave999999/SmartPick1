import { logger } from '@/lib/logger';
/**
 * Client-Side Rate Limiter
 *
 * Provides rate limiting for authentication and API calls to prevent abuse.
 * Uses localStorage for client-side tracking and can integrate with server-side limits.
 *
 * Limits:
 * - Login: 5 attempts per 15 minutes per IP
 * - Signup: 3 attempts per hour per IP
 * - Reservations: 10 per hour per user
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  action: string;
}

interface RateLimitRecord {
  attempts: number[];
  firstAttempt: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    action: 'login'
  },
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    action: 'signup'
  },
  reservation: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    action: 'reservation'
  },
  createOffer: {
    maxAttempts: 20,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours (1 day)
    action: 'createOffer'
  },
  updateProfile: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    action: 'updateProfile'
  }
};

class RateLimiter {
  private storageKey = 'smartpick_rate_limits';

  /**
   * Check if an action is rate limited
   * @param action - Type of action (login, signup, reservation)
   * @param identifier - User identifier (email, userId, etc.)
   * @returns Object with allowed status and retry information
   */
  async checkLimit(action: keyof typeof RATE_LIMITS, identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    message?: string;
  }> {
    const config = RATE_LIMITS[action];
    if (!config) {
      return { allowed: true, remaining: 99, resetAt: new Date() };
    }

    const key = `${action}:${identifier}`;
    const record = this.getRecord(key);
    const now = Date.now();

    // Clean old attempts outside the time window
    const recentAttempts = record.attempts.filter(
      timestamp => now - timestamp < config.windowMs
    );

    const remaining = Math.max(0, config.maxAttempts - recentAttempts.length);
    const resetAt = recentAttempts.length > 0
      ? new Date(recentAttempts[0] + config.windowMs)
      : new Date();

    if (recentAttempts.length >= config.maxAttempts) {
      const minutesUntilReset = Math.ceil((resetAt.getTime() - now) / 60000);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        message: `Too many ${action} attempts. Please try again in ${minutesUntilReset} minute${minutesUntilReset > 1 ? 's' : ''}.`
      };
    }

    return {
      allowed: true,
      remaining,
      resetAt
    };
  }

  /**
   * Record an attempt for rate limiting
   * @param action - Type of action
   * @param identifier - User identifier
   */
  recordAttempt(action: keyof typeof RATE_LIMITS, identifier: string): void {
    const key = `${action}:${identifier}`;
    const record = this.getRecord(key);
    const now = Date.now();
    const config = RATE_LIMITS[action];

    // Add current attempt
    record.attempts.push(now);

    // Keep only attempts within the time window
    record.attempts = record.attempts.filter(
      timestamp => now - timestamp < config.windowMs
    );

    this.saveRecord(key, record);
  }

  /**
   * Clear rate limit for a specific action and identifier
   * Used after successful completion or for admin override
   */
  clearLimit(action: keyof typeof RATE_LIMITS, identifier: string): void {
    const key = `${action}:${identifier}`;
    const allRecords = this.getAllRecords();
    delete allRecords[key];
    this.saveAllRecords(allRecords);
  }

  /**
   * Get remaining attempts for an action
   */
  getRemainingAttempts(action: keyof typeof RATE_LIMITS, identifier: string): number {
    const config = RATE_LIMITS[action];
    const key = `${action}:${identifier}`;
    const record = this.getRecord(key);
    const now = Date.now();

    const recentAttempts = record.attempts.filter(
      timestamp => now - timestamp < config.windowMs
    );

    return Math.max(0, config.maxAttempts - recentAttempts.length);
  }

  /**
   * Clean up old rate limit records (call periodically)
   */
  cleanup(): void {
    const allRecords = this.getAllRecords();
    const now = Date.now();
    const maxWindow = Math.max(...Object.values(RATE_LIMITS).map(c => c.windowMs));

    Object.entries(allRecords).forEach(([key, record]) => {
      // Remove records where all attempts are older than the max window
      const hasRecentAttempts = record.attempts.some(
        timestamp => now - timestamp < maxWindow
      );

      if (!hasRecentAttempts) {
        delete allRecords[key];
      }
    });

    this.saveAllRecords(allRecords);
  }

  // Private methods for localStorage management
  private getRecord(key: string): RateLimitRecord {
    const allRecords = this.getAllRecords();
    return allRecords[key] || { attempts: [], firstAttempt: Date.now() };
  }

  private saveRecord(key: string, record: RateLimitRecord): void {
    const allRecords = this.getAllRecords();
    allRecords[key] = record;
    this.saveAllRecords(allRecords);
  }

  private getAllRecords(): Record<string, RateLimitRecord> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private saveAllRecords(records: Record<string, RateLimitRecord>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch (error) {
      logger.error('Failed to save rate limit records:', error instanceof Error ? error.message : String(error));
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Clean up old records every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    rateLimiter.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Helper function for easy rate limit checking
 */
export async function checkRateLimit(
  action: keyof typeof RATE_LIMITS,
  identifier: string
): Promise<{ allowed: boolean; message?: string }> {
  const result = await rateLimiter.checkLimit(action, identifier);

  if (!result.allowed) {
    return {
      allowed: false,
      message: result.message
    };
  }

  // Record the attempt
  rateLimiter.recordAttempt(action, identifier);

  return { allowed: true };
}

export default rateLimiter;
