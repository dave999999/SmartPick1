-- =====================================================
-- PROFESSIONAL ADMIN DASHBOARD UPGRADE FOR SMARTPICK.GE
-- =====================================================
-- Date: 2025-11-11
-- Purpose: Transform admin dashboard into professional control center
-- 
-- Features:
-- 1. GEL currency tracking (100 points = 1 GEL)
-- 2. User ban system
-- 3. Content flagging & moderation
-- 4. Enhanced analytics
-- 5. Audit logging with anomaly detection
-- 6. Manual point grants
-- 7. User management enhancements
-- =====================================================

-- =====================================================
-- PART 1: ADD GEL TRACKING TO POINT TRANSACTIONS
-- =====================================================

-- Add amount_paid_gel column to track actual money spent (100 points = 1 GEL)
ALTER TABLE public.point_transactions 
ADD COLUMN IF NOT EXISTS amount_paid_gel DECIMAL(10,2);

-- Update existing point purchase records with calculated GEL amounts
-- (Assumes historic conversion rate was also 100 points = 1 GEL)
UPDATE public.point_transactions 
SET amount_paid_gel = change / 100.0 
WHERE reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE') 
  AND change > 0 
  AND amount_paid_gel IS NULL;

-- Add NOT NULL constraint after backfilling (only for purchase transactions)
-- Note: We keep it nullable for non-purchase transactions (claims, bonuses, etc.)

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_point_transactions_gel 
  ON public.point_transactions(amount_paid_gel, created_at DESC) 
  WHERE amount_paid_gel IS NOT NULL;

-- =====================================================
-- PART 2: USER BAN SYSTEM
-- =====================================================

