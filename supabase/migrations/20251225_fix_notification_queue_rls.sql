-- Fix notification_queue RLS policy to allow authenticated users to queue notifications
-- The previous policy blocked everyone, but client-side code needs to queue notifications

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "notification_queue_service_only" ON public.notification_queue;

-- Allow authenticated users to INSERT notifications (queue them)
CREATE POLICY "notification_queue_insert_policy" 
ON public.notification_queue
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow service role to do everything (read/update/delete for processing)
CREATE POLICY "notification_queue_service_manage"
ON public.notification_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Regular users cannot read the queue (only insert)
-- This prevents users from seeing other partners' notifications
CREATE POLICY "notification_queue_no_select"
ON public.notification_queue
FOR SELECT
TO authenticated
USING (false);

COMMENT ON POLICY "notification_queue_insert_policy" ON public.notification_queue IS 
'Authenticated users can queue notifications, but cannot read them';

COMMENT ON POLICY "notification_queue_service_manage" ON public.notification_queue IS 
'Service role (Edge Functions) can process and manage the queue';
