-- Test script to diagnose the pickup permission issue
-- Run this in Supabase SQL Editor as service_role

-- 1. Check if RLS is actually disabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('partner_points', 'partner_point_transactions', 'reservations', 'escrow_points');

-- 2. Check current trigger on reservations
SELECT 
  tgname as trigger_name, 
  tgfoid::regproc as function_name,
  tgenabled as enabled,
  tgtype as trigger_type
FROM pg_trigger 
WHERE tgrelid = 'reservations'::regclass
AND tgname LIKE '%partner%';

-- 3. Get the actual source code of transfer_points_to_partner_on_pickup
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'transfer_points_to_partner_on_pickup';

-- 4. Get the actual source code of add_partner_points
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'add_partner_points';

-- 5. Test direct point addition (replace with actual partner user_id)
-- SELECT * FROM add_partner_points(
--   '<partner_user_id>'::UUID,
--   5,
--   'TEST_PICKUP',
--   '{"test": true}'::jsonb
-- );
