-- Check RLS policies on achievement_definitions table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd, -- SELECT, INSERT, UPDATE, DELETE
    qual, -- USING clause
    with_check -- WITH CHECK clause
FROM pg_policies
WHERE tablename = 'achievement_definitions'
AND schemaname = 'public';

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'achievement_definitions'
AND schemaname = 'public';
