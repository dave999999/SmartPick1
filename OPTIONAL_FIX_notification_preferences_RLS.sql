-- Optional Security Hardening: Restrict notification_preferences INSERT policy
-- This prevents users from pre-setting fake telegram_chat_id values
-- Very low risk issue, but good security practice

BEGIN;

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Users can upsert own notification preferences" ON public.notification_preferences;

-- New restrictive policy: Users can only insert if NOT setting Telegram data
CREATE POLICY "Users can create preferences without telegram data"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND telegram_chat_id IS NULL 
    AND telegram_username IS NULL
  );

-- Allow service role (telegram webhook) to insert anything
CREATE POLICY "Service role can insert notification preferences"
  ON public.notification_preferences FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Keep existing UPDATE policy (users can update their own)
-- No changes needed for UPDATE policy

COMMIT;

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'notification_preferences' 
ORDER BY policyname;
