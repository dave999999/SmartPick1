-- =====================================================
-- CHECK: Verify admin user role
-- =====================================================

-- Check all users and their roles
SELECT 
  id,
  email,
  role,
  created_at
FROM users
ORDER BY created_at DESC;

-- If you need to set a user as admin, uncomment and update the email:
-- UPDATE users 
-- SET role = 'ADMIN'
-- WHERE email = 'your-admin-email@example.com';
