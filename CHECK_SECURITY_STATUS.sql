-- =====================================================
-- SECURITY STATUS CHECK
-- Run this in Supabase SQL Editor to verify status
-- =====================================================

-- Check 1: Get the current function definition
SELECT 
  p.proname as function_name,
  CASE 
    WHEN prosecdef THEN '✅ SECURITY DEFINER' 
    ELSE '⚠️ SECURITY INVOKER' 
  END as security_mode,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  l.lanname as language
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'partner_mark_as_picked_up';

-- Check 2: Look for dangerous set_config in function body
-- This will show if the function contains the vulnerability
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%set_config%service_role%' 
    THEN '🚨 VULNERABLE - Contains set_config escalation'
    WHEN pg_get_functiondef(p.oid) LIKE '%set_config%jwt.claims%'
    THEN '🚨 VULNERABLE - Contains JWT manipulation'
    ELSE '✅ SAFE - No privilege escalation found'
  END as security_status,
  LENGTH(pg_get_functiondef(p.oid)) as function_size_bytes
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'partner_mark_as_picked_up';

-- Check 3: Get full function definition (for manual review)
SELECT pg_get_functiondef(p.oid) as full_function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'partner_mark_as_picked_up';

-- Check 4: Verify function permissions
SELECT 
  p.proname as function_name,
  pg_catalog.pg_get_userbyid(p.proowner) as owner,
  array_agg(
    pg_catalog.pg_get_userbyid(acl.grantee) || ': ' || acl.privilege_type
  ) as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN LATERAL (
  SELECT 
    (aclexplode(p.proacl)).grantee,
    (aclexplode(p.proacl)).privilege_type
) acl ON true
WHERE n.nspname = 'public' 
  AND p.proname = 'partner_mark_as_picked_up'
GROUP BY p.proname, p.proowner;

-- =====================================================
-- INTERPRETATION GUIDE
-- =====================================================
-- 
-- Check 1 - Should show:
--   ✅ function_name: partner_mark_as_picked_up
--   ✅ security_mode: SECURITY DEFINER
--   ✅ arguments: p_reservation_id uuid
--   ✅ return_type: TABLE(...)
--   ✅ language: plpgsql
--
-- Check 2 - Should show:
--   ✅ SAFE - No privilege escalation found
--   🚨 If shows VULNERABLE: Apply the migration IMMEDIATELY
--
-- Check 3 - Manual review:
--   ✅ Look for ownership checks: IF v_reservation.partner_id != v_partner_id
--   ✅ Should NOT contain: set_config('request.jwt.claims'
--   ✅ Should NOT contain: json_build_object('role', 'service_role')
--
-- Check 4 - Permissions should show:
--   ✅ owner: postgres (or your superuser)
--   ✅ permissions should include 'authenticated: EXECUTE'
--
-- =====================================================
