-- ============================================================================
-- ENSURE ALL PARTNERS HAVE PARTNER_POINTS RECORDS
-- ============================================================================
-- This script ensures every approved partner has a partner_points record
-- with the correct user_id (auth.users.id, which is also partners.user_id)
-- ============================================================================

-- Step 1: Check current state
SELECT 
  p.business_name,
  p.user_id,
  p.status,
  pp.balance,
  pp.offer_slots,
  CASE 
    WHEN pp.user_id IS NULL THEN '❌ MISSING'
    ELSE '✅ EXISTS'
  END as points_status
FROM partners p
LEFT JOIN partner_points pp ON p.user_id = pp.user_id
WHERE p.status = 'APPROVED'
ORDER BY points_status DESC, p.business_name;

-- Step 2: Insert missing partner_points records for all approved partners
-- Uses partners.user_id (which is auth.users.id)
INSERT INTO partner_points (user_id, balance, offer_slots, created_at, updated_at)
SELECT 
  p.user_id,        -- This is auth.users.id
  1000,             -- Starting balance
  10,               -- Starting slots
  NOW(),
  NOW()
FROM partners p
LEFT JOIN partner_points pp ON p.user_id = pp.user_id
WHERE p.status = 'APPROVED'
  AND pp.user_id IS NULL  -- Only insert if doesn't exist
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Verify all partners now have points
SELECT 
  COUNT(*) FILTER (WHERE pp.user_id IS NOT NULL) as partners_with_points,
  COUNT(*) FILTER (WHERE pp.user_id IS NULL) as partners_without_points,
  COUNT(*) as total_approved_partners
FROM partners p
LEFT JOIN partner_points pp ON p.user_id = pp.user_id
WHERE p.status = 'APPROVED';

-- Step 4: Show final state
SELECT 
  p.business_name,
  p.user_id,
  pp.balance,
  pp.offer_slots
FROM partners p
INNER JOIN partner_points pp ON p.user_id = pp.user_id
WHERE p.status = 'APPROVED'
ORDER BY p.business_name;

-- ============================================================================
-- EXPECTED RESULT: All approved partners should have partner_points
-- ============================================================================
