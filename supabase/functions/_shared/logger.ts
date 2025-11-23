/**
 * Structured logging utility for Edge Functions
 * Prevents sensitive data leakage to production logs
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  [key: string]: unknown;
}

// Fields that should NEVER be logged
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'credentials',
  'auth',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionToken',
  'session_token',
  'jwt',
  'bearer',
  'cookie',
  'set-cookie',
];

// Fields that should be redacted (show only partial data)
const REDACTABLE_FIELDS = [
  'email',
  'phone',
  'address',
  'ip',
  'ipAddress',
  'ip_address',
  'chatId',
  'chat_id',
  'userId',
  'user_id',
  'partnerId',
  'partner_id',
  'orderId',
  'order_id',
  'transactionId',
  'transaction_id',
];

/**
 * Redact sensitive data from log context
 */
function sanitizeContext(context: LogContext): LogContext {
  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();

    // Remove sensitive fields entirely
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Redact partial data for identifiable fields
    if (REDACTABLE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      if (typeof value === 'string') {
        sanitized[key] = redactString(value);
      } else if (typeof value === 'number') {
        sanitized[key] = `***${String(value).slice(-4)}`;
      } else {
        sanitized[key] = '[REDACTED]';
      }
      continue;
    }

    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeContext(value as LogContext);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        item && typeof item === 'object' ? sanitizeContext(item as LogContext) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Redact string data (show first 2 and last 2 chars)
 */
function redactString(str: string): string {
  if (str.length <= 6) {
    return '***';
  }
  return `${str.slice(0, 2)}***${str.slice(-2)}`;
}

/**
 * Get environment-aware logging flag
 */
function shouldLog(level: LogLevel): boolean {
  const env = Deno.env.get('ENVIRONMENT') || 'production';
  
  // In production, only log WARN and ERROR
  if (env === 'production') {
    return level === LogLevel.WARN || level === LogLevel.ERROR;
  }
  
  // In development/staging, log everything
  return true;
}

/**
 * Create a logger instance for a specific function
 */
export function createLogger(functionName: string) {
  return {
    debug(message: string, context?: LogContext) {
      if (!shouldLog(LogLevel.DEBUG)) return;
      
      const sanitized = context ? sanitizeContext(context) : {};
      console.log(JSON.stringify({
        level: LogLevel.DEBUG,
        function: functionName,
        message,
        ...sanitized,
        timestamp: new Date().toISOString(),
      }));
    },

    info(message: string, context?: LogContext) {
      if (!shouldLog(LogLevel.INFO)) return;
      
      const sanitized = context ? sanitizeContext(context) : {};
      console.log(JSON.stringify({
        level: LogLevel.INFO,
        function: functionName,
        message,
        ...sanitized,
        timestamp: new Date().toISOString(),
      }));
    },

    warn(message: string, context?: LogContext) {
      if (!shouldLog(LogLevel.WARN)) return;
      
      const sanitized = context ? sanitizeContext(context) : {};
      console.warn(JSON.stringify({
        level: LogLevel.WARN,
        function: functionName,
        message,
        ...sanitized,
        timestamp: new Date().toISOString(),
      }));
    },

    error(message: string, error?: Error | unknown, context?: LogContext) {
      if (!shouldLog(LogLevel.ERROR)) return;
      
      const sanitized = context ? sanitizeContext(context) : {};
      const errorDetails = error instanceof Error
        ? { error: error.message, stack: error.stack }
        : { error: String(error) };
      
      console.error(JSON.stringify({
        level: LogLevel.ERROR,
        function: functionName,
        message,
        ...errorDetails,
        ...sanitized,
        timestamp: new Date().toISOString(),
      }));
    },
  };
}

/**
 * Helper to log HTTP requests (with sanitization)
 */
export function logRequest(
  functionName: string,
  req: Request,
  additionalContext?: LogContext
) {
  const logger = createLogger(functionName);
  
  logger.info('Request received', {
    method: req.method,
    url: sanitizeUrl(req.url),
    ...additionalContext,
  });
}

/**
 * Sanitize URL by removing query params and hashes
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return '[INVALID_URL]';
  }
}
