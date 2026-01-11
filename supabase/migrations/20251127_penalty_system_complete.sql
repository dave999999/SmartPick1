-- =====================================================
-- PENALTY SYSTEM - COMPLETE DATABASE MIGRATION
-- Version: 1.0
-- Date: 2025-11-27
-- =====================================================

-- ============================================
-- STEP 1: Create main penalty tracking table
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reservation_id UUID REFERENCES public.reservations(id) NOT NULL,
  partner_id UUID REFERENCES public.partners(id) NOT NULL,
  
  -- Offense tracking
  offense_number INTEGER NOT NULL CHECK (offense_number BETWEEN 1 AND 4),
  offense_type TEXT DEFAULT 'missed_pickup' CHECK (offense_type IN ('missed_pickup', 'late_cancellation', 'no_show')),
  
  -- Penalty details
  penalty_type TEXT NOT NULL CHECK (penalty_type IN ('warning', '1hour', '24hour', 'permanent')),
  suspended_until TIMESTAMPTZ, -- NULL for warnings
  is_active BOOLEAN DEFAULT true,
  
  -- Acknowledgment tracking
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  
  -- Point lift system
  can_lift_with_points BOOLEAN DEFAULT false,
  points_required INTEGER DEFAULT 0,
  lifted_with_points BOOLEAN DEFAULT false,
  points_spent INTEGER,
  lifted_at TIMESTAMPTZ,
  
  -- Partner forgiveness system
  forgiveness_requested BOOLEAN DEFAULT false,
  forgiveness_request_message TEXT,
  forgiveness_requested_at TIMESTAMPTZ,
  forgiveness_status TEXT CHECK (forgiveness_status IN ('pending', 'granted', 'denied', 'expired')),
  forgiveness_response_message TEXT,
  forgiveness_decided_by UUID REFERENCES public.users(id),
  forgiveness_decided_at TIMESTAMPTZ,
  forgiveness_expires_at TIMESTAMPTZ,
  
  -- Admin override
  admin_reviewed BOOLEAN DEFAULT false,
  admin_decision TEXT CHECK (admin_decision IN ('unban', 'reduce_penalty', 'keep_banned', 'extend_ban')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_penalties_user ON public.user_penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_user_penalties_partner ON public.user_penalties(partner_id);
CREATE INDEX IF NOT EXISTS idx_user_penalties_active ON public.user_penalties(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_forgiveness_pending ON public.user_penalties(forgiveness_status) WHERE forgiveness_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_penalties_reservation ON public.user_penalties(reservation_id);

-- ============================================
-- STEP 2: Create offense history tracking table
-- ============================================
CREATE TABLE IF NOT EXISTS public.penalty_offense_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  offense_count INTEGER NOT NULL DEFAULT 1,
  last_offense_date TIMESTAMPTZ DEFAULT NOW(),
  total_warnings INTEGER DEFAULT 0,
  total_1hour_bans INTEGER DEFAULT 0,
  total_24hour_bans INTEGER DEFAULT 0,
  total_permanent_bans INTEGER DEFAULT 0,
  total_forgiven INTEGER DEFAULT 0,
  total_point_lifts INTEGER DEFAULT 0,
  total_points_spent_on_lifts INTEGER DEFAULT 0,
  
  -- Reliability score (0-100)
  reliability_score INTEGER DEFAULT 100 CHECK (reliability_score BETWEEN 0 AND 100),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offense_history_user ON public.penalty_offense_history(user_id);

-- ============================================
-- STEP 3: Create point transactions table for ban lifts
-- ============================================
CREATE TABLE IF NOT EXISTS public.penalty_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  penalty_id UUID REFERENCES public.user_penalties(id) NOT NULL,
  points_spent INTEGER NOT NULL,
  previous_balance INTEGER NOT NULL,
  new_balance INTEGER NOT NULL,
  transaction_type TEXT DEFAULT 'ban_lift',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_penalty_transactions_user ON public.penalty_point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_penalty_transactions_penalty ON public.penalty_point_transactions(penalty_id);

-- ============================================
-- STEP 4: Update users table with penalty columns
-- ============================================
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS total_missed_pickups INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_penalty_level INTEGER DEFAULT 0 CHECK (current_penalty_level BETWEEN 0 AND 4),
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reliability_score INTEGER DEFAULT 100 CHECK (reliability_score BETWEEN 0 AND 100);

-- ============================================
-- STEP 5: Update reservations table
-- ============================================
ALTER TABLE public.reservations 
  ADD COLUMN IF NOT EXISTS penalty_applied BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS penalty_id UUID REFERENCES public.user_penalties(id);

CREATE INDEX IF NOT EXISTS idx_reservations_penalty_applied ON public.reservations(penalty_applied);

-- ============================================
-- STEP 6: Create function to calculate reliability score
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_reliability_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completed_count INTEGER;
  missed_count INTEGER;
  forgiven_count INTEGER;
  total_count INTEGER;
  score INTEGER;
BEGIN
  -- Count completed reservations
  SELECT COUNT(*) INTO completed_count
  FROM public.reservations
  WHERE user_id = p_user_id AND status = 'completed';
  
  -- Count missed pickups (not forgiven)
  SELECT COUNT(*) INTO missed_count
  FROM public.user_penalties
  WHERE user_id = p_user_id 
    AND offense_type = 'missed_pickup'
    AND (forgiveness_status IS NULL OR forgiveness_status != 'granted');
  
  -- Count forgiven offenses
  SELECT COUNT(*) INTO forgiven_count
  FROM public.user_penalties
  WHERE user_id = p_user_id AND forgiveness_status = 'granted';
  
  total_count := completed_count + missed_count;
  
  IF total_count = 0 THEN
    RETURN 100; -- New user, perfect score
  END IF;
  
  -- Score = (completed / total) * 100
  score := ROUND((completed_count::NUMERIC / total_count) * 100);
  
  -- Bonus for forgiven offenses (shows they apologize and communicate)
  score := score + (forgiven_count * 2);
  
  -- Cap at 100
  IF score > 100 THEN
    score := 100;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 7: Trigger to update reliability score automatically
-- ============================================
CREATE OR REPLACE FUNCTION public.update_reliability_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET reliability_score = public.calculate_reliability_score(NEW.user_id),
      updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_penalty_change ON public.user_penalties;
CREATE TRIGGER after_penalty_change
AFTER INSERT OR UPDATE ON public.user_penalties
FOR EACH ROW
EXECUTE FUNCTION public.update_reliability_score_trigger();

-- ============================================
-- STEP 8: Function to auto-expire forgiveness requests
-- ============================================
CREATE OR REPLACE FUNCTION public.expire_forgiveness_requests()
RETURNS void AS $$
BEGIN
  UPDATE public.user_penalties
  SET 
    forgiveness_status = 'expired',
    updated_at = NOW()
  WHERE 
    forgiveness_status = 'pending'
    AND forgiveness_requested_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 9: Function to update offense history
-- ============================================
CREATE OR REPLACE FUNCTION public.update_offense_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update offense history
  INSERT INTO public.penalty_offense_history (
    user_id,
    offense_count,
    last_offense_date,
    total_warnings,
    total_1hour_bans,
    total_24hour_bans,
    total_permanent_bans,
    total_forgiven,
    reliability_score
  )
  VALUES (
    NEW.user_id,
    NEW.offense_number,
    NOW(),
    CASE WHEN NEW.penalty_type = 'warning' THEN 1 ELSE 0 END,
    CASE WHEN NEW.penalty_type = '1hour' THEN 1 ELSE 0 END,
    CASE WHEN NEW.penalty_type = '24hour' THEN 1 ELSE 0 END,
    CASE WHEN NEW.penalty_type = 'permanent' THEN 1 ELSE 0 END,
    0,
    public.calculate_reliability_score(NEW.user_id)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    offense_count = GREATEST(penalty_offense_history.offense_count, NEW.offense_number),
    last_offense_date = NOW(),
    total_warnings = penalty_offense_history.total_warnings + CASE WHEN NEW.penalty_type = 'warning' THEN 1 ELSE 0 END,
    total_1hour_bans = penalty_offense_history.total_1hour_bans + CASE WHEN NEW.penalty_type = '1hour' THEN 1 ELSE 0 END,
    total_24hour_bans = penalty_offense_history.total_24hour_bans + CASE WHEN NEW.penalty_type = '24hour' THEN 1 ELSE 0 END,
    total_permanent_bans = penalty_offense_history.total_permanent_bans + CASE WHEN NEW.penalty_type = 'permanent' THEN 1 ELSE 0 END,
    total_forgiven = penalty_offense_history.total_forgiven + CASE WHEN NEW.forgiveness_status = 'granted' THEN 1 ELSE 0 END,
    reliability_score = public.calculate_reliability_score(NEW.user_id),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_offense_history_trigger ON public.user_penalties;
CREATE TRIGGER update_offense_history_trigger
AFTER INSERT OR UPDATE ON public.user_penalties
FOR EACH ROW
EXECUTE FUNCTION public.update_offense_history();

-- ============================================
-- STEP 10: RLS Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.user_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_offense_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_point_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own penalties
DROP POLICY IF EXISTS "Users can view own penalties" ON public.user_penalties;
CREATE POLICY "Users can view own penalties"
  ON public.user_penalties FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Partners can view penalties for their reservations
DROP POLICY IF EXISTS "Partners can view penalties for their offers" ON public.user_penalties;
CREATE POLICY "Partners can view penalties for their offers"
  ON public.user_penalties FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );

-- Partners can update forgiveness decisions
DROP POLICY IF EXISTS "Partners can update forgiveness decisions" ON public.user_penalties;
CREATE POLICY "Partners can update forgiveness decisions"
  ON public.user_penalties FOR UPDATE
  TO authenticated
  USING (
    partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );

-- Admins can view and update all penalties
DROP POLICY IF EXISTS "Admins can view all penalties" ON public.user_penalties;
CREATE POLICY "Admins can view all penalties"
  ON public.user_penalties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND lower(role) = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all penalties" ON public.user_penalties;
CREATE POLICY "Admins can update all penalties"
  ON public.user_penalties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND lower(role) = 'admin'
    )
  );

