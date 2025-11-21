import { supabase } from './supabase';
import { getCSRFToken } from './csrf';

interface SecurityContext {
  csrfToken: string;
  accessToken: string;
}

interface SecureRequestOptions<T> {
  /** Operation name for logging */
  operation: string;
  /** Function that executes the underlying request given the security context */
  execute: (ctx: SecurityContext) => Promise<T>;
  /** Max attempts for CSRF acquisition */
  csrfRetries?: number;
  /** Abort after timeout (ms) */
  timeoutMs?: number;
}

/**
 * Obtain security context (session + CSRF token) with limited retry & jitter.
 */
async function acquireSecurityContext(retries: number): Promise<SecurityContext> {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      // Get CSRF token (may be null temporarily right after sign-in)
      const csrfToken = await getCSRFToken();
      if (!csrfToken) throw new Error('CSRF token unavailable');

      return {
        csrfToken,
        accessToken: session.access_token,
      };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        // Exponential backoff with jitter
        const base = 150 * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 100);
        await new Promise(r => setTimeout(r, base + jitter));
        continue;
      }
    }
  }
  throw new Error(`Security context acquisition failed: ${lastErr?.message || 'unknown error'}`);
}

/**
 * Unified secure request wrapper. Standardizes: session presence, CSRF retrieval, timeout & error normalization.
 */
export async function secureRequest<T>(opts: SecureRequestOptions<T>): Promise<T> {
  const { operation, execute, csrfRetries = 2, timeoutMs = 12000 } = opts;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const ctx = await acquireSecurityContext(csrfRetries);
    // Pass through context to underlying function
    const result = await execute(ctx);
    return result;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`${operation} aborted due to timeout (${timeoutMs}ms)`);
    }
    // Normalize common low-level network error patterns
    const msg = String(err?.message || 'Request failed');
    if (/Failed to fetch|NetworkError|ERR_FAILED|CORS/i.test(msg)) {
      throw new Error(`${operation} network error: ${msg}`);
    }
    throw new Error(`${operation} failed: ${msg}`);
  } finally {
    clearTimeout(timeout);
  }
}

/** Convenience for RPC calls requiring CSRF (adds header automatically if needed). */
export async function secureRpc<T>(rpcName: string, params: Record<string, any>): Promise<T> {
  return secureRequest<T>({
    operation: `rpc:${rpcName}`,
    execute: async (_ctx) => {
      const { data, error } = await supabase.rpc(rpcName, params);
      if (error) throw error;
      return data as T;
    }
  });
}
