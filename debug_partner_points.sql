-- Debug script to verify partner points are accessible
-- Run this in Supabase SQL Editor

-- 1. Show all partner_points records
SELECT
  'All Partner Points' as info,
  user_id,
  balance,
  offer_slots,
  updated_at
FROM partner_points;

-- 2. Show partners and their user_ids
SELECT
  'Partners and User IDs' as info,
  p.id as partner_id,
  p.user_id,
  p.business_name,
  p.status
FROM partners p
WHERE p.status = 'APPROVED';

-- 3. Join partners with their points
SELECT
  'Partners with Points Balance' as info,
  p.business_name,
  p.user_id,
  pp.balance as points_balance,
  pp.offer_slots,
  pp.updated_at as points_last_updated
FROM partners p
LEFT JOIN partner_points pp ON pp.user_id = p.user_id
WHERE p.status = 'APPROVED';

-- 4. Check for any RLS policies that might be blocking
SELECT
  'RLS Status Check' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('partner_points', 'partner_point_transactions');

-- 5. Show recent point transactions
SELECT
  'Recent Point Transactions' as info,
  ppt.partner_id,
  ppt.change as points_change,
  ppt.reason,
  ppt.balance_after,
  ppt.created_at,
  ppt.metadata
FROM partner_point_transactions ppt
ORDER BY ppt.created_at DESC
LIMIT 10;
