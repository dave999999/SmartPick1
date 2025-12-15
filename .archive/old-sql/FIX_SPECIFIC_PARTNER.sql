-- =====================================================
-- DEBUG: Check specific partner that can't be unpaused
-- =====================================================
-- Partner: ეშმარის საცხობი (batumashvili.davit@gmail.com)

-- STEP 1: Find this partner and check all details
SELECT 
  id,
  business_name,
  status,
  user_id,
  email,
  phone,
  created_at,
  approved_at
FROM public.partners
WHERE email = 'batumashvili.davit@gmail.com'
   OR phone = '+995557737399'
   OR business_name LIKE '%ეშმარის%';

-- STEP 2: Check if this partner has a user_id
SELECT 
  p.id as partner_id,
  p.business_name,
  p.status,
  p.user_id,
  p.email,
  u.id as auth_user_id,
  u.email as auth_email,
  u.role as auth_role
FROM public.partners p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE p.email = 'batumashvili.davit@gmail.com'
   OR p.phone = '+995557737399'
   OR p.business_name LIKE '%ეშმარის%';

-- STEP 3: Check for any RLS policies still on partners table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'partners'
ORDER BY policyname;

-- STEP 4: Check if RLS is enabled on partners table
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'partners';

-- STEP 5: Try to update this specific partner (should work if RLS is disabled)
UPDATE partners 
SET status = 'APPROVED',
    approved_at = NOW()
WHERE email = 'batumashvili.davit@gmail.com'
   OR phone = '+995557737399'
   OR business_name LIKE '%ეშმარის%'
RETURNING id, business_name, status, user_id, email;

-- STEP 6: If above fails, disable RLS and try again
ALTER TABLE public.partners DISABLE ROW LEVEL SECURITY;

-- STEP 7: Drop ALL policies (in case some still exist)
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'partners'
  )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.partners';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- STEP 8: Try update again
UPDATE partners 
SET status = 'APPROVED',
    approved_at = NOW()
WHERE email = 'batumashvili.davit@gmail.com'
   OR phone = '+995557737399'
RETURNING id, business_name, status, user_id, email;

-- STEP 9: Check all partners status
SELECT 
  business_name,
  status,
  user_id,
  email,
  approved_at
FROM public.partners
ORDER BY created_at DESC;
