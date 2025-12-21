-- Fix Telegram connection error: "Error connecting your account"
-- Issue: notification_preferences table references wrong users table
-- This script drops and recreates the table with correct foreign key to auth.users

-- Step 1: Drop the existing table (this will delete any existing connections!)
-- If you want to preserve existing data, backup first:
-- CREATE TABLE notification_preferences_backup AS SELECT * FROM notification_preferences;

DROP TABLE IF EXISTS public.notification_preferences CASCADE;

-- Step 2: Recreate with correct foreign key to auth.users (not public.users)
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id TEXT,
  telegram_username TEXT,
  enable_telegram BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Create updated_at trigger
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

-- Step 4: Create indexes
CREATE INDEX idx_np_enable_telegram ON public.notification_preferences(enable_telegram) 
WHERE enable_telegram = TRUE;

CREATE INDEX idx_np_telegram_chat_id ON public.notification_preferences(telegram_chat_id)
WHERE telegram_chat_id IS NOT NULL;

-- Step 5: Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
-- Users can read their own notification preferences
CREATE POLICY "Users can read own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own row
CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own row
CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all (for Telegram webhook edge function)
CREATE POLICY "Service role can manage all notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.role() = 'service_role');

-- Step 7: Add helpful comment
COMMENT ON TABLE public.notification_preferences IS 'Stores Telegram connection info and preferences per user. Foreign key references auth.users(id).';
COMMENT ON COLUMN public.notification_preferences.user_id IS 'References auth.users(id) - the authenticated user ID';
COMMENT ON COLUMN public.notification_preferences.telegram_chat_id IS 'Telegram chat ID for sending notifications';

-- Step 8: Verify the fix
SELECT 
  'notification_preferences table recreated successfully!' as status,
  'Foreign key now references auth.users(id)' as fix,
  'Try connecting Telegram again from partner dashboard' as next_step;
