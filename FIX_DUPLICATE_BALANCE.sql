-- Fix the balance mismatch for batuamshvili.davit@gmail.com
-- Current: 100 in user_points + 100 in partner_points = 200 total
-- Should be: 805 (based on transaction history)

-- Step 1: Delete the user_points record (we use partner_points for partners)
DELETE FROM user_points 
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid;

-- Step 2: Update partner_points to the correct balance from transactions
UPDATE partner_points 
SET balance = (
  SELECT COALESCE(SUM(change), 0) 
  FROM point_transactions 
  WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid
),
updated_at = NOW()
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid;

-- Step 3: Verify the fix
SELECT 
  'After Fix' as status,
  COALESCE(up.balance, 0) as user_points_balance,
  pp.balance as partner_points_balance,
  (SELECT COALESCE(SUM(change), 0) FROM point_transactions WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid) as transaction_sum
FROM partner_points pp
LEFT JOIN user_points up ON up.user_id = pp.user_id
WHERE pp.user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'::uuid;
