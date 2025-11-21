-- Profile exists
SELECT id, email, created_at FROM public.users ORDER BY created_at DESC LIMIT 5;

-- Stats exists
SELECT user_id, created_at FROM public.user_stats ORDER BY created_at DESC LIMIT 5;

-- Call RPC manually for current session (optional)
SELECT (ensure_user_profile()).*;