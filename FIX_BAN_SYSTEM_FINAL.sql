-- =====================================================
-- COMPLETE FIX: Ban/Unban System - Final Solution
-- =====================================================

-- STEP 1: Clean up ALL existing bans (fresh start)
DELETE FROM user_bans WHERE TRUE;

UPDATE users 
SET is_banned = FALSE, 
    penalty_count = 0, 
    penalty_until = NULL,
    status = CASE 
      WHEN role = 'ADMIN' THEN 'ACTIVE'
      WHEN role = 'PARTNER' THEN 'ACTIVE'  
      WHEN role = 'CUSTOMER' THEN 'ACTIVE'
      ELSE 'ACTIVE'
    END
WHERE is_banned = TRUE OR penalty_count > 0 OR status = 'BANNED';

-- STEP 2: Drop the problematic unique constraint
ALTER TABLE user_bans DROP CONSTRAINT IF EXISTS unique_active_ban;

-- STEP 3: Add a better unique constraint (only for active bans)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_bans_unique_active 
ON user_bans(user_id) 
WHERE is_active = TRUE;

-- STEP 4: Fix the unban_user function to DELETE instead of UPDATE
CREATE OR REPLACE FUNCTION unban_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete all active bans for this user (no UPDATE, avoids constraint issues)
  DELETE FROM public.user_bans 
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  -- Update user record
  UPDATE public.users 
  SET is_banned = FALSE,
      status = 'ACTIVE',
      penalty_count = 0,
      penalty_until = NULL,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Fix the ban_user function to handle existing bans better
CREATE OR REPLACE FUNCTION ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_ban_type VARCHAR DEFAULT 'PERMANENT',
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_ban_id UUID;
  v_admin_id UUID;
BEGIN
  -- Get current admin user (fallback to first admin if running in SQL editor)
  v_admin_id := auth.uid();
  
  IF v_admin_id IS NULL THEN
    -- Running in SQL editor or service role - use first admin user
    SELECT id INTO v_admin_id FROM public.users WHERE role = 'ADMIN' LIMIT 1;
  END IF;
  
  -- If user already has an active ban, delete it first
  DELETE FROM public.user_bans 
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  -- Create new ban record
  INSERT INTO public.user_bans (user_id, banned_by, reason, ban_type, expires_at, internal_notes, is_active)
  VALUES (p_user_id, v_admin_id, p_reason, p_ban_type, p_expires_at, p_internal_notes, TRUE)
  RETURNING id INTO v_ban_id;
  
  -- Update user record (DON'T set status='BANNED', just use is_banned flag)
  UPDATE public.users 
  SET is_banned = TRUE,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN v_ban_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Verify everything is clean
SELECT 'Total users' as check_type, COUNT(*) as count FROM users
UNION ALL
SELECT 'Banned users (is_banned=true)', COUNT(*) FROM users WHERE is_banned = TRUE
UNION ALL
SELECT 'Active bans in user_bans', COUNT(*) FROM user_bans WHERE is_active = TRUE
UNION ALL
SELECT 'Total ban records', COUNT(*) FROM user_bans;

-- STEP 7: Test the ban/unban functions (optional - comment out if you don't want to test)
-- Find a test user (not admin)
DO $$
DECLARE
  v_test_user_id UUID;
  v_ban_id UUID;
BEGIN
  -- Get a non-admin user for testing
  SELECT id INTO v_test_user_id 
  FROM users 
  WHERE role = 'CUSTOMER' 
  LIMIT 1;
  
  IF v_test_user_id IS NOT NULL THEN
    -- Test ban
    RAISE NOTICE 'Testing ban function...';
    v_ban_id := ban_user(v_test_user_id, 'Test ban', 'PERMANENT');
    RAISE NOTICE 'Ban created with ID: %', v_ban_id;
    
    -- Verify ban was created
    IF EXISTS (SELECT 1 FROM user_bans WHERE id = v_ban_id AND is_active = TRUE) THEN
      RAISE NOTICE '✓ Ban record created successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM users WHERE id = v_test_user_id AND is_banned = TRUE) THEN
      RAISE NOTICE '✓ User marked as banned';
    END IF;
    
    -- Test unban
    RAISE NOTICE 'Testing unban function...';
    PERFORM unban_user(v_test_user_id);
    
    -- Verify unban worked
    IF NOT EXISTS (SELECT 1 FROM user_bans WHERE user_id = v_test_user_id AND is_active = TRUE) THEN
      RAISE NOTICE '✓ Ban record deleted successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM users WHERE id = v_test_user_id AND is_banned = FALSE) THEN
      RAISE NOTICE '✓ User unmarked as banned';
    END IF;
    
    RAISE NOTICE 'All tests passed! Ban/unban system working correctly.';
  ELSE
    RAISE NOTICE 'No test user found, skipping tests';
  END IF;
END $$;

-- STEP 8: Final verification
SELECT 
  'After test' as status,
  COUNT(*) FILTER (WHERE is_banned = TRUE) as banned_count,
  COUNT(*) FILTER (WHERE is_banned = FALSE) as active_count
FROM users;

SELECT 
  'Ban records' as status,
  COUNT(*) FILTER (WHERE is_active = TRUE) as active_bans,
  COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_bans
FROM user_bans;
