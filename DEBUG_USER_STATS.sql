-- Check what columns actually exist in user_stats
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_stats'
ORDER BY ordinal_position;

-- Also check if any data exists
SELECT COUNT(*) as total_records FROM public.user_stats;

-- Show a sample record if any exist
SELECT * FROM public.user_stats LIMIT 1;
