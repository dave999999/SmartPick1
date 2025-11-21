// Secure CORS configuration for Edge Functions
// Only allows requests from whitelisted origins

// Always include localhost for local development
// In production, Supabase environment won't have localhost origins anyway
const ALLOWED_ORIGINS = [
  'https://smartpick.ge',
  'https://www.smartpick.ge',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

/**
 * Get CORS headers for the given request
 * Validates origin against whitelist and returns appropriate headers
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  
  // Check if origin is in allowed list
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-connection-pool',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };
}

/**
 * Get simple CORS headers (backwards compatible)
 * For functions that don't need the request object
 */
export function getDefaultCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-connection-pool',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(req: Request): Response {
  return new Response('ok', { 
    headers: getCorsHeaders(req),
    status: 200
  });
}
