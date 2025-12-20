-- Test what the function actually sees

-- First, verify partner status
SELECT 
  'Partner Status' as test,
  EXISTS (
    SELECT 1 FROM partners 
    WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid
    AND status = 'APPROVED'
  ) as is_partner;

-- Second, check what balance it would read
SELECT 
  'Balance Check' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM partners 
      WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid
      AND status = 'APPROVED'
    ) THEN 'partner_points'
    ELSE 'user_points'
  END as table_to_use,
  (SELECT balance FROM partner_points WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid) as partner_balance,
  (SELECT balance FROM user_points WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid) as user_balance;

-- Third, verify the partner_points record exists
SELECT 
  'Partner Points Record' as test,
  user_id,
  balance,
  offer_slots,
  created_at,
  updated_at
FROM partner_points 
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid;
