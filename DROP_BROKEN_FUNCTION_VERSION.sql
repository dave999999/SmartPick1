-- ============================================
-- DROP BROKEN FUNCTION VERSION
-- ============================================
-- Drop the 5-parameter broken version, keep the fixed 6-parameter version
-- ============================================

-- Drop the BROKEN 5-parameter version (no p_customer_id)
DROP FUNCTION IF EXISTS public.create_reservation_atomic(
  p_offer_id UUID,
  p_quantity INTEGER,
  p_qr_code TEXT,
  p_total_price NUMERIC,
  p_expires_at TIMESTAMPTZ
);

-- Verify only the correct version remains
SELECT 
  'AFTER CLEANUP:' as info,
  p.oid,
  pg_get_function_arguments(p.oid) as parameters,
  CASE 
    WHEN prosrc LIKE '%penalty_type IN (''1hour'', ''24hour'', ''permanent'')%' THEN '✅ CORRECT - Blocks suspensions only'
    WHEN prosrc LIKE '%user_penalties%' AND prosrc NOT LIKE '%penalty_type%' THEN '❌ BROKEN - Checks all penalties'
    ELSE '⚠️ Unknown'
  END as status
FROM pg_proc p
WHERE p.proname = 'create_reservation_atomic';

-- ============================================
-- RESULT
-- ============================================
-- Now only the 6-parameter version with correct fix exists! ✅
-- App will automatically use the correct version ✅
-- ============================================
