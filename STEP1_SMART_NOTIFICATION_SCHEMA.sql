-- ============================================
-- STEP 1: DATABASE SCHEMA UPDATES
-- Smart Notification System with Anti-Spam & Trust Scores
-- ============================================

-- 1.1: Create notification_queue table for batching
-- Purpose: Prevents spam by grouping multiple notifications into summaries
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type VARCHAR(50) NOT NULL, -- 'new_order', 'cancellation', 'low_stock'
  message_text TEXT NOT NULL,
  metadata JSONB, -- Store context like customer_name, offer_title, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  batch_id UUID -- Groups messages sent together
);

-- Index for fast partner lookups
CREATE INDEX idx_notification_queue_partner_pending 
ON notification_queue(partner_id, created_at) 
WHERE processed_at IS NULL;

-- Index for batch processing
CREATE INDEX idx_notification_queue_batch 
ON notification_queue(batch_id) 
WHERE batch_id IS NOT NULL;

COMMENT ON TABLE notification_queue IS 'Queues notifications for batching to prevent partner spam';
COMMENT ON COLUMN notification_queue.metadata IS 'JSON context: {customer_name, offer_title, quantity, reliability_score}';

-- 1.2: Add smart config columns to partners table
-- Purpose: Per-partner notification preferences and timing
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS low_stock_threshold INT DEFAULT 2 CHECK (low_stock_threshold >= 0),
ADD COLUMN IF NOT EXISTS batching_window_minutes INT DEFAULT 5 CHECK (batching_window_minutes >= 0),
ADD COLUMN IF NOT EXISTS batching_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS silent_hours JSONB DEFAULT '{"start": null, "end": null}'::jsonb;

COMMENT ON COLUMN partners.low_stock_threshold IS 'Trigger low stock alert when quantity <= this value (0 = disabled)';
COMMENT ON COLUMN partners.batching_window_minutes IS 'Minutes to wait before sending batched notifications (0 = instant)';
COMMENT ON COLUMN partners.batching_enabled IS 'If true, groups multiple notifications into summaries';
COMMENT ON COLUMN partners.silent_hours IS 'JSON: {start: "22:00", end: "08:00"} - no notifications during these hours';

-- Set default for existing partners
UPDATE partners 
SET 
  low_stock_threshold = 2,
  batching_window_minutes = 5,
  batching_enabled = true,
  silent_hours = '{"start": null, "end": null}'::jsonb
WHERE 
  low_stock_threshold IS NULL 
  OR batching_window_minutes IS NULL 
  OR batching_enabled IS NULL 
  OR silent_hours IS NULL;

-- 1.3: Create confirmation_status enum
-- Purpose: Track the 3-state confirmation flow (none → pending → confirmed/denied)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'confirmation_status_enum') THEN
    CREATE TYPE confirmation_status_enum AS ENUM (
      'none',              -- Normal state - not yet expired
      'pending_partner',   -- Expired, waiting for partner confirmation
      'confirmed',         -- Partner confirmed pickup happened
      'denied'            -- Partner denied - customer didn't show
    );
  END IF;
END $$;

-- 1.4: Update reservations table with robust state tracking
-- Purpose: Prevent duplicate reminders and support passive confirmation
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmation_status confirmation_status_enum DEFAULT 'none',
ADD COLUMN IF NOT EXISTS confirmation_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS confirmation_resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_confirmed BOOLEAN DEFAULT false;

COMMENT ON COLUMN reservations.reminder_sent IS 'True if 15-min pickup reminder was sent (prevents duplicates)';
COMMENT ON COLUMN reservations.confirmation_status IS 'Tracks passive confirmation flow when QR not scanned';
COMMENT ON COLUMN reservations.confirmation_requested_at IS 'When we asked partner to confirm pickup';
COMMENT ON COLUMN reservations.confirmation_resolved_at IS 'When confirmation was answered or auto-resolved';
COMMENT ON COLUMN reservations.auto_confirmed IS 'True if auto-confirmed after 24h (benefit of doubt)';

-- Index for finding pending confirmations
CREATE INDEX idx_reservations_pending_confirmation 
ON reservations(confirmation_status, confirmation_requested_at) 
WHERE confirmation_status = 'pending_partner';

-- Index for reminder tracking (commented out - check your actual column name)
-- Note: Replace 'created_at' with your actual pickup deadline column (e.g., pickup_by, expires_at, pickup_time)
-- CREATE INDEX idx_reservations_reminder_pending 
-- ON reservations(created_at, reminder_sent) 
-- WHERE status = 'active' AND reminder_sent = false;

-- 1.5: Add reliability_score to users (or create profiles table)
-- Purpose: Trust score affects notification priority and warnings
-- SAFETY: We use scores to inform partners, NOT to auto-ban users

