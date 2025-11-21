import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const secureHeaders = getCorsHeaders(req);

  const startTime = Date.now();

  try {
    // Check if authenticated for detailed checks
    const authHeader = req.headers.get('Authorization');
    const isAuthenticated = authHeader && authHeader.startsWith('Bearer ');

    // Initialize Supabase client with connection pooling
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          'x-connection-pool': 'transaction',
        },
      },
    });

    // Basic health always available
    const checks: Record<string, any> = {
      functions: { status: 'healthy' },
    };

    // Detailed checks only for authenticated requests
    if (isAuthenticated) {
      checks.database = { status: 'unknown', latency_ms: 0, error: null };
      checks.auth = { status: 'unknown', error: null };
      checks.storage = { status: 'unknown', error: null };

      // 1. Database connectivity check
      try {
        const dbStartTime = Date.now();
        const { error, count } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .limit(1);
        
        const dbLatency = Date.now() - dbStartTime;
        
        if (error) {
          checks.database = { status: 'unhealthy', latency_ms: dbLatency, error: error.message };
        } else {
          checks.database = { status: 'healthy', latency_ms: dbLatency, records: count || 0 };
        }
      } catch (error) {
        checks.database = { status: 'error', error: String(error) };
      }

      // 2. Auth service check
      try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
        
        if (error) {
          checks.auth = { status: 'unhealthy', error: error.message };
        } else {
          checks.auth = { status: 'healthy', user_count: users?.length || 0 };
        }
      } catch (error) {
        checks.auth = { status: 'error', error: String(error) };
      }

      // 3. Storage check
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) {
          checks.storage = { status: 'unhealthy', error: error.message };
        } else {
          checks.storage = { status: 'healthy', buckets: buckets?.length || 0 };
        }
      } catch (error) {
        checks.storage = { status: 'error', error: String(error) };
      }
    }

    // Calculate overall status
    const isHealthy = isAuthenticated
      ? checks.database?.status === 'healthy' &&
        checks.auth?.status === 'healthy' &&
        checks.storage?.status === 'healthy'
      : checks.functions.status === 'healthy';

    const totalLatency = Date.now() - startTime;

    const response = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      latency_ms: totalLatency,
      version: Deno.env.get('BUILD_VERSION') || '1.0.0',
      authenticated: isAuthenticated,
      checks,
      ok: isHealthy,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: isHealthy ? 200 : 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const totalLatency = Date.now() - startTime;
    
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        latency_ms: totalLatency,
        error: String(error),
        ok: false,
      }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