-- Create user_bans table
CREATE TABLE IF NOT EXISTS public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES public.users(id),
  reason TEXT NOT NULL,
  ban_type VARCHAR(50) NOT NULL DEFAULT 'PERMANENT', -- PERMANENT, TEMPORARY
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL for permanent bans
  internal_notes TEXT, -- Admin-only notes
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_active_ban UNIQUE (user_id, is_active)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON public.user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON public.user_bans(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_bans_expires ON public.user_bans(expires_at) WHERE expires_at IS NOT NULL;

-- Add is_banned flag to users table for quick checks
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Create index on is_banned
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON public.users(is_banned) WHERE is_banned = TRUE;

-- Function to ban a user
CREATE OR REPLACE FUNCTION ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_ban_type VARCHAR DEFAULT 'PERMANENT',
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_ban_id UUID;
  v_admin_id UUID;
BEGIN
  -- Get current admin user
  v_admin_id := auth.uid();
  
  -- Check if user is already banned
  IF EXISTS (SELECT 1 FROM public.user_bans WHERE user_id = p_user_id AND is_active = TRUE) THEN
    RAISE EXCEPTION 'User is already banned';
  END IF;
  
  -- Create ban record
  INSERT INTO public.user_bans (user_id, banned_by, reason, ban_type, expires_at, internal_notes)
  VALUES (p_user_id, v_admin_id, p_reason, p_ban_type, p_expires_at, p_internal_notes)
  RETURNING id INTO v_ban_id;
  
  -- Update user record
  UPDATE public.users SET is_banned = TRUE WHERE id = p_user_id;
  
  RETURN v_ban_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unban a user
CREATE OR REPLACE FUNCTION unban_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Deactivate all bans for this user
  UPDATE public.user_bans 
  SET is_active = FALSE, updated_at = NOW()
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  -- Update user record
  UPDATE public.users SET is_banned = FALSE WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically expire temporary bans
CREATE OR REPLACE FUNCTION expire_temporary_bans()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired_bans AS (
    UPDATE public.user_bans
    SET is_active = FALSE, updated_at = NOW()
    WHERE is_active = TRUE 
      AND ban_type = 'TEMPORARY'
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
    RETURNING user_id
  )
  UPDATE public.users
  SET is_banned = FALSE
  WHERE id IN (SELECT user_id FROM expired_bans)
    AND NOT EXISTS (
      SELECT 1 FROM public.user_bans 
      WHERE user_id = users.id AND is_active = TRUE
    )
  RETURNING 1 INTO v_count;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 3: CONTENT FLAGGING & MODERATION SYSTEM
-- =====================================================

-- Create flagged_content table (unified flagging for offers, partners, users)
CREATE TABLE IF NOT EXISTS public.flagged_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL, -- OFFER, PARTNER, USER
  content_id UUID NOT NULL,
  flagged_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- NULL if system-flagged
  flag_source VARCHAR(50) NOT NULL DEFAULT 'USER', -- USER, SYSTEM_AUTO
  flag_reason VARCHAR(100) NOT NULL,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, UNDER_REVIEW, RESOLVED, DISMISSED
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  resolution_action TEXT, -- What action was taken
  metadata JSONB, -- Store additional context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_flagged_content_type ON public.flagged_content(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_flagged_content_status ON public.flagged_content(status);
CREATE INDEX IF NOT EXISTS idx_flagged_content_severity ON public.flagged_content(severity);
CREATE INDEX IF NOT EXISTS idx_flagged_content_created ON public.flagged_content(created_at DESC);

-- Function to flag content
CREATE OR REPLACE FUNCTION flag_content(
  p_content_type VARCHAR,
  p_content_id UUID,
  p_flag_reason VARCHAR,
  p_description TEXT DEFAULT NULL,
  p_severity VARCHAR DEFAULT 'MEDIUM',
  p_flag_source VARCHAR DEFAULT 'USER'
)
RETURNS UUID AS $$
DECLARE
  v_flag_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Prevent duplicate active flags
  IF EXISTS (
    SELECT 1 FROM public.flagged_content 
    WHERE content_type = p_content_type 
      AND content_id = p_content_id 
      AND status IN ('PENDING', 'UNDER_REVIEW')
      AND flagged_by = v_user_id
  ) THEN
    RAISE EXCEPTION 'You have already flagged this content';
  END IF;
  
  INSERT INTO public.flagged_content (
    content_type, content_id, flagged_by, flag_source, 
    flag_reason, description, severity
  )
  VALUES (
    p_content_type, p_content_id, v_user_id, p_flag_source,
    p_flag_reason, p_description, p_severity
  )
  RETURNING id INTO v_flag_id;
  
  RETURN v_flag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- System auto-flagging for suspicious activity
CREATE OR REPLACE FUNCTION auto_flag_suspicious_content()
RETURNS TABLE (
  flagged_count INTEGER,
  flag_type VARCHAR
) AS $$
BEGIN
  -- Flag offers with suspicious pricing (e.g., < 5 points or > 10000 points)
  INSERT INTO public.flagged_content (
    content_type, content_id, flag_source, flag_reason, severity, description
  )
  SELECT 
    'OFFER', o.id, 'SYSTEM_AUTO', 'SUSPICIOUS_PRICING', 'HIGH',
    'Offer price is unusually low or high: ' || o.points_required || ' points'
  FROM public.offers o
  WHERE (o.points_required < 5 OR o.points_required > 10000)
    AND o.status = 'ACTIVE'
    AND NOT EXISTS (
      SELECT 1 FROM public.flagged_content fc
      WHERE fc.content_id = o.id 
        AND fc.content_type = 'OFFER'
        AND fc.flag_reason = 'SUSPICIOUS_PRICING'
        AND fc.status IN ('PENDING', 'UNDER_REVIEW')
    );
  
  -- Flag users with rapid account creation from same IP (potential bot/abuse)
  -- TODO: Requires IP tracking in users table
  
  -- Flag partners with multiple rejected reservations
  INSERT INTO public.flagged_content (
    content_type, content_id, flag_source, flag_reason, severity, description
  )
  SELECT 
    'PARTNER', p.id, 'SYSTEM_AUTO', 'HIGH_REJECTION_RATE', 'MEDIUM',
    'Partner has high cancellation rate: ' || rejection_count || ' cancellations in last 30 days'
  FROM public.partners p
  INNER JOIN (
    SELECT o.partner_id, COUNT(*) as rejection_count
    FROM public.reservations r
    INNER JOIN public.offers o ON r.offer_id = o.id
    WHERE r.status IN ('CANCELLED', 'EXPIRED')
      AND r.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY o.partner_id
    HAVING COUNT(*) >= 10
  ) rejections ON rejections.partner_id = p.id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.flagged_content fc
    WHERE fc.content_id = p.id 
      AND fc.content_type = 'PARTNER'
      AND fc.flag_reason = 'HIGH_REJECTION_RATE'
      AND fc.status IN ('PENDING', 'UNDER_REVIEW')
      AND fc.created_at >= NOW() - INTERVAL '7 days'
  );
  
  RETURN QUERY 
  SELECT COUNT(*)::INTEGER, 'AUTO_FLAGGED'::VARCHAR 
  FROM public.flagged_content 
  WHERE flag_source = 'SYSTEM_AUTO' 
    AND created_at >= NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 4: ENHANCED AUDIT LOGGING
-- =====================================================

-- Enhanced audit_logs table (may already exist, so use ALTER if needed)
DO $$ 
BEGIN
  -- Add new columns if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    ALTER TABLE public.audit_logs 
    ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'INFO'; -- INFO, WARNING, CRITICAL
    
    ALTER TABLE public.audit_logs 
    ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT FALSE;
    
    ALTER TABLE public.audit_logs 
    ADD COLUMN IF NOT EXISTS anomaly_score DECIMAL(3,2); -- 0.00 to 1.00
    
    CREATE INDEX IF NOT EXISTS idx_audit_logs_suspicious 
      ON public.audit_logs(is_suspicious, created_at DESC) 
      WHERE is_suspicious = TRUE;
    
    CREATE INDEX IF NOT EXISTS idx_audit_logs_severity 
      ON public.audit_logs(severity, created_at DESC);
  END IF;
END $$;

-- Function to detect anomalous activity
CREATE OR REPLACE FUNCTION detect_anomalous_activity()
RETURNS TABLE (
  anomaly_type VARCHAR,
  user_id UUID,
  count BIGINT,
  description TEXT
) AS $$
BEGIN
  -- Detect multiple failed login attempts (> 5 in 10 minutes)
  RETURN QUERY
  SELECT 
    'MULTIPLE_FAILED_LOGINS'::VARCHAR,
    al.admin_id as user_id,
    COUNT(*) as count,
    'User had ' || COUNT(*) || ' failed login attempts in last 10 minutes' as description
  FROM public.audit_logs al
  WHERE al.action = 'LOGIN_FAILED'
    AND al.created_at >= NOW() - INTERVAL '10 minutes'
  GROUP BY al.admin_id
  HAVING COUNT(*) >= 5;
  
  -- Detect rapid offer creation (> 10 offers in 1 hour)
  RETURN QUERY
  SELECT 
    'RAPID_OFFER_CREATION'::VARCHAR,
    p.user_id,
    COUNT(*)::BIGINT as count,
    'Partner created ' || COUNT(*) || ' offers in last hour' as description
  FROM public.offers o
  INNER JOIN public.partners p ON o.partner_id = p.id
  WHERE o.created_at >= NOW() - INTERVAL '1 hour'
  GROUP BY p.user_id
  HAVING COUNT(*) > 10;
  
  -- Detect mass point additions (> 10000 points added to single user in 1 day)
  RETURN QUERY
  SELECT 
    'MASS_POINT_ADDITION'::VARCHAR,
    pt.user_id,
    SUM(pt.change)::BIGINT as count,
    'User received ' || SUM(pt.change) || ' points in last 24 hours' as description
  FROM public.point_transactions pt
  WHERE pt.change > 0
    AND pt.created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY pt.user_id
  HAVING SUM(pt.change) > 10000;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 5: MANUAL POINT GRANT SYSTEM
-- =====================================================

-- Function to grant/deduct points manually by admin
CREATE OR REPLACE FUNCTION admin_grant_points(
  p_user_id UUID,
  p_points INTEGER, -- Can be negative to deduct
  p_reason TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_admin_id UUID;
  v_old_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  v_admin_id := auth.uid();
  
  -- Verify admin permission
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_admin_id AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Only admins can grant points';
  END IF;
  
  -- Get current balance
  SELECT points INTO v_old_balance FROM public.users WHERE id = p_user_id;
  
  IF v_old_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_old_balance + p_points;
  
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Cannot deduct more points than user has';
  END IF;
  
  -- Update user balance
  UPDATE public.users SET points = v_new_balance WHERE id = p_user_id;
  
  -- Create transaction record
  INSERT INTO public.point_transactions (
    user_id, change, reason, balance_before, balance_after, metadata
  )
  VALUES (
    p_user_id, 
    p_points, 
    'ADMIN_GRANT: ' || p_reason,
    v_old_balance,
    v_new_balance,
    jsonb_build_object(
      'granted_by', v_admin_id,
      'admin_notes', p_admin_notes,
      'grant_reason', p_reason
    )
  )
  RETURNING id INTO v_transaction_id;
  
  -- Log admin action
  INSERT INTO public.audit_logs (admin_id, action, resource_type, resource_id, details)
  VALUES (
    v_admin_id,
    'POINTS_GRANTED',
    'USER',
    p_user_id,
    jsonb_build_object(
      'points', p_points,
      'reason', p_reason,
      'old_balance', v_old_balance,
      'new_balance', v_new_balance
    )
  );
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 6: UPDATE REVENUE FUNCTIONS FOR GEL
-- =====================================================

-- Drop and recreate revenue stats function with GEL tracking
DROP FUNCTION IF EXISTS get_platform_revenue_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

CREATE OR REPLACE FUNCTION get_platform_revenue_stats(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_revenue DECIMAL,
  total_point_purchases BIGINT,
  total_points_sold BIGINT,
  average_purchase_value DECIMAL,
  unique_buyers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Use actual GEL amounts, not points
    COALESCE(SUM(pt.amount_paid_gel), 0)::DECIMAL AS total_revenue,
    COUNT(*) AS total_point_purchases,
    COALESCE(SUM(pt.change), 0) AS total_points_sold,
    COALESCE(AVG(pt.amount_paid_gel), 0)::DECIMAL AS average_purchase_value,
    COUNT(DISTINCT pt.user_id) AS unique_buyers
  FROM public.point_transactions pt
  WHERE pt.reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
    AND pt.change > 0
    AND pt.amount_paid_gel IS NOT NULL
    AND pt.created_at >= p_start_date
    AND pt.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update admin dashboard stats
DROP FUNCTION IF EXISTS get_admin_dashboard_stats();

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_users integer,
  total_partners integer,
  active_offers integer,
  reservations_today integer,
  revenue_today numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (select count(*) from public.users where role = 'CUSTOMER')::integer as total_users,
    (select count(*) from public.partners where status = 'APPROVED')::integer as total_partners,
    (select count(*) from public.offers where status = 'ACTIVE')::integer as active_offers,
    (select count(*) from public.reservations where status IN ('RESERVED', 'CONFIRMED', 'PICKED_UP') and created_at::date = now()::date)::integer as reservations_today,
    -- Revenue in GEL, not points
    coalesce(
      (select sum(amount_paid_gel) from public.point_transactions 
       where reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE') 
         and change > 0 
         and amount_paid_gel IS NOT NULL
         and created_at::date = now()::date), 
      0
    )::numeric as revenue_today;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get buyer purchase details (for clickable modal)
CREATE OR REPLACE FUNCTION get_buyer_purchase_details(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE,
  points_purchased INTEGER,
  amount_paid_gel DECIMAL,
  transaction_id UUID
) AS $$
BEGIN
  IF p_user_id IS NULL THEN
    -- Return all buyers
    RETURN QUERY
    SELECT
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      pt.created_at as purchase_date,
      pt.change as points_purchased,
      pt.amount_paid_gel,
      pt.id as transaction_id
    FROM public.point_transactions pt
    INNER JOIN public.users u ON pt.user_id = u.id
    WHERE pt.reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
      AND pt.change > 0
      AND pt.amount_paid_gel IS NOT NULL
    ORDER BY pt.created_at DESC;
  ELSE
    -- Return purchases for specific user
    RETURN QUERY
    SELECT
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      pt.created_at as purchase_date,
      pt.change as points_purchased,
      pt.amount_paid_gel,
      pt.id as transaction_id
    FROM public.point_transactions pt
    INNER JOIN public.users u ON pt.user_id = u.id
    WHERE pt.user_id = p_user_id
      AND pt.reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
      AND pt.change > 0
      AND pt.amount_paid_gel IS NOT NULL
    ORDER BY pt.created_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user claimed points details (achievements, referrals, etc.)
CREATE OR REPLACE FUNCTION get_user_claimed_points_details(p_user_id UUID)
RETURNS TABLE (
  claim_date TIMESTAMP WITH TIME ZONE,
  points_claimed INTEGER,
  claim_source VARCHAR,
  source_description TEXT,
  transaction_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.created_at as claim_date,
    pt.change as points_claimed,
    CASE 
      WHEN pt.reason LIKE '%ACHIEVEMENT%' THEN 'ACHIEVEMENT'::VARCHAR
      WHEN pt.reason LIKE '%REFERRAL%' THEN 'REFERRAL'::VARCHAR
      WHEN pt.reason LIKE '%BONUS%' THEN 'BONUS'::VARCHAR
      WHEN pt.reason LIKE '%REWARD%' THEN 'REWARD'::VARCHAR
      ELSE 'OTHER'::VARCHAR
    END as claim_source,
    pt.reason as source_description,
    pt.id as transaction_id
  FROM public.point_transactions pt
  WHERE pt.user_id = p_user_id
    AND pt.change > 0
    AND pt.amount_paid_gel IS NULL -- Exclude purchases
    AND pt.reason NOT IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
  ORDER BY pt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user points summary (for Users tab columns)
CREATE OR REPLACE FUNCTION get_user_points_summary(p_user_id UUID)
RETURNS TABLE (
  current_balance INTEGER,
  total_purchased INTEGER,
  total_spent INTEGER,
  total_claimed INTEGER,
  total_gel_spent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT points FROM public.users WHERE id = p_user_id)::INTEGER as current_balance,
    COALESCE((
      SELECT SUM(change) FROM public.point_transactions 
      WHERE user_id = p_user_id 
        AND reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
        AND change > 0
    ), 0)::INTEGER as total_purchased,
    COALESCE((
      SELECT ABS(SUM(change)) FROM public.point_transactions 
      WHERE user_id = p_user_id 
        AND change < 0
    ), 0)::INTEGER as total_spent,
    COALESCE((
      SELECT SUM(change) FROM public.point_transactions 
      WHERE user_id = p_user_id 
        AND change > 0
        AND amount_paid_gel IS NULL
        AND reason NOT IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
    ), 0)::INTEGER as total_claimed,
    COALESCE((
      SELECT SUM(amount_paid_gel) FROM public.point_transactions 
      WHERE user_id = p_user_id 
        AND reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
        AND amount_paid_gel IS NOT NULL
    ), 0)::DECIMAL as total_gel_spent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get users with points summary (for Users Management tab)
CREATE OR REPLACE FUNCTION get_users_with_points_summary(
  p_role VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  email TEXT,
  role VARCHAR,
  is_banned BOOLEAN,
  current_points INTEGER,
  total_purchased INTEGER,
  total_claimed INTEGER,
  total_gel_spent DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.name::TEXT,
    u.email::TEXT,
    u.role::TEXT,
    u.is_banned,
    COALESCE(up.balance, 0)::INTEGER as current_points,
    COALESCE(purchases.total, 0)::INTEGER as total_purchased,
    COALESCE(claims.total, 0)::INTEGER as total_claimed,
    COALESCE(purchases.total_gel, 0)::DECIMAL as total_gel_spent,
    u.created_at,
    u.last_login
  FROM public.users u
  LEFT JOIN public.user_points up ON up.user_id = u.id
  LEFT JOIN (
    SELECT pt.user_id as purchase_user_id, SUM(pt.change) as total, SUM(pt.amount_paid_gel) as total_gel
    FROM public.point_transactions pt
    WHERE pt.reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
      AND pt.change > 0
    GROUP BY pt.user_id
  ) purchases ON purchases.purchase_user_id = u.id
  LEFT JOIN (
    SELECT pt2.user_id as claim_user_id, SUM(pt2.change) as total
    FROM public.point_transactions pt2
    WHERE pt2.change > 0
      AND pt2.amount_paid_gel IS NULL
      AND pt2.reason NOT IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
    GROUP BY pt2.user_id
  ) claims ON claims.claim_user_id = u.id
  WHERE (p_role IS NULL OR u.role = p_role)
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 7: RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flagged_content ENABLE ROW LEVEL SECURITY;

-- user_bans policies (admin-only)
DROP POLICY IF EXISTS "Admins can view all bans" ON public.user_bans;
CREATE POLICY "Admins can view all bans"
  ON public.user_bans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can create bans" ON public.user_bans;
CREATE POLICY "Admins can create bans"
  ON public.user_bans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can update bans" ON public.user_bans;
CREATE POLICY "Admins can update bans"
  ON public.user_bans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- flagged_content policies (admin can see all, users can see their own)
DROP POLICY IF EXISTS "Admins can view all flags" ON public.flagged_content;
CREATE POLICY "Admins can view all flags"
  ON public.flagged_content FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Users can view their own flags" ON public.flagged_content;
CREATE POLICY "Users can view their own flags"
  ON public.flagged_content FOR SELECT
  TO authenticated
  USING (flagged_by = auth.uid());

DROP POLICY IF EXISTS "Users can create flags" ON public.flagged_content;
CREATE POLICY "Users can create flags"
  ON public.flagged_content FOR INSERT
  TO authenticated
  WITH CHECK (flagged_by = auth.uid());

DROP POLICY IF EXISTS "Admins can update flags" ON public.flagged_content;
CREATE POLICY "Admins can update flags"
  ON public.flagged_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Update users table RLS to block banned users
DROP POLICY IF EXISTS "Banned users cannot access platform" ON public.users;
CREATE POLICY "Banned users cannot access platform"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() AND (is_banned = FALSE OR is_banned IS NULL)
  );

-- =====================================================
-- PART 8: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION ban_user TO authenticated;
GRANT EXECUTE ON FUNCTION unban_user TO authenticated;
GRANT EXECUTE ON FUNCTION expire_temporary_bans TO authenticated;
GRANT EXECUTE ON FUNCTION flag_content TO authenticated;
GRANT EXECUTE ON FUNCTION auto_flag_suspicious_content TO authenticated;
GRANT EXECUTE ON FUNCTION detect_anomalous_activity TO authenticated;
GRANT EXECUTE ON FUNCTION admin_grant_points TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_revenue_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_buyer_purchase_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_claimed_points_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_points_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_with_points_summary TO authenticated;

-- =====================================================
-- PART 9: CREATE VIEWS FOR ANALYTICS
-- =====================================================

-- Daily revenue view
CREATE OR REPLACE VIEW daily_revenue_summary AS
SELECT
  DATE(created_at) as revenue_date,
  COUNT(*) as purchase_count,
  SUM(change) as total_points_sold,
  SUM(amount_paid_gel) as total_revenue_gel,
  AVG(amount_paid_gel) as avg_purchase_gel,
  COUNT(DISTINCT user_id) as unique_buyers
FROM public.point_transactions
WHERE reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
  AND change > 0
  AND amount_paid_gel IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY revenue_date DESC;

-- User growth view
CREATE OR REPLACE VIEW user_growth_summary AS
SELECT
  DATE(created_at) as signup_date,
  role,
  COUNT(*) as new_users
FROM public.users
GROUP BY DATE(created_at), role
ORDER BY signup_date DESC;

-- Partner performance view
CREATE OR REPLACE VIEW partner_performance_summary AS
SELECT
  p.id as partner_id,
  p.business_name,
  COUNT(DISTINCT o.id) as total_offers,
  COUNT(DISTINCT r.id) as total_reservations,
  COUNT(DISTINCT CASE WHEN r.status = 'PICKED_UP' THEN r.id END) as completed_reservations,
  ROUND(
    COUNT(DISTINCT CASE WHEN r.status = 'PICKED_UP' THEN r.id END)::DECIMAL / 
    NULLIF(COUNT(DISTINCT r.id), 0) * 100, 
    2
  ) as completion_rate_percent
FROM public.partners p
LEFT JOIN public.offers o ON o.partner_id = p.id
LEFT JOIN public.reservations r ON r.offer_id = o.id
WHERE p.status = 'APPROVED'
GROUP BY p.id, p.business_name;

-- Grant view access
GRANT SELECT ON daily_revenue_summary TO authenticated;
GRANT SELECT ON user_growth_summary TO authenticated;
GRANT SELECT ON partner_performance_summary TO authenticated;

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================

COMMENT ON TABLE user_bans IS 'Tracks banned users with reason and expiration';
COMMENT ON TABLE flagged_content IS 'Unified flagging system for offers, partners, and users';
COMMENT ON FUNCTION ban_user IS 'Bans a user (admin only)';
COMMENT ON FUNCTION admin_grant_points IS 'Grants or deducts points manually (admin only)';
COMMENT ON FUNCTION get_buyer_purchase_details IS 'Returns detailed purchase history for clickable modal';
COMMENT ON FUNCTION get_user_claimed_points_details IS 'Returns claimed points breakdown (achievements, referrals, etc.)';
COMMENT ON FUNCTION get_user_points_summary IS 'Returns user point statistics for Users tab';
COMMENT ON FUNCTION get_users_with_points_summary IS 'Returns all users with point statistics';
