-- Check partner_point_transactions schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'partner_point_transactions'
ORDER BY ordinal_position;
