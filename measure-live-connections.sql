-- Real-time Connection Measurement Query
-- Paste this in Supabase Dashboard > SQL Editor

-- Query 1: Current active connections
SELECT 
  COUNT(*) as total_active_connections,
  application_name,
  state,
  backend_type
FROM pg_stat_activity 
WHERE 
  datname = current_database()
  AND pid != pg_backend_pid()
  AND state != 'idle'
GROUP BY application_name, state, backend_type
ORDER BY total_active_connections DESC;

-- Query 2: Realtime connections specifically
SELECT 
  COUNT(*) FILTER (WHERE application_name LIKE '%realtime%') as realtime_connections,
  COUNT(*) FILTER (WHERE application_name LIKE '%postgrest%') as api_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_queries,
  COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
  COUNT(*) as total_connections
FROM pg_stat_activity 
WHERE 
  datname = current_database()
  AND pid != pg_backend_pid();

-- Query 3: Connection details (for debugging)
SELECT 
  pid,
  usename as user,
  application_name,
  client_addr as client_ip,
  backend_start,
  state,
  wait_event_type,
  wait_event,
  query_start,
  CASE 
    WHEN application_name LIKE '%realtime%' THEN 'Realtime Subscription'
    WHEN application_name LIKE '%postgrest%' THEN 'API Call'
    WHEN application_name LIKE '%supabase%' THEN 'Supabase Internal'
    ELSE 'Other'
  END as connection_type
FROM pg_stat_activity 
WHERE 
  datname = current_database()
  AND pid != pg_backend_pid()
  AND state != 'idle'
ORDER BY backend_start DESC
LIMIT 50;
