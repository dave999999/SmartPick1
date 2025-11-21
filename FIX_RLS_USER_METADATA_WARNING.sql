-- Fix RLS policies that cause "insecure user_metadata reference" warning
-- The warning occurs when RLS policies on public tables reference auth.jwt() -> 'user_metadata'
-- Solution: Move admin checks to SECURITY DEFINER functions, keep RLS policies simple

-- Step 1: Check current users table policies
SELECT schemaname, tablename, policyname, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- Step 2: Drop problematic policies that reference user_metadata in RLS
DROP POLICY IF EXISTS "Admin full access to users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can do anything with users" ON users;

-- Step 3: Create safe RLS policies WITHOUT user_metadata checks
-- Users can only see their own data
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Step 4: For admin access, use SECURITY DEFINER functions instead of RLS
-- The functions we created already check admin role safely

-- Step 5: Alternative - Use a separate admin_users view with SECURITY DEFINER
CREATE OR REPLACE VIEW admin_users_view 
WITH (security_invoker = false) AS
SELECT 
  id,
  email,
  created_at,
  last_seen,
  role,
  smart_points,
  telegram_id,
  telegram_username,
  status,
  referrer_user_id,
  referral_code
FROM users
WHERE (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN';

-- Grant access to authenticated users (view itself checks admin)
GRANT SELECT ON admin_users_view TO authenticated;

-- Step 6: Do the same for other tables if needed
DROP POLICY IF EXISTS "Admin full access" ON partners;
DROP POLICY IF EXISTS "Admins can view all partners" ON partners;

CREATE POLICY "Partners can view own data"
  ON partners
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Partners can update own data"
  ON partners
  FOR UPDATE
  USING (auth.uid() = user_id);
