-- Verify and Fix Referral System in Database
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CHECK CURRENT STATE
-- ============================================

-- Check if referral columns exist in users table
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('referral_code', 'referred_by')
ORDER BY column_name;

-- Expected: Both columns should exist
-- referral_code | text | YES
-- referred_by   | uuid | YES

-- ============================================
-- 2. CHECK EXISTING USERS
-- ============================================

-- Check how many users have referral codes
SELECT
  'Total users' as status,
  COUNT(*) as count
FROM users
UNION ALL
SELECT
  'With referral codes' as status,
  COUNT(*) as count
FROM users
WHERE referral_code IS NOT NULL
UNION ALL
SELECT
  'Without referral codes' as status,
  COUNT(*) as count
FROM users
WHERE referral_code IS NULL;

-- ============================================
-- 3. VIEW EXISTING REFERRAL CODES
-- ============================================

-- Show users with their referral codes
SELECT
  id,
  email,
  referral_code,
  referred_by,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 4. CHECK REFERRAL FUNCTIONS
-- ============================================

-- Verify functions exist
SELECT
  proname as function_name,
  prokind as kind,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname IN (
  'generate_referral_code',
  'apply_referral_code_with_rewards',
  'auto_generate_referral_code'
)
ORDER BY proname;

-- Expected:
-- apply_referral_code_with_rewards | f | jsonb
-- auto_generate_referral_code      | f | trigger
-- generate_referral_code           | f | text

-- ============================================
-- 5. CHECK TRIGGERS
-- ============================================

-- Verify auto-generation trigger is active
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgname = 'auto_generate_referral_code_trigger';

-- Expected: Enabled = 'O' (origin)

-- ============================================
-- 6. BACKFILL REFERRAL CODES (IF NEEDED)
-- ============================================

-- Generate referral codes for existing users who don't have one
-- This is safe to run multiple times
DO $$
DECLARE
  v_user RECORD;
  v_code TEXT;
  v_count INT := 0;
BEGIN
  FOR v_user IN SELECT id FROM users WHERE referral_code IS NULL
  LOOP
    v_code := (SELECT generate_referral_code());
    UPDATE users SET referral_code = v_code WHERE id = v_user.id;
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled % referral codes', v_count;
END $$;

-- ============================================
-- 7. VERIFY BACKFILL WORKED
-- ============================================

-- Should show 0 users without codes now
SELECT
  'Total users' as status,
  COUNT(*) as count
FROM users
UNION ALL
SELECT
  'With referral codes' as status,
  COUNT(*) as count
FROM users
WHERE referral_code IS NOT NULL
UNION ALL
SELECT
  'Without referral codes' as status,
  COUNT(*) as count
FROM users
WHERE referral_code IS NULL;

-- ============================================
-- 8. CHECK REFERRAL STATISTICS
-- ============================================

-- Show users who have referred others
SELECT
  u.email,
  u.referral_code,
  us.total_referrals,
  (
    SELECT COUNT(*)
    FROM users u2
    WHERE u2.referred_by = u.id
  ) as actual_referrals
FROM users u
LEFT JOIN user_stats us ON us.user_id = u.id
WHERE us.total_referrals > 0
   OR EXISTS (SELECT 1 FROM users u2 WHERE u2.referred_by = u.id)
ORDER BY us.total_referrals DESC NULLS LAST
LIMIT 10;

-- ============================================
-- 9. CHECK REFERRAL POINT TRANSACTIONS
-- ============================================

-- Show recent referral rewards
SELECT
  pt.user_id,
  u.email,
  pt.amount,
  pt.reason,
  pt.metadata,
  pt.created_at
FROM point_transactions pt
JOIN users u ON u.id = pt.user_id
WHERE pt.reason = 'referral'
ORDER BY pt.created_at DESC
LIMIT 10;

-- ============================================
-- 10. TEST REFERRAL CODE GENERATION
-- ============================================

-- Generate a test referral code
SELECT generate_referral_code() as test_code;

-- Should return a 6-character alphanumeric code

-- ============================================
-- SUCCESS CRITERIA
-- ============================================

-- ✅ All users should have referral_code (not null)
-- ✅ All referral_code values should be unique
-- ✅ Functions generate_referral_code, apply_referral_code_with_rewards exist
-- ✅ Trigger auto_generate_referral_code_trigger is enabled
-- ✅ New users automatically get referral codes

-- ============================================
-- MANUAL TEST INSTRUCTIONS
-- ============================================

/*
FRONTEND TESTING:

1. Go to https://smartpick.ge and login
2. Navigate to Profile page → Referral tab
3. You should see:
   - Your 6-character referral code (e.g., "ABC123")
   - Share button to copy link
   - Total referrals count
   - Rewards info: +50 points for you, +50 for friend

4. Copy your referral link (e.g., https://smartpick.ge?ref=ABC123)

5. Open in incognito browser:
   - Link should open homepage
   - Toast message: "🎁 Referral code ABC123 applied!"
   - Click "Sign In" → "Sign Up" tab
   - Referral code field should be pre-filled with "ABC123"

6. Complete signup with new account:
   - New user gets 100 welcome points (from trigger)
   - Referrer (you) gets 50 referral points
   - Toast: "🎉 Account created! Welcome bonus: 100 points. Your friend received 50 points!"

7. Verify in database:
   - New user's referred_by field points to your user_id
   - Your user_stats.total_referrals increased by 1
   - Point transaction created with reason='referral', amount=50

8. Check Profile → Referral tab:
   - "Friends Referred" count should increase
   - Achievement progress may update (Friend Magnet, Influencer)
*/
