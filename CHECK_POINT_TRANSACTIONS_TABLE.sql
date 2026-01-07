-- Check point_transactions table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'point_transactions'
ORDER BY ordinal_position;
