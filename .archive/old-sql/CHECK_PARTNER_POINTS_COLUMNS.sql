-- Check partner_points table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'partner_points'
ORDER BY ordinal_position;
