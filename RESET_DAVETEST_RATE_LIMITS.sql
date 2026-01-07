-- =========================================================
-- RESET RATE LIMITS FOR DAVETEST
-- =========================================================
-- Run this in Supabase SQL Editor when getting rate limit errors
-- =========================================================

DO $$
DECLARE
  v_user_id UUID;
  v_deleted_count INT;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'davetest@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User davetest@gmail.com not found';
    RETURN;
  END IF;
  
  RAISE NOTICE '=== RESETTING RATE LIMITS FOR DAVETEST ===';
  RAISE NOTICE 'User ID: %', v_user_id;

  -- Delete ALL rate limits for this user (by identifier)
  DELETE FROM rate_limits 
  WHERE identifier = v_user_id::text;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % rate limit records', v_deleted_count;
  
  -- Also clear any reservation-specific rate limits by key pattern
  DELETE FROM rate_limits 
  WHERE key LIKE 'reservation:' || v_user_id::text || ':%';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % reservation rate limits', v_deleted_count;
  
  RAISE NOTICE '✅ Rate limits cleared - you can make reservations now!';
END $$;

-- Verify - should show 0 remaining limits for davetest
SELECT 
  COUNT(*) as remaining_limits,
  action,
  MAX(created_at) as last_attempt
FROM rate_limits
WHERE identifier = (SELECT id::text FROM auth.users WHERE email = 'davetest@gmail.com')
GROUP BY action;
