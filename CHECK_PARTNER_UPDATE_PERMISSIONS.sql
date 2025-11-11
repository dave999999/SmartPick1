-- Check RLS policies on partners table
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
WHERE tablename = 'partners';

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'partners';

-- Test if admin can update partner status
UPDATE partners 
SET status = 'PAUSED' 
WHERE id = (SELECT id FROM partners WHERE status = 'APPROVED' LIMIT 1)
RETURNING id, business_name, status;

-- If that fails, try to see current admin permissions
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'partners'
  AND grantee = 'authenticated';
