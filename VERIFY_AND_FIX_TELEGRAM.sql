-- STEP 1: Verify the user exists in auth.users
SELECT 
  'User Verification' as check,
  id,
  email,
  created_at
FROM auth.users 
WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';

-- STEP 2: Check current FK constraint
SELECT
  'Current FK Constraint' as check,
  tc.constraint_name,
  ccu.table_schema || '.' || ccu.table_name as references_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'notification_preferences'
  AND tc.table_schema = 'public';

-- STEP 3: Fix the FK constraint
-- Drop the old constraint
ALTER TABLE public.notification_preferences 
DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;

-- Add correct constraint pointing to auth.users
ALTER TABLE public.notification_preferences
ADD CONSTRAINT notification_preferences_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- STEP 4: Verify the fix
SELECT
  'Fixed FK Constraint' as check,
  tc.constraint_name,
  ccu.table_schema || '.' || ccu.table_name as references_table,
  '✅ Should be auth.users' as expected
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'notification_preferences'
  AND tc.table_schema = 'public';

-- STEP 5: Test the insert (should work now!)
INSERT INTO notification_preferences (user_id, telegram_chat_id, telegram_username, enable_telegram)
VALUES ('1b5f8b01-157b-4997-8f9b-411eec09b1c9', '1647005461', 'McWootson', true)
ON CONFLICT (user_id) 
DO UPDATE SET 
  telegram_chat_id = '1647005461',
  telegram_username = 'McWootson',
  enable_telegram = true,
  updated_at = NOW();

-- STEP 6: Verify the connection was saved
SELECT 
  '✅ Connection Saved!' as result,
  user_id,
  telegram_chat_id,
  telegram_username,
  enable_telegram,
  created_at
FROM notification_preferences
WHERE user_id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';
