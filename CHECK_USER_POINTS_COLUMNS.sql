-- Check what columns exist in user_points table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_points'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- This will show us what columns are actually in the table
