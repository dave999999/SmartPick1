-- Quick check to see what columns exist in offers table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'offers'
ORDER BY ordinal_position;
