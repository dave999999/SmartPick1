-- Check recently created offers from ემზარას საცხობი
SELECT 
  id,
  title,
  created_at,
  pickup_start,
  pickup_end,
  expires_at,
  EXTRACT(EPOCH FROM (pickup_end - pickup_start)) / 3600 as duration_hours,
  EXTRACT(EPOCH FROM (pickup_end - pickup_start)) / 86400 as duration_days,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 as hours_until_expiry
FROM offers 
WHERE partner_id = (SELECT id FROM partners WHERE business_name LIKE '%ემზარას საცხობი%')
ORDER BY created_at DESC
LIMIT 5;
