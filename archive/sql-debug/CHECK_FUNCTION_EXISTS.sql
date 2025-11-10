-- Run this in Supabase SQL Editor to check if function exists
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'partner_mark_as_picked_up';

-- If nothing is returned, the function doesn't exist yet!
-- You need to apply the migration: 20251108_partner_mark_picked_up_function.sql
