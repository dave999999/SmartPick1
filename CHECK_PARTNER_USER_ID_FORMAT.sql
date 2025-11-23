-- Check what user_id actually contains for this partner
SELECT 
  p.id as partner_id,
  p.email,
  p.user_id,
  p.status,
  u.email as auth_email,
  LENGTH(p.user_id) as user_id_length,
  CASE 
    WHEN p.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'Valid UUID'
    WHEN p.user_id LIKE '%@%' THEN 'EMAIL FOUND!'
    ELSE 'Invalid Format'
  END as user_id_format
FROM partners p
LEFT JOIN auth.users u ON u.id = p.user_id::uuid
WHERE p.email = 'batumashvili.davit@gmail.com';
