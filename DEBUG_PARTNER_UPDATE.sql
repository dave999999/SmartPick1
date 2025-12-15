-- =====================================================
-- DEBUG: Check what's blocking the partner update
-- =====================================================

-- 1. Check current partner status
SELECT 
  id,
  user_id,
  business_name,
  email,
  status,
  created_at,
  updated_at
FROM partners 
WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';

-- 2. Check all RLS policies on partners table
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies 
WHERE tablename = 'partners'
ORDER BY cmd, policyname;

-- 3. Check for triggers on partners table
SELECT 
  tgname AS trigger_name,
  tgtype AS trigger_type,
  tgenabled AS enabled,
  proname AS function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'public.partners'::regclass
ORDER BY tgname;

-- 4. Check for unique constraints
SELECT 
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'partners'
AND con.contype IN ('u', 'p')
ORDER BY con.conname;

-- 5. Try the actual update that's failing (as your admin user)
-- UPDATE partners 
-- SET status = 'APPROVED'
-- WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';
