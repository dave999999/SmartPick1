-- Check for any RLS policies that might still be active
-- Run this in Supabase SQL Editor

SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('partner_points', 'partner_point_transactions')
ORDER BY tablename, policyname;
