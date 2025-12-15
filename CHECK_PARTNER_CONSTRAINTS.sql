-- Check constraints on partners table
SELECT 
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE con.contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'x' THEN 'EXCLUDE'
  END AS constraint_type_desc,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'partners'
AND nsp.nspname = 'public'
ORDER BY con.contype, con.conname;

-- Check the specific partner record
SELECT 
  id,
  user_id,
  business_name,
  email,
  status,
  created_at
FROM partners 
WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';
