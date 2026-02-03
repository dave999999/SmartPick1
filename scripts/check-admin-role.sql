-- Check current user's role and ID
SELECT 
  id,
  name,
  email,
  role,
  auth.uid() as current_auth_uid,
  CASE 
    WHEN role = 'ADMIN' THEN 'Role is ADMIN (correct)'
    WHEN role = 'admin' THEN 'Role is admin (lowercase - WRONG)'
    ELSE 'Role is: ' || role || ' (not admin)'
  END as role_check
FROM users
WHERE id = auth.uid();

-- Check all admin users
SELECT 
  id,
  name,
  email,
  role,
  created_at
FROM users
WHERE role ILIKE '%admin%'
ORDER BY created_at DESC;

-- Check if current user can see all users (RLS test)
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
  COUNT(CASE WHEN role = 'partner' THEN 1 END) as partners,
  COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins
FROM users;
