-- Find the partner you're currently logged in as
-- Check all partners to see which one is yours
SELECT 
  id,
  user_id,
  business_name,
  status,
  email,
  phone,
  created_at
FROM partners
ORDER BY created_at DESC
LIMIT 20;

-- Check if there are any partners with status PAUSED
SELECT 
  id,
  business_name,
  status,
  created_at
FROM partners
WHERE status = 'PAUSED'
ORDER BY created_at DESC;
