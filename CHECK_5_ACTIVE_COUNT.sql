-- Check 5: ACTIVE count (exact match)
SELECT 
  '5️⃣ FRONTEND QUERY' as check_step,
  COUNT(*) as active_count
FROM reservations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';
