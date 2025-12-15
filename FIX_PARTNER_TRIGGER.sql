-- =====================================================
-- FIX: Partner approval trigger issue
-- =====================================================

-- Check the trigger that's causing the issue
SELECT 
  tgname AS trigger_name,
  proname AS function_name,
  pg_get_functiondef(pg_trigger.tgfoid) AS function_definition
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'public.partners'::regclass
AND proname = 'grant_partner_welcome_points';

-- Check partner_point_transactions table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'partner_point_transactions'
ORDER BY ordinal_position;

-- Check if partner_points table exists and has the partner_id
SELECT 
  id,
  partner_id
FROM partner_points
WHERE partner_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9';
