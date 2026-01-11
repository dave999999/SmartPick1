-- =========================================================
-- DELETE TODAY'S COOLDOWN LIFT FOR USER
-- Fix: Allow user to lift cooldown with points after free lift
-- =========================================================

-- Find the user and delete today's lift record
DO $$
DECLARE
  v_user_id UUID;
  v_today DATE;
  v_lift_record RECORD;
BEGIN
  -- Get user ID
  v_user_id := 'e1eead65-ae68-4fcd-9dc1-45e9b99fd41f';
  v_today := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  RAISE NOTICE '=== CHECKING TODAY''S LIFT ===';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Today (Georgia): %', v_today;
  
  -- Show existing lift record
  SELECT * INTO v_lift_record
  FROM user_cooldown_lifts
  WHERE user_id = v_user_id
    AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_today;
  
  IF v_lift_record IS NOT NULL THEN
    RAISE NOTICE '❌ Found lift record from today:';
    RAISE NOTICE '   Lift type: %', v_lift_record.lift_type;
    RAISE NOTICE '   Points spent: %', v_lift_record.points_spent;
    RAISE NOTICE '   Lifted at: %', v_lift_record.lifted_at;
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  Deleting today''s lift record...';
    
    -- Delete today's lift
    DELETE FROM user_cooldown_lifts
    WHERE user_id = v_user_id
      AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_today;
    
    RAISE NOTICE '✅ Deleted! User can now lift cooldown with points.';
  ELSE
    RAISE NOTICE '✅ No lift record found for today. User can lift cooldown.';
  END IF;
END $$;

-- Verify: Show remaining lifts for this user
SELECT 
  '📊 REMAINING LIFTS' as status,
  user_id,
  lift_type,
  points_spent,
  (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE as lift_date_georgia,
  lifted_at
FROM user_cooldown_lifts
WHERE user_id = 'e1eead65-ae68-4fcd-9dc1-45e9b99fd41f'
ORDER BY lifted_at DESC
LIMIT 5;
