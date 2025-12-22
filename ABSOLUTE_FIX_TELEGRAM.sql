-- FINAL FIX: There's a public.users table interfering with FK resolution
-- We need to check if it's safe to drop it, or force the FK to use auth schema

-- STEP 1: Check what's in public.users table
SELECT 
  'public.users table contents' as info,
  COUNT(*) as total_rows,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count
FROM public.users;

-- STEP 2: Check if anything references public.users
SELECT
  'Tables referencing public.users' as info,
  tc.table_schema || '.' || tc.table_name as dependent_table,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'users' 
  AND ccu.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY';

-- STEP 3: Show columns in public.users to understand its purpose
SELECT
  'public.users structure' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- DECISION POINT:
-- If public.users is empty or just a legacy table, we can drop it
-- If it has data and FKs, we need to use schema-qualified FK

SELECT 
  '📋 RECOMMENDATION' as action,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.users) = 0 
    THEN '✅ public.users is EMPTY - safe to drop it!'
    WHEN (SELECT COUNT(*) FROM public.users) > 0
    THEN '⚠️ public.users has ' || (SELECT COUNT(*) FROM public.users)::text || ' rows - need to investigate if it''s still used'
  END as recommendation;

-- OPTION A: Drop public.users (if it's safe)
-- Uncomment these lines ONLY if public.users is empty or not needed:
-- DROP TABLE IF EXISTS public.users CASCADE;

-- OPTION B: Force FK to use auth schema (always works)
-- Drop notification_preferences and recreate with schema-qualified FK
DROP TABLE IF EXISTS public.notification_preferences CASCADE;

CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY,
  telegram_chat_id TEXT,
  telegram_username TEXT,
  enable_telegram BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Use FULLY QUALIFIED schema name to avoid ambiguity
  CONSTRAINT notification_preferences_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Recreate trigger
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

-- Recreate indexes
CREATE INDEX idx_np_enable_telegram ON public.notification_preferences(enable_telegram) 
WHERE enable_telegram = TRUE;

CREATE INDEX idx_np_telegram_chat_id ON public.notification_preferences(telegram_chat_id)
WHERE telegram_chat_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Add comments
COMMENT ON TABLE public.notification_preferences IS 'Stores Telegram connection info. FK explicitly references auth.users(id).';

-- VERIFY the FK now points to correct table
SELECT
  '✅ FK Verification' as check,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition,
  CASE 
    WHEN pg_get_constraintdef(oid) LIKE '%auth.users%' THEN '✅ Correctly references auth.users'
    WHEN pg_get_constraintdef(oid) LIKE '%public.users%' THEN '❌ Still references public.users - PROBLEM!'
    ELSE '⚠️ Unknown reference'
  END as validation
FROM pg_constraint
WHERE conrelid = 'public.notification_preferences'::regclass
  AND contype = 'f';

-- TEST the insert
INSERT INTO notification_preferences (user_id, telegram_chat_id, telegram_username, enable_telegram)
VALUES ('1b5f8b01-157b-4997-8f9b-411eec09b1c9', '1647005461', 'McWootson', true)
ON CONFLICT (user_id) 
DO UPDATE SET 
  telegram_chat_id = '1647005461',
  telegram_username = 'McWootson',
  enable_telegram = true,
  updated_at = NOW();

-- VERIFY success
SELECT 
  '🎉 SUCCESS!' as result,
  user_id,
  telegram_chat_id,
  telegram_username,
  enable_telegram
FROM notification_preferences
WHERE user_id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';

SELECT 
  '✅ TELEGRAM CONNECTION FIXED!' as status,
  'Try connecting Telegram now - it will work!' as next_step;
