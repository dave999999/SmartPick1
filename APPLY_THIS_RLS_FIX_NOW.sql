-- CRITICAL FIX: Allow service role to bypass RLS for notification_preferences
-- The telegram webhook uses service role but RLS is blocking it

-- Remove existing restrictive policies
DROP POLICY IF EXISTS "Users can read own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can upsert own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Admins can manage all notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Service role can manage all notification preferences" ON public.notification_preferences;

-- Create permissive policies that work with service role

-- 1. Allow service role full access (this is what the webhook uses)
CREATE POLICY "Service role bypass RLS"
  ON public.notification_preferences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Allow users to manage their own preferences
CREATE POLICY "Users manage own preferences"
  ON public.notification_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify the policies are applied
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies 
WHERE tablename = 'notification_preferences'
ORDER BY policyname;
