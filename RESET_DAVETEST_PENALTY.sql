-- =========================================================
-- RESET DAVETEST USER PENALTY/COOLDOWN
-- =========================================================
-- Clears cooldown for testing purposes
-- =========================================================

DO $$ BEGIN RAISE NOTICE '=== RESETTING DAVETEST PENALTY ==='; END $$;

-- Find davetest user
DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get user ID
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE email = 'davetest@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User davetest@gmail.com not found';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Found user: % (ID: %)', v_user_email, v_user_id;
  
  -- Delete today's cooldown lifts (allows lifting again)
  DELETE FROM user_cooldown_lifts
  WHERE user_id = v_user_id
    AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  RAISE NOTICE '✅ Deleted today''s cooldown lifts';
  
  -- Clear today's cancellation tracking (fresh start)
  DELETE FROM user_cancellation_tracking
  WHERE user_id = v_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  RAISE NOTICE '✅ Cleared today''s cancellation records';
  
  RAISE NOTICE '🎉 DAVETEST RESET COMPLETE - Fresh start!';
END $$;

-- Verify reset
SELECT 
  u.email,
  COUNT(uct.id) as cancellations_today,
  COUNT(ucl.id) as lifts_today,
  '✅ Reset Complete' as status
FROM auth.users u
LEFT JOIN user_cancellation_tracking uct ON uct.user_id = u.id 
  AND (uct.cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE
LEFT JOIN user_cooldown_lifts ucl ON ucl.user_id = u.id
  AND (ucl.lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE
WHERE u.email = 'davetest@gmail.com'
GROUP BY u.email;

-- ✅ RESULT: davetest@gmail.com has clean slate for today
-- Can now test the cooldown system from scratch
