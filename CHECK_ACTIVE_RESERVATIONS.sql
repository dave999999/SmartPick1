-- Check active reservations for debugging
SELECT 
  r.id,
  r.status,
  r.qr_code,
  r.quantity,
  r.expires_at,
  r.created_at,
  o.title as offer_title,
  u.name as customer_name,
  u.email as customer_email,
  p.business_name as partner_name
FROM reservations r
JOIN offers o ON o.id = r.offer_id
JOIN users u ON u.id = r.customer_id  
JOIN partners p ON p.id = r.partner_id
WHERE r.status = 'ACTIVE'
ORDER BY r.created_at DESC
LIMIT 10;
