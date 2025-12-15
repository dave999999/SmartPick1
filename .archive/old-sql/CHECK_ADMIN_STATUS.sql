-- Run this to check your admin status and fix if needed

-- 1. Check your current user role
SELECT id, email, role, created_at 
FROM users 
WHERE email = 'YOUR_EMAIL_HERE'  -- Replace with your actual email
LIMIT 1;

-- 2. If role is not 'ADMIN', update it:
-- UPDATE users 
-- SET role = 'ADMIN' 
-- WHERE email = 'YOUR_EMAIL_HERE';

-- 3. Verify maintenance setting
SELECT key, value, updated_at 
FROM system_settings 
WHERE key = 'maintenance_mode';

-- 4. Check if auth.jwt() is working (run while logged in as admin)
SELECT 
  auth.uid() as user_id,
  auth.jwt() ->> 'role' as jwt_role,
  auth.role() as auth_role;

-- 5. Temporarily disable maintenance to access site
UPDATE system_settings 
SET value = '{"enabled": false}'::jsonb,
    updated_at = NOW()
WHERE key = 'maintenance_mode';

-- After you're in, you can re-enable from the admin dashboard toggle
