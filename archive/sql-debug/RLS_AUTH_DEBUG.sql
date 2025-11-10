-- ================================================
-- RLS AUTHENTICATION DEBUG
-- ================================================
-- This will show EXACTLY why RLS is blocking

-- 1. Check who you are logged in as (auth context)
SELECT 
  'CURRENT AUTH USER' as check_type,
  auth.uid() as my_user_id,
  auth.jwt() ->> 'email' as my_email,
  auth.role() as my_role;

-- 2. Check your partner record
SELECT 
  'MY PARTNER RECORD' as check_type,
  id as partner_id,
  user_id as partner_user_id,
  business_name,
  status,
  email
FROM public.partners
WHERE user_id = auth.uid();

-- 3. Check if RLS policy would allow insert
SELECT 
  'RLS POLICY TEST' as check_type,
  EXISTS(
    SELECT 1 FROM public.partners 
    WHERE partners.id = p.id
    AND partners.user_id = auth.uid() 
    AND partners.status = 'APPROVED'
  ) as would_rls_allow_insert,
  p.id as partner_id,
  p.user_id as partner_user_id,
  auth.uid() as current_auth_uid,
  p.user_id = auth.uid() as user_ids_match,
  p.status as partner_status,
  p.status = 'APPROVED' as status_is_approved
FROM public.partners p
WHERE p.user_id = auth.uid();

-- 4. Show the exact RLS policy
SELECT 
  'RLS POLICY DEFINITION' as check_type,
  policyname,
  with_check as rls_check_expression
FROM pg_policies
WHERE tablename = 'offers'
AND cmd = 'INSERT';

-- 5. Try the exact same check the RLS policy does
DO $$
DECLARE
  v_partner_id UUID;
  v_auth_uid UUID;
  v_can_insert BOOLEAN;
BEGIN
  -- Get current auth user
  v_auth_uid := auth.uid();
  RAISE NOTICE 'Current auth.uid(): %', v_auth_uid;
  
  -- Get partner for this user
  SELECT id INTO v_partner_id 
  FROM public.partners 
  WHERE user_id = v_auth_uid
  LIMIT 1;
  
  RAISE NOTICE 'Partner ID: %', v_partner_id;
  
  -- Check if the RLS policy would pass
  SELECT EXISTS(
    SELECT 1 FROM public.partners 
    WHERE partners.id = v_partner_id
    AND partners.user_id = v_auth_uid
    AND partners.status::text = 'APPROVED'::text
  ) INTO v_can_insert;
  
  IF v_can_insert THEN
    RAISE NOTICE '✅ RLS CHECK PASSED - Should be able to insert';
  ELSE
    RAISE NOTICE '❌ RLS CHECK FAILED';
    
    -- Debug why it failed
    RAISE NOTICE 'Checking each condition:';
    RAISE NOTICE '  - Partner ID found: %', (v_partner_id IS NOT NULL);
    RAISE NOTICE '  - User ID matches: %', EXISTS(SELECT 1 FROM public.partners WHERE id = v_partner_id AND user_id = v_auth_uid);
    RAISE NOTICE '  - Status is APPROVED: %', EXISTS(SELECT 1 FROM public.partners WHERE id = v_partner_id AND status::text = 'APPROVED'::text);
  END IF;
END $$;

-- 6. Check if you're using the anon key or service role
SELECT 
  'AUTH CONTEXT CHECK' as check_type,
  current_setting('request.jwt.claims', true)::json ->> 'role' as jwt_role,
  CASE 
    WHEN current_setting('request.jwt.claims', true)::json ->> 'role' = 'anon' THEN '✅ Using anon key (correct for frontend)'
    WHEN current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role' THEN '⚠️ Using service_role (bypasses RLS)'
    WHEN current_setting('request.jwt.claims', true)::json ->> 'role' = 'authenticated' THEN '✅ Authenticated user (correct)'
    ELSE '❌ Unknown role'
  END as role_status;
