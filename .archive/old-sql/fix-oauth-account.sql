-- Check the account status
SELECT 
    id,
    email,
    encrypted_password,
    app_metadata,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE email = 'davitbatumashvili@gmail.com';

-- If the account has both password and OAuth, remove the password
-- This will restore pure OAuth authentication
UPDATE auth.users
SET encrypted_password = NULL,
    updated_at = NOW()
WHERE email = 'davitbatumashvili@gmail.com'
AND app_metadata->>'provider' = 'google';

-- Verify the fix
SELECT 
    id,
    email,
    encrypted_password IS NULL as is_oauth_only,
    app_metadata->>'provider' as provider
FROM auth.users
WHERE email = 'davitbatumashvili@gmail.com';
