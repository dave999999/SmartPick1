-- ================================================
-- TEST EXACT RLS SCENARIO
-- ================================================
-- Simulate exactly what happens with your specific IDs

-- Your specific partner data:
-- partner_id (partners.id): 0384c929-0af0-4124-a64a-85e63cba5f1a
-- user_id (partners.user_id): 0f069ba3-2c87-44fe-99a0-97ba74532a86
-- email: batumashvili.davit@gmail.com

-- Test if RLS would allow this specific insert
SELECT 
  'RLS CHECK FOR YOUR PARTNER' as test_type,
  '0384c929-0af0-4124-a64a-85e63cba5f1a' as partner_id_to_insert,
  EXISTS(
    SELECT 1 FROM public.partners
    WHERE partners.id = '0384c929-0af0-4124-a64a-85e63cba5f1a'::uuid
    AND partners.user_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86'::uuid
    AND partners.status::text = 'APPROVED'::text
  ) as would_rls_allow;

-- Show the RLS WITH CHECK clause
SELECT 
  'RLS POLICY WITH_CHECK' as info,
  policyname,
  with_check
FROM pg_policies
WHERE tablename = 'offers' AND cmd = 'INSERT';

-- Check if there's something wrong with data types
SELECT 
  'PARTNER DATA TYPES' as check_type,
  pg_typeof(id) as id_type,
  pg_typeof(user_id) as user_id_type,
  pg_typeof(status) as status_type,
  status,
  status::text as status_text,
  (status::text = 'APPROVED'::text) as status_equals_approved
FROM public.partners
WHERE id = '0384c929-0af0-4124-a64a-85e63cba5f1a'::uuid;
