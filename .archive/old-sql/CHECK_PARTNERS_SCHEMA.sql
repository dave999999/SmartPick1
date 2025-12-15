-- Quick check to see what columns exist in partners table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'partners'
ORDER BY ordinal_position;
