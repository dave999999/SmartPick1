-- Check the exact status of the test partner
SELECT 
  id,
  business_name,
  status,
  user_id,
  created_at
FROM partners
WHERE id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';

-- Also check if they somehow have a partner_points record already
SELECT 
  user_id,
  balance,
  offer_slots,
  created_at
FROM partner_points
WHERE user_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';
