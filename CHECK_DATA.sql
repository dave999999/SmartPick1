-- Check ALL partners (any status) to see what status values exist
SELECT 
  id,
  business_name,
  latitude,
  longitude,
  status
FROM partners
ORDER BY business_name;

-- Check ALL offers (any status) to see what status values exist
SELECT 
  o.id,
  o.title,
  o.status,
  o.quantity_available,
  o.expires_at,
  o.expires_at > NOW() as is_not_expired,
  p.business_name,
  p.status as partner_status,
  p.latitude,
  p.longitude
FROM offers o
INNER JOIN partners p ON o.partner_id = p.id
ORDER BY p.business_name, o.title;
