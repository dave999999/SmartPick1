-- Add explicit policy for service role to manage notification_preferences
-- This ensures the telegram webhook can update records even with RLS enabled

-- Service role can do anything (bypasses RLS by default, but being explicit)
DROP POLICY IF EXISTS "Service role can manage all notification preferences" ON public.notification_preferences;
CREATE POLICY "Service role can manage all notification preferences"
  ON public.notification_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Also ensure authenticated role can upsert (for webhook edge function)
DROP POLICY IF EXISTS "Authenticated can upsert notification preferences" ON public.notification_preferences;
CREATE POLICY "Authenticated can upsert notification preferences"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notification_preferences';
