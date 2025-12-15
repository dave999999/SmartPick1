-- Check current connections and activity
SELECT 
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE application_name ILIKE '%realtime%') as realtime_app_connections,
  COUNT(*) FILTER (WHERE query ILIKE '%postgres_changes%') as postgres_changes_queries,
  COUNT(*) FILTER (WHERE state = 'active') as active_connections,
  COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity
WHERE datname = current_database() AND usename != 'supabase_admin';

-- Show realtime-related connections in detail
SELECT 
  pid,
  application_name,
  state,
  wait_event_type,
  wait_event,
  query_start,
  state_change,
  LEFT(query, 100) as query_preview
FROM pg_stat_activity
WHERE (application_name ILIKE '%realtime%' OR query ILIKE '%postgres_changes%')
  AND datname = current_database()
ORDER BY query_start DESC
LIMIT 20;

-- Check for channels/subscriptions
SELECT 
  application_name,
  state,
  COUNT(*) as count
FROM pg_stat_activity
WHERE datname = current_database()
  AND usename != 'supabase_admin'
GROUP BY application_name, state
ORDER BY count DESC;
