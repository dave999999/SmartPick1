-- Fix: Admin approval blocked by restrictive WITH CHECK clause on users_manage_own_partner policy
-- Problem: users_manage_own_partner has WITH CHECK that prevents ANY status changes
-- Solution: Add explicit WITH CHECK to admins_full_access and fix users_manage_own_partner

-- Step 1: Drop and recreate admins_full_access with explicit WITH CHECK
DROP POLICY IF EXISTS "admins_full_access" ON public.partners;

CREATE POLICY "admins_full_access" 
ON public.partners 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  )
);

-- Step 2: Fix users_manage_own_partner to allow status changes for own partner
DROP POLICY IF EXISTS "users_manage_own_partner" ON public.partners;

CREATE POLICY "users_manage_own_partner" 
ON public.partners 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Reset partner to PENDING to test approval from dashboard
UPDATE partners 
SET status = 'PENDING' 
WHERE id = 'bcc49af1-5e95-469b-8552-b1ebd6e68f4e';
