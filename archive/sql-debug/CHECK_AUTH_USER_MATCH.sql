-- ================================================
-- FRONTEND AUTH SIMULATION TEST
-- ================================================
-- This simulates what the frontend does with proper auth context

-- First, let's check what user_id your partner has
SELECT 
  'PARTNER INFO' as info_type,
  id as partner_id,
  user_id,
  business_name,
  status,
  email
FROM public.partners
WHERE status = 'APPROVED'
ORDER BY created_at DESC;

-- Now check if there's a corresponding user in auth.users
SELECT 
  'AUTH USERS CHECK' as info_type,
  u.id as user_id,
  u.email,
  u.created_at,
  EXISTS(SELECT 1 FROM public.partners WHERE user_id = u.id) as has_partner,
  (SELECT status FROM public.partners WHERE user_id = u.id LIMIT 1) as partner_status
FROM auth.users u
ORDER BY u.created_at DESC;

-- Check the RLS policy in plain English
SELECT 
  'RLS POLICY EXPLAINED' as info,
  'The policy checks: partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid() AND status = APPROVED)' as policy,
  'This means: The partner_id in your INSERT must match a partner whose user_id equals your logged-in user AND status is APPROVED' as explanation,
  'Problem: If auth.uid() is NULL or doesnt match any partner.user_id, RLS blocks the insert' as common_issue;

-- Show all partners and their auth status
SELECT 
  'PARTNERS vs AUTH.USERS' as check_type,
  p.id as partner_id,
  p.user_id as partner_user_id,
  p.business_name,
  p.status,
  u.email as auth_email,
  CASE 
    WHEN u.id IS NULL THEN '❌ No auth.users record for this user_id!'
    WHEN p.status != 'APPROVED' THEN '❌ Partner not approved'
    ELSE '✅ Should work if logged in as ' || u.email
  END as status_explanation
FROM public.partners p
LEFT JOIN auth.users u ON u.id = p.user_id
ORDER BY p.created_at DESC;