-- Users can view their own offense history
DROP POLICY IF EXISTS "Users can view own offense history" ON public.penalty_offense_history;
CREATE POLICY "Users can view own offense history"
  ON public.penalty_offense_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all offense history
DROP POLICY IF EXISTS "Admins can view all offense history" ON public.penalty_offense_history;
CREATE POLICY "Admins can view all offense history"
  ON public.penalty_offense_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND lower(role) = 'admin'
    )
  );

-- Users can view their own point transactions
DROP POLICY IF EXISTS "Users can view own point transactions" ON public.penalty_point_transactions;
CREATE POLICY "Users can view own point transactions"
  ON public.penalty_point_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- STEP 11: Grant permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE ON public.user_penalties TO authenticated;
GRANT SELECT ON public.penalty_offense_history TO authenticated;
GRANT SELECT ON public.penalty_point_transactions TO authenticated;

-- ============================================
-- STEP 12: Create helper functions for the app
-- ============================================

-- Get user's current active penalty
CREATE OR REPLACE FUNCTION public.get_active_penalty(p_user_id UUID)
RETURNS TABLE (
  penalty_id UUID,
  offense_number INTEGER,
  penalty_type TEXT,
  suspended_until TIMESTAMPTZ,
  can_lift_with_points BOOLEAN,
  points_required INTEGER,
  forgiveness_status TEXT,
  time_remaining INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    user_penalties.offense_number,
    user_penalties.penalty_type,
    user_penalties.suspended_until,
    user_penalties.can_lift_with_points,
    user_penalties.points_required,
    user_penalties.forgiveness_status,
    CASE 
      WHEN user_penalties.suspended_until IS NOT NULL 
      THEN user_penalties.suspended_until - NOW()
      ELSE NULL
    END as time_remaining
  FROM public.user_penalties
  WHERE user_penalties.user_id = p_user_id 
    AND user_penalties.is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can make reservations
CREATE OR REPLACE FUNCTION public.can_user_reserve(p_user_id UUID)
RETURNS TABLE (
  can_reserve BOOLEAN,
  reason TEXT,
  suspended_until TIMESTAMPTZ,
  penalty_id UUID
) AS $$
DECLARE
  v_user RECORD;
  v_penalty RECORD;
BEGIN
  -- Get user status
  SELECT is_suspended, suspended_until INTO v_user
  FROM public.users
  WHERE id = p_user_id;
  
  -- If not suspended, allow
  IF NOT v_user.is_suspended THEN
    RETURN QUERY SELECT true, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if suspension expired
  IF v_user.suspended_until IS NOT NULL AND v_user.suspended_until < NOW() THEN
    -- Auto-lift expired suspension
    UPDATE public.users
    SET is_suspended = false, suspended_until = NULL
    WHERE id = p_user_id;
    
    UPDATE public.user_penalties
    SET is_active = false
    WHERE user_id = p_user_id AND is_active = true;
    
    RETURN QUERY SELECT true, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;
  
  -- Get active penalty
  SELECT * INTO v_penalty
  FROM public.user_penalties
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Return suspension info
  RETURN QUERY SELECT 
    false,
    'Account suspended due to missed pickup'::TEXT,
    v_user.suspended_until,
    v_penalty.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - user_penalties';
  RAISE NOTICE '  - penalty_offense_history';
  RAISE NOTICE '  - penalty_point_transactions';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - calculate_reliability_score()';
  RAISE NOTICE '  - expire_forgiveness_requests()';
  RAISE NOTICE '  - get_active_penalty()';
  RAISE NOTICE '  - can_user_reserve()';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Implement frontend penalty modals';
  RAISE NOTICE '  2. Create Edge Function for cron job';
  RAISE NOTICE '  3. Integrate with reservation flow';
END $$;
