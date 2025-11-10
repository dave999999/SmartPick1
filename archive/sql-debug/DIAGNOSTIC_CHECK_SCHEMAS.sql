-- ================================================
-- DIAGNOSTIC: CHECK ACTUAL TABLE SCHEMAS
-- ================================================

-- Check achievement_definitions table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'achievement_definitions'
ORDER BY ordinal_position;

-- Check offers table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'offers'
ORDER BY ordinal_position;

-- Check partners table and their status
SELECT 
  id,
  business_name,
  status,
  user_id
FROM public.partners
ORDER BY created_at DESC
LIMIT 10;

-- Check if there are any RLS policies blocking offers INSERT
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
WHERE tablename = 'offers'
ORDER BY policyname;
