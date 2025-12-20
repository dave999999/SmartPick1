-- Check point_transactions table structure and data
SELECT *
FROM point_transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY created_at DESC
LIMIT 10;
