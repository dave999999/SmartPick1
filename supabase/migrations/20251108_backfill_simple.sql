-- Check how many profiles are now in sync
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS auth_total,
  (SELECT COUNT(*) FROM public.users) AS profile_total,
  (SELECT COUNT(*) FROM public.user_points) AS points_total;

-- Find any remaining auth users without profiles (should be zero)
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.users p ON p.id = u.id
WHERE p.id IS NULL;