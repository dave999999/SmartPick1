-- Check available tables for cancellation tracking
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%cancel%' 
  OR table_name LIKE '%cooldown%'
ORDER BY table_name;

-- Also check for reservation related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%reserv%'
ORDER BY table_name;
