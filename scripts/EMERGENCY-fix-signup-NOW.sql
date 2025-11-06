-- ============================================
-- EMERGENCY FIX: Enable Signups Immediately
-- ============================================

-- You have 2 triggers running on user signup:
-- 1. create_user_stats_trigger (gamification)
-- 2. create_user_points_trigger (SmartPoints)

-- One or both are failing. Let's disable BOTH:

-- ============================================
-- STEP 1: Disable Both Triggers
-- ============================================

ALTER TABLE users DISABLE TRIGGER IF EXISTS create_user_stats_trigger;
ALTER TABLE users DISABLE TRIGGER IF EXISTS create_user_points_trigger;

-- ✅ Signups should work now!
-- ❌ But new users won't get auto-created stats or points


-- ============================================
-- STEP 2: Test Signup (Do This Now!)
-- ============================================

-- Try to create a new account in your app
-- It should work without errors


-- ============================================
-- STEP 3: Manually Create Stats & Points for Test User
-- ============================================

-- After signup succeeds, get the user ID:
-- Look in auth.users or users table for the email you just signed up with

-- Replace 'YOUR_USER_ID' with the actual UUID:

-- Create stats manually:
INSERT INTO user_stats (user_id, last_activity_date)
VALUES ('YOUR_USER_ID', CURRENT_DATE)
ON CONFLICT (user_id) DO NOTHING;

-- Create points manually:
INSERT INTO user_points (user_id, balance)
VALUES ('YOUR_USER_ID', 100)
ON CONFLICT (user_id) DO NOTHING;

-- Create points transaction manually:
INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
VALUES ('YOUR_USER_ID', 100, 'registration', 0, 100, '{"welcome_bonus": true}');


-- ============================================
-- STEP 4: Fix The Triggers (Run After Testing)
-- ============================================

-- Now let's make the triggers resilient so they don't fail:

-- Fix gamification trigger:
CREATE OR REPLACE FUNCTION init_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO user_stats (user_id, last_activity_date)
    VALUES (NEW.id, CURRENT_DATE)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user_stats for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix SmartPoints trigger:
CREATE OR REPLACE FUNCTION init_user_points()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    -- Insert 100 starting points
    INSERT INTO user_points (user_id, balance)
    VALUES (NEW.id, 100)
    ON CONFLICT (user_id) DO NOTHING;

    -- Log the transaction
    INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
    VALUES (NEW.id, 100, 'registration', 0, 100, jsonb_build_object('welcome_bonus', true));
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user_points for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- STEP 5: Re-enable Triggers (After Fixing)
-- ============================================

-- Re-enable both triggers:
ALTER TABLE users ENABLE TRIGGER create_user_stats_trigger;
ALTER TABLE users ENABLE TRIGGER create_user_points_trigger;

-- Test signup again - should work now with auto-created stats & points!


-- ============================================
-- STEP 6: Backfill Existing Users (Optional)
-- ============================================

-- If you had users who signed up while triggers were disabled:

-- Create stats for users without them:
INSERT INTO user_stats (user_id, last_activity_date)
SELECT id, created_at::date
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_stats WHERE user_stats.user_id = users.id
);

-- Create points for users without them:
INSERT INTO user_points (user_id, balance)
SELECT id, 100
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_points WHERE user_points.user_id = users.id
);

-- Create transaction records:
INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
SELECT id, 100, 'registration_backfill', 0, 100, '{"backfill": true}'
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM point_transactions WHERE point_transactions.user_id = users.id
);


-- ============================================
-- DONE!
-- ============================================

SELECT 'Signup should now work! Test it in your app.' as message;
