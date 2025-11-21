-- ============================================
-- Fix Supabase Signup Error
-- Run this AFTER running diagnose-signup-error.sql
-- ============================================

-- OPTION 1: Temporarily disable problematic triggers to allow signups
-- (Use this if you need to allow signups immediately)
-- ============================================

-- Disable user_stats trigger if it's causing issues
ALTER TABLE users DISABLE TRIGGER IF EXISTS create_user_stats_trigger;

-- Disable any other triggers that might be failing
-- ALTER TABLE users DISABLE TRIGGER IF EXISTS create_smartpoints_trigger;

-- Now users can sign up, but won't get auto-created stats
-- You'll need to manually run the gamification migration later


-- OPTION 2: Fix the root cause (RECOMMENDED)
-- ============================================

-- A) Ensure user_stats table exists
-- If diagnose script showed user_stats_exists = false, run the gamification migration:
-- Copy contents of: supabase/migrations/20250106_create_gamification_tables.sql


-- B) Make sure users table has all required columns
DO $$
BEGIN
  -- Add referral_code if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
  END IF;

  -- Add referred_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE users ADD COLUMN referred_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Add penalty fields if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'penalty_count'
  ) THEN
    ALTER TABLE users ADD COLUMN penalty_count INT DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'penalty_until'
  ) THEN
    ALTER TABLE users ADD COLUMN penalty_until TIMESTAMPTZ;
  END IF;
END $$;


-- C) Fix init_user_stats function to be more resilient
CREATE OR REPLACE FUNCTION init_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only try to insert if user_stats table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stats') THEN
    INSERT INTO user_stats (user_id, last_activity_date)
    VALUES (NEW.id, CURRENT_DATE)
    ON CONFLICT (user_id) DO NOTHING; -- Don't fail if already exists
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create user_stats for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- D) Re-enable the trigger (if you disabled it in Option 1)
-- ALTER TABLE users ENABLE TRIGGER create_user_stats_trigger;


-- OPTION 3: Nuclear option - Remove all custom triggers
-- (Only use if you want to completely disable gamification for now)
-- ============================================

-- DROP TRIGGER IF EXISTS create_user_stats_trigger ON users;
-- DROP TRIGGER IF EXISTS create_smartpoints_trigger ON users;
--
-- After this, signups will work but you'll have no auto-created stats/points
-- You can manually run migrations later


-- ============================================
-- TEST SIGNUP
-- ============================================

-- After running your chosen option above, test signup from the app
-- Or test here with:

-- INSERT INTO auth.users (
--   instance_id,
--   id,
--   aud,
--   role,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   recovery_sent_at,
--   last_sign_in_at,
--   raw_app_meta_data,
--   raw_user_meta_data,
--   created_at,
--   updated_at,
--   confirmation_token,
--   email_change,
--   email_change_token_new,
--   recovery_token
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'test@example.com',
--   crypt('testpassword123', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW(),
--   '{"provider":"email","providers":["email"]}',
--   '{}',
--   NOW(),
--   NOW(),
--   '',
--   '',
--   '',
--   ''
-- );

-- ============================================
-- VERIFICATION
-- ============================================

-- After fixing, check that new users can be created:
SELECT COUNT(*) as total_users FROM users;

-- Check if user_stats are being created:
SELECT COUNT(*) as users_with_stats FROM user_stats;

-- If counts match, everything is working!
