-- FINAL FIX: Remove RLS user_metadata warning by changing policy approach
-- This fixes the "admins_read_all_users" policy that causes the warning

-- Drop the problematic policy
DROP POLICY IF EXISTS "admins_read_all_users" ON public.users;

-- Option 1: Use users.role column check (SAFER but requires subquery)
CREATE POLICY "admins_read_all_users"
  ON public.users FOR SELECT
  USING (
    -- Check if current user has ADMIN role in users table
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Note: If this causes performance issues, use Option 2 below instead

-- Option 2: Remove admin RLS policy entirely and use SECURITY DEFINER functions only
-- (Uncomment if you want to use this approach)
/*
DROP POLICY IF EXISTS "admins_read_all_users" ON public.users;

-- Only keep user self-access policy
-- Admin access will go through admin_get_analytics_data() and admin_get_live_stats() functions
*/

-- Apply the fix
COMMENT ON POLICY "admins_read_all_users" ON public.users IS 
  'Admins can read all users - uses role column instead of JWT metadata to avoid security warning';
