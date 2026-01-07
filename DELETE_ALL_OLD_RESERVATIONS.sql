-- =========================================================
-- CLEAN UP ALL OLD RESERVATIONS FOR DAVETEST
-- =========================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  RAISE NOTICE '=== CLEANING UP ALL RESERVATIONS ===';
  
  -- Delete all old reservations (keep only ACTIVE if any)
  DELETE FROM reservations
  WHERE customer_id = v_user_id
    AND status IN ('CANCELLED', 'EXPIRED', 'FAILED_PICKUP', 'PICKED_UP');
  
  RAISE NOTICE '✅ Deleted all old reservations';
  
  -- Reset rate limits for ALL users (production cleanup)
  DELETE FROM rate_limits;
  
  RAISE NOTICE '✅ Reset ALL rate limits (production cleanup)';
END $$;

-- Verify
SELECT 
  'REMAINING RESERVATIONS' as type,
  status,
  COUNT(*) as count
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
GROUP BY status;
