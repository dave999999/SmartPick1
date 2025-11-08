# 📋 Logging Migration Guide

## Overview

We've implemented a production-safe logging system that automatically removes debug logs from production builds while keeping them in development.

## What Changed

### Before (Insecure)
```typescript
console.log('User data:', userData);  // ❌ Exposed in production
console.log('Admin operation:', adminId);  // ❌ Security risk
```

### After (Secure)
```typescript
import { logger } from '@/lib/logger';

logger.log('User data:', userData);  // ✅ Only in development
logger.error('Critical error', error);  // ✅ Shown in production
```

## Logger API

### Development-Only Logs
```typescript
logger.log('Debug info');       // Removed in production
logger.info('Information');     // Removed in production
logger.debug('Verbose output'); // Removed in production
```

### Production Logs (Important Only)
```typescript
logger.warn('Warning message');  // Shown in production
logger.error('Error occurred', error);  // Shown in production
```

### Structured Error Logging
```typescript
import { logError } from '@/lib/logger';

logError('PaymentProcessing', error, {
  userId: user.id,
  amount: 100,
  password: 'secret123'  // Auto-sanitized to [REDACTED]
});
```

## Migration Steps

### 1. Install the Logger
Already done! Located at `src/lib/logger.ts`

### 2. Replace console.log Statements

**Find all console.log:**
```bash
grep -r "console\.log" src/
```

**Replace with logger:**
```typescript
// Before
console.log('Fetching data...');

// After
import { logger } from '@/lib/logger';
logger.log('Fetching data...');
```

### 3. Keep Important Logs
For errors and warnings that should appear in production:

```typescript
// Keep these in production
logger.error('Failed to load user', error);
logger.warn('Deprecated API used');

// Remove these from production
logger.log('Debug: Entering function');
logger.info('Request params:', params);
```

## Vite Configuration

The build process now automatically removes console logs:

```typescript
// vite.config.ts
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,  // Remove all console.* in production
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.debug', 'console.info']
    }
  }
}
```

## Sensitive Data Protection

The logger automatically sanitizes sensitive keys:

```typescript
logger.log('User info', {
  email: 'user@example.com',  // ✅ Logged
  password: 'secret',          // 🔒 Becomes [REDACTED]
  token: 'xyz123',             // 🔒 Becomes [REDACTED]
  apiKey: 'key123'             // 🔒 Becomes [REDACTED]
});
```

**Protected keys:**
- password
- token
- apiKey
- secret
- authorization
- phone

## Testing

### Development
```bash
npm run dev
# All logs visible in console
```

### Production Build
```bash
npm run build
npm run preview
# Only errors and warnings visible
```

### Verify Logs Removed
```bash
# Check if console.log appears in production bundle
grep -r "console.log" dist/assets/
# Should return nothing or very few results
```

## Best Practices

### ✅ DO:
- Use `logger.log()` for development debugging
- Use `logger.error()` for production errors
- Use structured logging with `logError()`
- Log important state changes in development

### ❌ DON'T:
- Log sensitive data (passwords, tokens, API keys)
- Log personally identifiable information (PII)
- Use `console.log` directly (use logger instead)
- Leave verbose logging in production

## Future Enhancements

### Error Tracking Integration
Add services like Sentry or LogRocket:

```typescript
// src/lib/logger.ts
if (!isDevelopment) {
  Sentry.captureException(error);
}
```

### Log Aggregation
Send logs to centralized systems:

```typescript
logger.error('API Error', {
  // Sends to Datadog, Papertrail, etc.
});
```

## Questions?

If you have questions about the logger or need help migrating, contact the development team.

---
**Updated**: 2025-01-08
**Status**: Active
