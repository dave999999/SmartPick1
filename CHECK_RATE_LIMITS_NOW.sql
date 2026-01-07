-- =========================================================
-- CHECK CURRENT RATE LIMITS FOR DAVETEST
-- =========================================================

-- Get user ID
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  RAISE NOTICE 'User ID: %', v_user_id;
END $$;

-- Check rate_limits table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rate_limits'
ORDER BY ordinal_position;

-- Check all rate limit entries for this user (select all columns)
SELECT *
FROM rate_limits
WHERE identifier = (SELECT id::text FROM auth.users WHERE email = 'davetest@gmail.com')
   OR key LIKE '%' || (SELECT id::text FROM auth.users WHERE email = 'davetest@gmail.com') || '%'
ORDER BY created_at DESC;

-- Check if there are any reservation-related rate limits
SELECT *
FROM rate_limits
WHERE key LIKE 'reservation:%'
ORDER BY created_at DESC
LIMIT 20;
