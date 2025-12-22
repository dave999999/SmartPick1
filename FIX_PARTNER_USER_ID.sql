-- FIX: Partner with ID 1b5f8b01-157b-4997-8f9b-411eec09b1c9 has invalid/null user_id

-- STEP 1: Find this partner and check their user_id
SELECT 
  'Partner Info' as check,
  id as partner_id,
  user_id,
  business_name,
  email,
  phone,
  CASE 
    WHEN user_id IS NULL THEN '❌ user_id is NULL - needs to be linked to auth user!'
    WHEN NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN '❌ user_id points to non-existent auth user!'
    ELSE '✅ user_id is valid'
  END as status
FROM partners
WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';

-- STEP 2: Find the matching auth user by email
SELECT 
  'Matching Auth User' as check,
  au.id as auth_user_id,
  au.email,
  au.created_at,
  p.id as partner_id,
  p.business_name
FROM partners p
LEFT JOIN auth.users au ON au.email = p.email
WHERE p.id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';

-- STEP 3: Update partner.user_id to link to correct auth user
UPDATE partners p
SET user_id = au.id
FROM auth.users au
WHERE p.id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9'
  AND au.email = p.email
  AND (p.user_id IS NULL OR p.user_id != au.id);

-- STEP 4: Verify the fix
SELECT 
  '✅ Partner Fixed' as result,
  p.id as partner_id,
  p.user_id,
  p.business_name,
  p.email,
  au.id as auth_user_id,
  au.email as auth_email,
  CASE 
    WHEN p.user_id = au.id THEN '✅ partner.user_id now correctly links to auth.users!'
    ELSE '❌ Still not linked correctly'
  END as status
FROM partners p
LEFT JOIN auth.users au ON au.id = p.user_id
WHERE p.id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';

-- STEP 5: Now test Telegram connection with CORRECT user_id
DO $$
DECLARE
  correct_user_id UUID;
BEGIN
  -- Get the correct user_id
  SELECT user_id INTO correct_user_id 
  FROM partners 
  WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';
  
  -- Show what we'll insert
  RAISE NOTICE 'Will insert connection for user_id: %', correct_user_id;
  
  -- Insert the connection
  INSERT INTO notification_preferences (user_id, telegram_chat_id, telegram_username, enable_telegram)
  VALUES (correct_user_id, '1647005461', 'McWootson', true)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    telegram_chat_id = '1647005461',
    telegram_username = 'McWootson',
    enable_telegram = true,
    updated_at = NOW();
    
  RAISE NOTICE '✅ Connection saved successfully!';
END $$;

-- STEP 6: Verify the connection was saved
SELECT 
  '🎉 SUCCESS!' as result,
  np.user_id,
  np.telegram_chat_id,
  np.telegram_username,
  p.business_name,
  p.email
FROM notification_preferences np
JOIN partners p ON p.user_id = np.user_id
WHERE p.id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';

-- FINAL MESSAGE
SELECT 
  '✅ FIXED!' as status,
  'Partner user_id has been linked to auth.users' as message,
  'Try connecting Telegram again - it will work now!' as next_step;
