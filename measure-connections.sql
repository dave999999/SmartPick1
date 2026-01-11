-- Realtime Connection Analysis Query
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Current active connections
SELECT 
  COUNT(*) as total_connections,
  application_name,
  state,
  backend_type
FROM pg_stat_activity 
WHERE 
  application_name IS NOT NULL
  AND application_name != ''
GROUP BY application_name, state, backend_type
ORDER BY total_connections DESC;

-- 2. Realtime-specific connections
SELECT 
  COUNT(*) as realtime_connections,
  state
FROM pg_stat_activity 
WHERE 
  application_name LIKE '%realtime%'
  OR backend_type LIKE '%realtime%'
GROUP BY state;

-- 3. All active sessions (excluding system processes)
SELECT 
  COUNT(*) as active_sessions
FROM pg_stat_activity 
WHERE 
  datname = current_database()
  AND application_name IS NOT NULL
  AND application_name != '';

-- 4. Detailed connection breakdown
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change,
  backend_type
FROM pg_stat_activity 
WHERE 
  datname = current_database()
  AND application_name IS NOT NULL
  AND pid != pg_backend_pid()
ORDER BY state_change DESC
LIMIT 50;

-- 5. Connection pool status (if using pgBouncer)
SELECT 
  database,
  COUNT(*) as connections,
  state
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY database, state;
