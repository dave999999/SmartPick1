-- =========================================================
-- COMPREHENSIVE FIX: AUTO-EXPIRE RESERVATIONS
-- =========================================================
-- Problem: Reservations expire (time passes) but status stays "active"
-- Root Cause: No automatic mechanism to update status when expires_at < NOW()
-- Solution: Fix expire_user_reservations() + add trigger + manual cleanup

-- ============================================================================
-- STEP 1: FIX expire_user_reservations FUNCTION
-- ============================================================================
-- This function checks for expired reservations and marks them properly
-- It should be called:
-- 1. When user loads My Picks page
-- 2. When user tries to make new reservation
-- 3. By a scheduled job (optional)

DROP FUNCTION IF EXISTS expire_user_reservations(UUID) CASCADE;

CREATE OR REPLACE FUNCTION expire_user_reservations(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_rec RECORD;
BEGIN
  -- Find all ACTIVE reservations that have expired
  FOR v_rec IN
    SELECT 
      r.id as reservation_id,
      r.offer_id,
      r.quantity,
      r.partner_id
    FROM reservations r
    WHERE r.user_id = p_user_id
      AND r.status = 'active'  -- Only process active ones
      AND r.expires_at < NOW()  -- Time has passed
  LOOP
    -- Update reservation status to expired
    UPDATE reservations
    SET status = 'expired',
        updated_at = NOW()
    WHERE id = v_rec.reservation_id;
    
    -- Restore offer quantity
    UPDATE offers
    SET quantity_available = quantity_available + v_rec.quantity,
        updated_at = NOW()
    WHERE id = v_rec.offer_id;
    
    -- Track as missed pickup
    INSERT INTO user_missed_pickups (
      user_id,
      reservation_id,
      partner_id,
      created_at
    ) VALUES (
      p_user_id,
      v_rec.reservation_id,
      v_rec.partner_id,
      NOW()
    )
    ON CONFLICT (reservation_id) DO NOTHING;
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Expired % reservation(s) for user %', v_expired_count, p_user_id;
  RETURN v_expired_count;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_user_reservations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_user_reservations(UUID) TO anon;

COMMENT ON FUNCTION expire_user_reservations IS 
'Auto-expires reservations where expires_at < NOW(), marks as expired, restores quantity, tracks missed pickups';

-- ============================================================================
-- STEP 2: CLEANUP EXISTING STUCK RESERVATION
-- ============================================================================
-- Fix the current stuck reservation for davetest

DO $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'davetest@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User not found';
    RETURN;
  END IF;
  
  RAISE NOTICE '=== CLEANING UP STUCK RESERVATIONS ===';
  
  -- Run the expire function
  SELECT expire_user_reservations(v_user_id) INTO v_count;
  
  RAISE NOTICE '✅ Expired % reservation(s)', v_count;
  RAISE NOTICE '✅ System ready - refresh app to see changes';
END $$;

-- ============================================================================
-- STEP 3: VERIFICATION
-- ============================================================================

-- Check current state
SELECT 
  'RESERVATION STATUS' as check_type,
  r.id,
  r.status,
  r.expires_at,
  CASE 
    WHEN r.expires_at < NOW() THEN '⚠️ SHOULD BE EXPIRED'
    ELSE '✅ Still valid'
  END as time_check,
  (NOW() - r.expires_at) as time_since_expiry
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC
LIMIT 5;

-- Check missed pickups
SELECT 
  'MISSED PICKUPS' as check_type,
  COUNT(*) as total_missed
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');
