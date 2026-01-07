-- =========================================================
-- CHECK DAVETEST COMPLETE STATUS
-- =========================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  RAISE NOTICE '=== DAVETEST STATUS ===';
  RAISE NOTICE 'User ID: %', v_user_id;
END $$;

-- 1. Check missed pickups
SELECT 
  '1. MISSED PICKUPS' as section,
  COUNT(*) as total_count,
  MAX(warning_level) as max_warning_level,
  COUNT(*) FILTER (WHERE warning_shown = false) as unshown_warnings
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- 2. Check if there's an active penalty
SELECT 
  '2. ACTIVE PENALTIES' as section,
  id,
  penalty_type,
  offense_number,
  is_active,
  suspended_until,
  created_at
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND is_active = true;

-- 3. Check what get_user_missed_pickup_status returns
SELECT 
  '3. MISSED PICKUP STATUS FUNCTION' as section,
  *
FROM get_user_missed_pickup_status(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- 4. Check what getActivePenalty would return
SELECT 
  '4. WHAT FRONTEND SEES (getActivePenalty)' as section,
  p.*
FROM user_penalties p
WHERE p.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND p.is_active = true
  AND (p.suspended_until IS NULL OR p.suspended_until > NOW())
ORDER BY p.created_at DESC
LIMIT 1;