-- Check if column exists in auth.users (not possible) or create separate table
CREATE TABLE IF NOT EXISTS public.user_reliability (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reliability_score INT DEFAULT 100 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  total_reservations INT DEFAULT 0,
  completed_pickups INT DEFAULT 0,
  missed_pickups INT DEFAULT 0,
  cancellations INT DEFAULT 0,
  late_cancellations INT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_reliability IS 'User trust scores based on pickup history - INFORMATIONAL ONLY, not punitive';
COMMENT ON COLUMN user_reliability.reliability_score IS 'Score 0-100: >95 = ⭐ trusted, <80 = ⚠️ caution, used for partner context only';

-- Index for fast lookups
CREATE INDEX idx_user_reliability_score ON user_reliability(reliability_score DESC);

-- Enable RLS
ALTER TABLE user_reliability ENABLE ROW LEVEL SECURITY;

-- Users can read their own score
CREATE POLICY "Users can view own reliability score"
  ON user_reliability FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all
CREATE POLICY "Service role can manage reliability scores"
  ON user_reliability FOR ALL
  USING (auth.role() = 'service_role');

-- Initialize scores for existing users
INSERT INTO user_reliability (user_id, reliability_score)
SELECT id, 100 
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM user_reliability)
ON CONFLICT (user_id) DO NOTHING;

-- 1.6: Create helper function to update reliability scores
-- Purpose: Automatically update scores based on user actions
CREATE OR REPLACE FUNCTION update_user_reliability_score(
  p_user_id UUID,
  p_action VARCHAR -- 'completed', 'missed', 'cancelled', 'late_cancel'
)
RETURNS void AS $$
DECLARE
  v_score_change INT;
BEGIN
  -- Initialize if not exists
  INSERT INTO user_reliability (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Calculate score change based on action
  v_score_change := CASE p_action
    WHEN 'completed' THEN 2      -- +2 for successful pickup
    WHEN 'missed' THEN -15        -- -15 for no-show (harsh but fair)
    WHEN 'cancelled' THEN -3      -- -3 for normal cancellation
    WHEN 'late_cancel' THEN -8    -- -8 for last-minute cancellation
    ELSE 0
  END;

  -- Update score (clamped between 0-100)
  UPDATE user_reliability
  SET 
    reliability_score = GREATEST(0, LEAST(100, reliability_score + v_score_change)),
    total_reservations = CASE WHEN p_action IN ('completed', 'missed') THEN total_reservations + 1 ELSE total_reservations END,
    completed_pickups = CASE WHEN p_action = 'completed' THEN completed_pickups + 1 ELSE completed_pickups END,
    missed_pickups = CASE WHEN p_action = 'missed' THEN missed_pickups + 1 ELSE missed_pickups END,
    cancellations = CASE WHEN p_action IN ('cancelled', 'late_cancel') THEN cancellations + 1 ELSE cancellations END,
    late_cancellations = CASE WHEN p_action = 'late_cancel' THEN late_cancellations + 1 ELSE late_cancellations END,
    last_updated = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_user_reliability_score IS 
  'Updates user trust score based on actions. SAFETY: Scores inform partners but do NOT auto-ban users.';

-- 1.7: Create helper view for notification context
-- Purpose: Easy lookup of all context needed for smart notifications
-- Note: Commented out r.pickup_by - replace with your actual pickup deadline column
CREATE OR REPLACE VIEW notification_context AS
SELECT 
  r.id as reservation_id,
  r.customer_id,
  r.offer_id,
  r.quantity,
  -- r.pickup_by, -- Replace with your actual column name (e.g., expires_at, pickup_time)
  r.status,
  r.confirmation_status,
  u.email as customer_email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Customer') as customer_name,
  ur.reliability_score,
  o.title as offer_title,
  o.partner_id,
  p.business_name as partner_name,
  p.notification_preferences,
  p.batching_enabled,
  p.batching_window_minutes,
  p.silent_hours
FROM reservations r
JOIN auth.users u ON u.id = r.customer_id
LEFT JOIN user_reliability ur ON ur.user_id = r.customer_id
JOIN offers o ON o.id = r.offer_id
JOIN partners p ON p.user_id = o.partner_id;

COMMENT ON VIEW notification_context IS 'Denormalized view for smart notification decisions';

-- 1.8: Verification queries
SELECT '✅ Schema Update Complete!' as status;

-- Show sample partner config
SELECT 
  business_name,
  low_stock_threshold,
  batching_window_minutes,
  batching_enabled,
  silent_hours
FROM partners LIMIT 3;

-- Show user reliability scores
SELECT 
  user_id,
  reliability_score,
  total_reservations,
  completed_pickups,
  missed_pickups
FROM user_reliability LIMIT 5;

-- Show queue table
SELECT COUNT(*) as pending_messages FROM notification_queue WHERE processed_at IS NULL;
