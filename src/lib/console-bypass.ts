import { logger } from '@/lib/logger';
/**
 * Console bypass for React DevTools
 * Prevents "Cannot convert object to primitive value" errors by intercepting console calls
 */

// Store original console methods
const original = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

// Helper to safely convert arguments
const safeStringify = (arg: any): string => {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return `Error: ${arg.message}\n${arg.stack || ''}`;
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;
  if (typeof arg === 'symbol') return arg.toString();
  if (typeof arg === 'object') {
    try {
      // Handle React ErrorInfo
      if (arg.componentStack) return `[React ErrorInfo]\n${arg.componentStack}`;
      // Handle circular references
      const seen = new WeakSet();
      return JSON.stringify(arg, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        return value;
      }, 2);
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

// Override console methods globally
// In production: disable ALL logging for maximum performance
// In development: safe stringify to prevent React DevTools errors
if (import.meta.env.PROD) {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
  // Keep console.error for critical issues only
  console.error = (...args: any[]) => original.error(args.map(safeStringify).join(' '));
} else {
  console.log = (...args: any[]) => original.log(args.map(safeStringify).join(' '));
  console.warn = (...args: any[]) => original.warn(args.map(safeStringify).join(' '));
  console.error = (...args: any[]) => original.error(args.map(safeStringify).join(' '));
}
console.info = (...args: any[]) => original.info(args.map(safeStringify).join(' '));
console.debug = (...args: any[]) => original.debug(args.map(safeStringify).join(' '));

export const safeConsole = original;
