-- ============================================================================
-- CHECK: What does the check_partner_offer_slots() trigger function do?
-- ============================================================================

-- Show the trigger function source code
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'check_partner_offer_slots';

-- This will show us what column names the trigger is using
-- and why it might be failing
