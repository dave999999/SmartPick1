-- ============================================================================
-- FIX: Partner points not initialized - Create missing partner_points records
-- ============================================================================
-- Problem: Some partners don't have partner_points records
-- Solution: Create partner_points for all approved partners who don't have one
-- ============================================================================

-- First, show which partners are missing partner_points
SELECT 
  p.id as partner_id,
  p.user_id as auth_user_id,
  p.business_name,
  p.status,
  p.created_at,
  CASE 
    WHEN pp.user_id IS NULL THEN '❌ Missing partner_points'
    ELSE '✅ Has partner_points'
  END as points_status
FROM partners p
LEFT JOIN partner_points pp ON pp.user_id = p.id
WHERE p.status = 'APPROVED'
ORDER BY pp.user_id IS NULL DESC, p.created_at DESC;

-- ============================================================================
-- Create missing partner_points records for all approved partners
-- ============================================================================

INSERT INTO partner_points (
  user_id,
  balance,
  offer_slots,
  created_at,
  updated_at
)
SELECT 
  p.id,
  1000,  -- Starting balance: 1000 points
  4,     -- Starting slots: 4 offer slots
  NOW(),
  NOW()
FROM partners p
LEFT JOIN partner_points pp ON pp.user_id = p.id
WHERE p.status = 'APPROVED'
  AND pp.user_id IS NULL;  -- Only create if missing

-- Log the creation
DO $$
DECLARE
  v_created_count INT;
BEGIN
  GET DIAGNOSTICS v_created_count = ROW_COUNT;
  
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Created % partner_points records for approved partners', v_created_count;
  RAISE NOTICE '============================================================';
  
  IF v_created_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Each new record has:';
    RAISE NOTICE '  - Balance: 1000 points';
    RAISE NOTICE '  - Offer Slots: 4';
    RAISE NOTICE '';
    RAISE NOTICE 'Partners can now:';
    RAISE NOTICE '  ✅ Create offers (up to 4 active)';
    RAISE NOTICE '  ✅ Purchase additional slots';
    RAISE NOTICE '  ✅ Receive points from pickups';
  ELSE
    RAISE NOTICE 'All approved partners already have partner_points records ✅';
  END IF;
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- VERIFICATION: Show all partner_points now
-- ============================================================================

SELECT 
  pp.user_id as partner_id,
  p.business_name,
  pp.balance,
  pp.offer_slots,
  pp.created_at,
  '✅ Ready' as status
FROM partner_points pp
JOIN partners p ON p.id = pp.user_id
WHERE p.status = 'APPROVED'
ORDER BY pp.created_at DESC;

-- ============================================================================
-- Create welcome transactions for newly created records
-- ============================================================================

INSERT INTO partner_point_transactions (
  partner_id,
  change,
  reason,
  balance_before,
  balance_after,
  metadata,
  created_at
)
SELECT 
  pp.user_id,
  1000,
  'WELCOME_BONUS',
  0,
  1000,
  jsonb_build_object(
    'note', 'Initial partner points granted',
    'created_by', 'system'
  ),
  NOW()
FROM partner_points pp
LEFT JOIN partner_point_transactions ppt 
  ON ppt.partner_id = pp.user_id 
  AND ppt.reason = 'WELCOME_BONUS'
WHERE ppt.id IS NULL  -- Only if welcome transaction doesn't exist
  AND pp.balance = 1000;  -- Only for newly created accounts

DO $$
DECLARE
  v_transactions_created INT;
BEGIN
  GET DIAGNOSTICS v_transactions_created = ROW_COUNT;
  
  IF v_transactions_created > 0 THEN
    RAISE NOTICE 'Created % welcome bonus transaction records', v_transactions_created;
  END IF;
END $$;
