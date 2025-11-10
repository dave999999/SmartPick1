-- Create admin user in the users table
-- Note: You'll need to create the actual auth user through Supabase Auth first
-- This script just updates the role to admin

-- Update existing user to admin (replace with actual user ID)
-- UPDATE users SET role = 'admin' WHERE email = 'admin@smartpick.com';

-- Or insert a new admin user record (after creating auth user)
-- INSERT INTO users (id, email, name, role, status, created_at)
-- VALUES (
--   'your-auth-user-id-here',
--   'admin@smartpick.com',
--   'Admin User',
--   'admin',
--   'ACTIVE',
--   NOW()
-- );

-- Example: Make the first user an admin
UPDATE users 
SET role = 'admin' 
WHERE id = (
  SELECT id 
  FROM users 
  ORDER BY created_at 
  LIMIT 1
);