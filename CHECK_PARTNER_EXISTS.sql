-- Check if partner exists for the logged-in user
-- Replace the UUID with the actual partner_id from the error
SELECT 
  u.id as user_id,
  u.email,
  u.role,
  p.id as partner_id,
  p.business_name,
  p.status
FROM users u
LEFT JOIN partners p ON u.id = p.user_id
WHERE u.id = auth.uid();

-- Also check if the specific partner_id exists anywhere
SELECT * FROM partners WHERE id = 'e1eead65-ae68-4fcd-9dc1-45e9b99fd41f';

-- Check partner_point_transactions for this partner
SELECT * FROM partner_point_transactions 
WHERE partner_id = 'e1eead65-ae68-4fcd-9dc1-45e9b99fd41f'
ORDER BY created_at DESC
LIMIT 5;
