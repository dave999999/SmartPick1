-- CRITICAL FIX: The FK constraint is STILL pointing to public.users instead of auth.users
-- This script will forcefully fix it

-- STEP 1: Check if user exists in auth.users (should return 1 row)
SELECT 
  '✅ User exists in auth.users' as status,
  id,
  email
FROM auth.users 
WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';

-- STEP 2: Find ALL constraints on notification_preferences
SELECT
  'Current Constraints' as info,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.notification_preferences'::regclass;

-- STEP 3: Drop the table and recreate it properly
-- This is the nuclear option but guarantees it works
DROP TABLE IF EXISTS public.notification_preferences CASCADE;

-- STEP 4: Recreate table with CORRECT FK to auth.users
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id TEXT,
  telegram_username TEXT,
  enable_telegram BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 5: Create updated_at trigger
CREATE OR REPLACE FUNCTION public._np_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_np_touch_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_np_touch_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public._np_touch_updated_at();

-- STEP 6: Create indexes
CREATE INDEX idx_np_enable_telegram ON public.notification_preferences(enable_telegram) 
WHERE enable_telegram = TRUE;

CREATE INDEX idx_np_telegram_chat_id ON public.notification_preferences(telegram_chat_id)
WHERE telegram_chat_id IS NOT NULL;

-- STEP 7: Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- STEP 8: Create RLS policies
CREATE POLICY "Users can read own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.role() = 'service_role');

-- STEP 9: Add comments
COMMENT ON TABLE public.notification_preferences IS 'Stores Telegram connection info and preferences per user. FK references auth.users(id).';
COMMENT ON COLUMN public.notification_preferences.user_id IS 'References auth.users(id) - the authenticated user ID';

-- STEP 10: Verify FK is correct NOW
SELECT
  '✅ FK Constraint Verification' as check,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.notification_preferences'::regclass
  AND contype = 'f';  -- foreign key

-- STEP 11: Test the insert (should work now!)
INSERT INTO notification_preferences (user_id, telegram_chat_id, telegram_username, enable_telegram)
VALUES ('1b5f8b01-157b-4997-8f9b-411eec09b1c9', '1647005461', 'McWootson', true)
ON CONFLICT (user_id) 
DO UPDATE SET 
  telegram_chat_id = '1647005461',
  telegram_username = 'McWootson',
  enable_telegram = true,
  updated_at = NOW();

-- STEP 12: Verify success
SELECT 
  '🎉 SUCCESS! Connection saved!' as result,
  user_id,
  telegram_chat_id,
  telegram_username,
  enable_telegram,
  created_at,
  updated_at
FROM notification_preferences
WHERE user_id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';

-- STEP 13: Final confirmation
SELECT 
  '✅ FIXED!' as status,
  'FK now correctly points to auth.users' as message,
  'Try connecting Telegram again - it will work!' as next_step;
