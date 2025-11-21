-- Run this in Supabase SQL Editor to verify migration worked:
-- https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/sql/new

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('password_reset_tokens', 'email_rate_limits', 'email_verification_tokens');

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_by_email', 'check_email_rate_limit');
