-- Test Telegram Integration
-- Run this in Supabase SQL Editor to diagnose Telegram connection issues

-- 1. Check if notification_preferences table exists
SELECT 'Checking notification_preferences table...' as status;
SELECT COUNT(*) as total_rows FROM public.notification_preferences;

-- 2. Check sample records
SELECT 
    user_id,
    telegram_chat_id,
    telegram_username,
    enable_telegram,
    created_at,
    updated_at
FROM public.notification_preferences
ORDER BY updated_at DESC
LIMIT 10;

-- 3. Check for users with Telegram enabled but missing chat_id
SELECT 
    'Users with Telegram enabled but no chat_id' as issue,
    COUNT(*) as count
FROM public.notification_preferences
WHERE enable_telegram = true AND telegram_chat_id IS NULL;

-- 4. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'notification_preferences'
ORDER BY policyname;

-- 5. Check if users exist for notification_preferences
SELECT 
    'Orphaned notification_preferences (no user)' as issue,
    COUNT(*) as count
FROM public.notification_preferences np
LEFT JOIN public.users u ON np.user_id = u.id
WHERE u.id IS NULL;

-- 6. Test user access (replace with actual user ID to test)
-- Replace 'YOUR-USER-ID-HERE' with actual UUID
-- SELECT 
--     np.*,
--     u.email,
--     u.name
-- FROM public.notification_preferences np
-- JOIN public.users u ON np.user_id = u.id
-- WHERE np.user_id = 'YOUR-USER-ID-HERE';

-- 7. Check Edge Function deployment status
SELECT 'Check if telegram-webhook function is deployed in Supabase Dashboard > Edge Functions' as note;
