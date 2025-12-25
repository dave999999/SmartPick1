-- Check reservations for ემზარას საცხობი
SELECT 
  r.id,
  r.status,
  r.created_at,
  r.picked_up_at,
  r.total_price,
  r.quantity,
  o.title as offer_name
FROM reservations r
LEFT JOIN offers o ON r.offer_id = o.id
WHERE r.partner_id = (SELECT id FROM partners WHERE business_name LIKE '%ემზარას საცხობი%')
ORDER BY r.created_at DESC
LIMIT 10;

-- Check status counts
SELECT 
  status,
  COUNT(*) as count,
  SUM(total_price) as total_revenue
FROM reservations
WHERE partner_id = (SELECT id FROM partners WHERE business_name LIKE '%ემზარას საცხობი%')
GROUP BY status;
