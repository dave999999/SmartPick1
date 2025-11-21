/**
 * Production-safe logger utility
 *
 * Automatically removes logs in production builds while keeping them in development.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *
 *   logger.log('Debug info');
 *   logger.warn('Warning message');
 *   logger.error('Error occurred', error);
 */

import { safeConsole } from './console-bypass';

const isDevelopment = import.meta.env.MODE === 'development';

// Use safe console methods that bypass React DevTools
const originalConsole = safeConsole;

// Helper to safely convert any value to a loggable primitive string
const toSafeString = (arg: any): string => {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return `Error: ${arg.message}`;
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'object') {
    try {
      // Check for React ErrorInfo
      if (arg.componentStack) return `[React ErrorInfo]`;
      return JSON.stringify(arg);
    } catch (e) {
      return '[Object]';
    }
  }
  try {
    return String(arg);
  } catch (e) {
    return '[Unprintable]';
  }
};

export const logger = {
  /**
   * Development-only logging
   * Stripped from production builds
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      const safeString = args.map(toSafeString).join(' ');
      originalConsole.log(safeString);
    }
  },

  /**
   * Warning messages (shown in both dev and production)
   * Use for important warnings that need investigation
   */
  warn: (...args: any[]) => {
    const safeString = args.map(toSafeString).join(' ');
    originalConsole.warn(safeString);
  },

  /**
   * Error messages (shown in both dev and production)
   * Use for errors that need tracking
   */
  error: (...args: any[]) => {
    const safeString = args.map(toSafeString).join(' ');
    originalConsole.error(safeString);
  },

  /**
   * Info messages (development only)
   * Use for informational debugging
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      const safeString = args.map(toSafeString).join(' ');
      originalConsole.info(safeString);
    }
  },

  /**
   * Debug messages (development only)
   * Use for verbose debugging
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      const safeString = args.map(toSafeString).join(' ');
      originalConsole.log(safeString);
    }
  },

  /**
   * Group console logs (development only)
   */
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },
};

/**
 * Structured error logging
 * Sanitizes sensitive data before logging
 */
export const logError = (context: string, error: unknown, additionalData?: Record<string, any>) => {
  const sanitizedData = additionalData ? sanitizeLogData(additionalData) : {};

  logger.error(`[${context}]`, {
    message: error instanceof Error ? error.message : 'Unknown error',
    ...sanitizedData,
    timestamp: new Date().toISOString(),
  });

  // In production, you might want to send this to an error tracking service
  // like Sentry, LogRocket, or Datadog
  if (!isDevelopment && typeof window !== 'undefined') {
    // Example: Send to error tracking service
    // window.errorTracker?.captureError(error, { context, ...sanitizedData });
  }
};

/**
 * Remove sensitive data from logs
 */
function sanitizeLogData(data: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization', 'phone'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export default logger;
