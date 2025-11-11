-- ============================================================================
-- CHECK: What columns exist in the offers table?
-- ============================================================================

-- Check the actual structure of the offers table
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'offers' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- This will show us the exact column names in the offers table
-- We need to know if it's called 'partner_id', 'user_id', or something else
