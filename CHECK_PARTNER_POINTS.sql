-- Check partner_points data for all partners
-- Run this in Supabase SQL Editor to see current state

SELECT 
  p.business_name,
  p.user_id,
  pp.balance,
  pp.offer_slots,
  pp.created_at
FROM partners p
LEFT JOIN partner_points pp ON p.user_id = pp.user_id
ORDER BY p.business_name;

-- Check if there are orphaned partner_points records
SELECT 'Orphaned partner_points records:' as check_type, COUNT(*) as count
FROM partner_points pp
LEFT JOIN partners p ON pp.user_id = p.user_id
WHERE p.user_id IS NULL;

-- Check if there are partners without partner_points
SELECT 'Partners without partner_points:' as check_type, COUNT(*) as count
FROM partners p
LEFT JOIN partner_points pp ON p.user_id = pp.user_id
WHERE pp.user_id IS NULL;

-- Test the RPC function with a specific partner
-- Replace 'YOUR-USER-ID' with an actual partner user_id from the first query
-- SELECT get_partner_dashboard_data('YOUR-USER-ID');
