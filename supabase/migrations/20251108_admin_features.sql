-- =====================================================
-- ADMIN FEATURES MIGRATION
-- Adds comprehensive admin dashboard functionality
-- =====================================================

-- =====================================================
-- 1. AUDIT LOGS TABLE
-- Track all admin actions for security and compliance
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- e.g., 'USER_BANNED', 'PARTNER_APPROVED', 'OFFER_FLAGGED'
  resource_type VARCHAR(50) NOT NULL, -- e.g., 'USER', 'PARTNER', 'OFFER'
  resource_id UUID, -- ID of the affected resource
  details JSONB, -- Additional context about the action
  ip_address INET, -- IP address of admin
  user_agent TEXT, -- Browser/client info
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS 'Tracks all administrative actions for security auditing';
COMMENT ON COLUMN public.audit_logs.action IS 'Type of action performed (e.g., USER_BANNED, OFFER_DELETED)';
COMMENT ON COLUMN public.audit_logs.details IS 'JSON object with additional context about the action';

-- =====================================================
-- 2. OFFER FLAGS/MODERATION TABLE
-- Track flagged offers for admin review
-- =====================================================
CREATE TABLE IF NOT EXISTS public.offer_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason VARCHAR(100) NOT NULL, -- e.g., 'INAPPROPRIATE', 'SPAM', 'PRICING_ISSUE'
  description TEXT,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, REVIEWED, RESOLVED, DISMISSED
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_offer_flags_offer_id ON public.offer_flags(offer_id);
CREATE INDEX idx_offer_flags_status ON public.offer_flags(status);
CREATE INDEX idx_offer_flags_created_at ON public.offer_flags(created_at DESC);

COMMENT ON TABLE public.offer_flags IS 'Tracks user reports and admin flags on offers';
COMMENT ON COLUMN public.offer_flags.reason IS 'Reason for flagging (INAPPROPRIATE, SPAM, PRICING_ISSUE, etc.)';

-- =====================================================
-- 3. SYSTEM ANNOUNCEMENTS TABLE
-- Admin-created announcements for users
-- =====================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'INFO', -- INFO, WARNING, URGENT, MAINTENANCE
  target_audience VARCHAR(20) DEFAULT 'ALL', -- ALL, CUSTOMERS, PARTNERS
  is_active BOOLEAN DEFAULT true,
  display_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  display_until TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_announcements_active ON public.announcements(is_active, display_from, display_until);
CREATE INDEX idx_announcements_audience ON public.announcements(target_audience);

COMMENT ON TABLE public.announcements IS 'System-wide announcements created by admins';

-- =====================================================
-- 4. FAQ MANAGEMENT TABLE
-- Admin-managed frequently asked questions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'GENERAL', -- GENERAL, CUSTOMERS, PARTNERS, TECHNICAL
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_faqs_category ON public.faqs(category);
CREATE INDEX idx_faqs_published ON public.faqs(is_published, display_order);

COMMENT ON TABLE public.faqs IS 'Frequently asked questions managed by admins';

-- =====================================================
-- 5. SYSTEM HEALTH LOGS TABLE
-- Track system errors and performance issues
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_level VARCHAR(20) NOT NULL, -- ERROR, WARNING, INFO, DEBUG
  component VARCHAR(100) NOT NULL, -- e.g., 'API', 'DATABASE', 'PAYMENT'
  message TEXT NOT NULL,
  error_details JSONB, -- Stack trace, error object
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  request_path TEXT,
  http_method VARCHAR(10),
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_system_logs_level ON public.system_logs(log_level);
CREATE INDEX idx_system_logs_component ON public.system_logs(component);
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);

COMMENT ON TABLE public.system_logs IS 'System-wide error and performance logging';

-- =====================================================
-- 6. PARTNER COMMISSIONS/PAYOUTS TABLE
-- Track financial transactions for admin dashboard
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0, -- Percentage (e.g., 15.00 = 15%)
  commission_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payout_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSING, PAID, CANCELLED
  payment_method VARCHAR(50),
  payment_reference VARCHAR(200),
  processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_partner_payouts_partner_id ON public.partner_payouts(partner_id);
CREATE INDEX idx_partner_payouts_status ON public.partner_payouts(status);
CREATE INDEX idx_partner_payouts_period ON public.partner_payouts(period_start, period_end);

COMMENT ON TABLE public.partner_payouts IS 'Tracks partner commission payouts';

-- =====================================================
-- 7. USER ACTIVITY TRACKING
-- Track user login attempts and suspicious activity
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- LOGIN_SUCCESS, LOGIN_FAILED, PASSWORD_RESET, etc.
  ip_address INET,
  user_agent TEXT,
  country_code VARCHAR(2),
  city VARCHAR(100),
  is_suspicious BOOLEAN DEFAULT false,
  suspicious_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_type ON public.user_activity(activity_type);
CREATE INDEX idx_user_activity_suspicious ON public.user_activity(is_suspicious);
CREATE INDEX idx_user_activity_created_at ON public.user_activity(created_at DESC);

COMMENT ON TABLE public.user_activity IS 'Tracks user login activity and security events';

