-- Verify partner_mark_as_picked_up function exists and is accessible

-- 1. Check if function exists
SELECT
  'Function Check' as info,
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'partner_mark_as_picked_up'
  AND routine_schema = 'public';

-- 2. Check function grants
SELECT
  'Function Permissions' as info,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'partner_mark_as_picked_up'
  AND routine_schema = 'public';

-- 3. Test the function with a sample call (will show error if exists)
-- Replace 'test-uuid' with an actual reservation ID if you want to test
-- SELECT * FROM partner_mark_as_picked_up('00000000-0000-0000-0000-000000000000');

-- 4. Check if partner_points table exists and has correct schema
SELECT
  'partner_points schema' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'partner_points'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check if reservations table has points_spent column
SELECT
  'reservations.points_spent check' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations'
  AND table_schema = 'public'
  AND column_name = 'points_spent';

-- 6. Check if there are any active reservations
SELECT
  'Active Reservations' as info,
  id,
  status,
  points_spent,
  partner_id,
  customer_id,
  created_at
FROM reservations
WHERE status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 5;
