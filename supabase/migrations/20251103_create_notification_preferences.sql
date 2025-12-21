-- Create notification_preferences table for Telegram connections
-- Allows users (customers/partners) to link their Telegram chat to receive notifications

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id TEXT,
  telegram_username TEXT,
  enable_telegram BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at fresh
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

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_np_enable_telegram ON public.notification_preferences(enable_telegram) WHERE enable_telegram = TRUE;

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can read their own notification preferences
DROP POLICY IF EXISTS "Users can read own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can read own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert/update their own row
DROP POLICY IF EXISTS "Users can upsert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can upsert own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage all
DROP POLICY IF EXISTS "Admins can manage all notification preferences" ON public.notification_preferences;
CREATE POLICY "Admins can manage all notification preferences"
  ON public.notification_preferences FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

COMMENT ON TABLE public.notification_preferences IS 'Stores Telegram connection info and preferences per user';
