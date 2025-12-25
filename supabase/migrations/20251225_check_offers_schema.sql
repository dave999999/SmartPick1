-- Check offers table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'offers' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
