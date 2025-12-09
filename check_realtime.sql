-- Check pg_stat_statements for realtime queries
SELECT 
  LEFT(query, 100) as query_preview,
  calls,
  ROUND(total_exec_time::numeric, 2) as total_exec_time_ms,
  ROUND(mean_exec_time::numeric, 2) as mean_exec_time_ms,
  ROUND((total_exec_time / sum(total_exec_time) OVER () * 100)::numeric, 2) as percent_of_total
FROM pg_stat_statements
WHERE query ILIKE '%realtime%' OR query ILIKE '%list_changes%'
ORDER BY total_exec_time DESC
LIMIT 20;

-- Check current active realtime connections
SELECT 
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE query ILIKE '%realtime%') as realtime_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_connections
FROM pg_stat_activity
WHERE datname = current_database();

-- Check for specific realtime subscription patterns
SELECT 
  application_name,
  state,
  COUNT(*) as connection_count
FROM pg_stat_activity
WHERE application_name ILIKE '%realtime%' OR query ILIKE '%realtime%'
GROUP BY application_name, state;