-- =====================================================
-- 8. ADD MODERATION FLAGS TO OFFERS TABLE
-- Add columns to track offer moderation status
-- =====================================================
ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS flagged_reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_offers_flagged ON public.offers(is_flagged);
CREATE INDEX IF NOT EXISTS idx_offers_featured ON public.offers(is_featured, featured_until);

COMMENT ON COLUMN public.offers.is_flagged IS 'True if offer has been flagged for review';
COMMENT ON COLUMN public.offers.is_featured IS 'True if offer is featured by admin';

-- =====================================================
-- 9. ADD SUSPENSION NOTES TO USERS TABLE
-- Track admin notes on user accounts
-- =====================================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(200),
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.users.admin_notes IS 'Internal admin notes about this user';
COMMENT ON COLUMN public.users.suspension_reason IS 'Reason for ban/suspension';

-- =====================================================
-- 10. RPC FUNCTIONS FOR ANALYTICS
-- =====================================================

-- Function to get platform-wide revenue stats
CREATE OR REPLACE FUNCTION get_platform_revenue_stats(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_revenue DECIMAL,
  total_reservations BIGINT,
  total_pickups BIGINT,
  average_order_value DECIMAL,
  completion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(r.total_price), 0) AS total_revenue,
    COUNT(*) AS total_reservations,
    COUNT(*) FILTER (WHERE r.status = 'PICKED_UP') AS total_pickups,
    COALESCE(AVG(r.total_price), 0) AS average_order_value,
    CASE
      WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE r.status = 'PICKED_UP')::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0
    END AS completion_rate
  FROM public.reservations r
  WHERE r.created_at >= p_start_date
    AND r.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user growth stats
CREATE OR REPLACE FUNCTION get_user_growth_stats()
RETURNS TABLE (
  date DATE,
  new_users BIGINT,
  cumulative_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_signups AS (
    SELECT
      DATE(created_at) AS signup_date,
      COUNT(*) AS daily_count
    FROM public.users
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at)
  )
  SELECT
    signup_date AS date,
    daily_count AS new_users,
    SUM(daily_count) OVER (ORDER BY signup_date) AS cumulative_users
  FROM daily_signups
  ORDER BY signup_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top performing partners
CREATE OR REPLACE FUNCTION get_top_partners(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  partner_id UUID,
  business_name VARCHAR,
  total_revenue DECIMAL,
  total_items_sold BIGINT,
  total_reservations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS partner_id,
    p.business_name,
    COALESCE(SUM(r.total_price), 0) AS total_revenue,
    COALESCE(SUM(r.quantity), 0) AS total_items_sold,
    COUNT(r.id) AS total_reservations
  FROM public.partners p
  LEFT JOIN public.reservations r ON r.partner_id = p.id
    AND r.status = 'PICKED_UP'
  GROUP BY p.id, p.business_name
  ORDER BY total_revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get category popularity
CREATE OR REPLACE FUNCTION get_category_stats()
RETURNS TABLE (
  category VARCHAR,
  total_offers BIGINT,
  total_reservations BIGINT,
  total_revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.category,
    COUNT(DISTINCT o.id) AS total_offers,
    COUNT(r.id) AS total_reservations,
    COALESCE(SUM(r.total_price), 0) AS total_revenue
  FROM public.offers o
  LEFT JOIN public.reservations r ON r.offer_id = o.id
    AND r.status = 'PICKED_UP'
  GROUP BY o.category
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. RLS POLICIES FOR ADMIN TABLES
-- Only admins can access these tables
-- =====================================================

-- Enable RLS on all admin tables
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND UPPER(users.role) = 'ADMIN'
    )
  );

CREATE POLICY "Admins can manage offer flags" ON public.offer_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND UPPER(users.role) = 'ADMIN'
    )
  );

-- Users can report offers (create flags)
CREATE POLICY "Users can report offers" ON public.offer_flags
  FOR INSERT WITH CHECK (
    auth.uid() = reported_by
  );

CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND UPPER(users.role) = 'ADMIN'
    )
  );

-- Everyone can view active announcements
CREATE POLICY "Anyone can view active announcements" ON public.announcements
  FOR SELECT USING (
    is_active = true
    AND display_from <= NOW()
    AND (display_until IS NULL OR display_until >= NOW())
  );

CREATE POLICY "Admins can manage FAQs" ON public.faqs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND UPPER(users.role) = 'ADMIN'
    )
  );

-- Everyone can view published FAQs
CREATE POLICY "Anyone can view published FAQs" ON public.faqs
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can view system logs" ON public.system_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND UPPER(users.role) = 'ADMIN'
    )
  );

CREATE POLICY "Admins can manage payouts" ON public.partner_payouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND UPPER(users.role) = 'ADMIN'
    )
  );

-- Partners can view their own payouts
CREATE POLICY "Partners can view own payouts" ON public.partner_payouts
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM public.partners
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all user activity" ON public.user_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND UPPER(users.role) = 'ADMIN'
    )
  );

-- =====================================================
-- 12. HELPER FUNCTION TO LOG ADMIN ACTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id UUID,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
