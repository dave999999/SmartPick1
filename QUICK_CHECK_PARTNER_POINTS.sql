-- Quick check: What columns does partner_points actually have?
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'partner_points'
ORDER BY ordinal_position;

-- Also check if the table even exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'partner_points'
) as table_exists;
