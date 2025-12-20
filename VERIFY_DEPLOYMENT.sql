-- =====================================================
-- QUICK STATUS CHECK - Key Results Only
-- =====================================================

-- 1. ✅ Verify all functions exist
SELECT 
  '✅ Function Exists' as status,
  routine_name as function_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'apply_cancellation_penalty',
    'partner_mark_no_show',
    'can_user_reserve',
    'auto_deactivate_expired_penalties'
  )
ORDER BY routine_name;

-- 2. ✅ Verify trigger exists
SELECT 
  '✅ Trigger Exists' as status,
  trigger_name,
  event_manipulation as fires_on,
  event_object_table as table_name
FROM information_schema.triggers
WHERE trigger_name = 'trg_apply_cancellation_penalty';

-- 3. System status summary
SELECT 
  '📊 System Status' as status,
  (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') as active_users,
  (SELECT COUNT(*) FROM users WHERE status = 'BANNED') as banned_users,
  (SELECT COUNT(*) FROM users WHERE is_suspended = true) as suspended_users,
  (SELECT COUNT(*) FROM user_penalties WHERE is_active = true) as active_penalties,
  (SELECT COUNT(*) FROM user_cancellation_tracking WHERE cancelled_at > NOW() - INTERVAL '7 days') as cancels_7d;

-- 4. Test can_user_reserve with first user
SELECT 
  '🧪 Testing can_user_reserve()' as test_name,
  can_reserve as can_reserve,
  reason as reason,
  id as tested_user_id
FROM (
  SELECT id FROM users WHERE status = 'ACTIVE' LIMIT 1
) u
CROSS JOIN LATERAL can_user_reserve(u.id);

-- =====================================================
-- ✅ DEPLOYMENT SUCCESS CONFIRMATION
-- =====================================================

SELECT 
  '🎉 DEPLOYMENT STATUS' as result,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'apply_cancellation_penalty')
     AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'partner_mark_no_show')
     AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'auto_deactivate_expired_penalties')
     AND EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_apply_cancellation_penalty')
    THEN '✅ ALL SYSTEMS OPERATIONAL'
    ELSE '⚠️ MISSING COMPONENTS'
  END as status;

-- Final message
SELECT 
  '🚀 Next Steps' as action,
  'Test in app: Create reservation → Cancel → Check for penalty' as instruction;
