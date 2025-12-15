-- ============================================================================
-- FIX SUPABASE DATABASE LINTER WARNINGS
-- ============================================================================
-- This script fixes:
-- 1. auth_rls_initplan warnings (119) - wrap auth functions in subqueries
-- 2. multiple_permissive_policies warnings (148) - consolidate duplicate policies
-- 3. duplicate_index warnings (5) - drop duplicate indexes
--
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT!
-- Test in a staging environment first.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: DROP DUPLICATE INDEXES (5 fixes)
-- ============================================================================

-- Fix: partner_points duplicate indexes
-- Note: Keeping the most specific index
-- DROP INDEX IF EXISTS idx_partner_points_partner_id; -- Commented out - verify which index exists

-- Fix: partners duplicate indexes
DROP INDEX IF EXISTS idx_partners_status_approved; -- Keep idx_partners_approved
DROP INDEX IF EXISTS idx_partners_location_gist; -- Keep partners_location_gist

-- Fix: points_history duplicate indexes
DROP INDEX IF EXISTS points_unique_reservation_idx; -- Keep points_unique_idx

-- Fix: reservations duplicate indexes
DROP INDEX IF EXISTS uniq_reservations_qr_code; -- Keep reservations_qr_code_key

-- Fix: user_achievements duplicate indexes
DROP INDEX IF EXISTS idx_user_achievements_progress; -- Keep idx_user_achievements_lookup

-- ============================================================================
-- PART 2: FIX AUTH RLS INITPLAN WARNINGS (119 fixes)
-- ============================================================================
-- Replace auth.uid() with (select auth.uid()) in all RLS policies
-- ============================================================================

-- achievement_definitions policies
DROP POLICY IF EXISTS "Anyone can view achievement definitions" ON public.achievement_definitions;
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievement_definitions;

CREATE POLICY "Anyone can view achievement definitions" ON public.achievement_definitions
FOR SELECT USING (true);

-- categories policies  
DROP POLICY IF EXISTS "Allow authenticated users to read categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;

CREATE POLICY "Allow public read access to categories" ON public.categories
FOR SELECT USING (true);

-- user_bans policies (3 policies)
DROP POLICY IF EXISTS "Admins can view all bans" ON public.user_bans;
CREATE POLICY "Admins can view all bans" ON public.user_bans
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can create bans" ON public.user_bans;
CREATE POLICY "Admins can create bans" ON public.user_bans
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update bans" ON public.user_bans;
CREATE POLICY "Admins can update bans" ON public.user_bans
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- user_stats policy
DROP POLICY IF EXISTS "user_stats_select_own" ON public.user_stats;
CREATE POLICY "user_stats_select_own" ON public.user_stats
FOR SELECT USING (user_id = (SELECT auth.uid()));

-- app_config policy
DROP POLICY IF EXISTS "Only admins can modify app config" ON public.app_config;
DROP POLICY IF EXISTS "Anyone can read app config" ON public.app_config;

-- Public read access
CREATE POLICY "Anyone can read app config" ON public.app_config
FOR SELECT USING (true);

-- Admin manage access
CREATE POLICY "Only admins can modify app config" ON public.app_config
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "Only admins can update app config" ON public.app_config
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "Only admins can delete app config" ON public.app_config
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- user_cancellation_tracking policy
DROP POLICY IF EXISTS "user_cancellation_tracking_select" ON public.user_cancellation_tracking;
CREATE POLICY "user_cancellation_tracking_select" ON public.user_cancellation_tracking
FOR SELECT USING (user_id = (SELECT auth.uid()));

-- flagged_content policies (4 policies)
DROP POLICY IF EXISTS "Admins can view all flags" ON public.flagged_content;
CREATE POLICY "Admins can view all flags" ON public.flagged_content
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can view their own flags" ON public.flagged_content;
CREATE POLICY "Users can view their own flags" ON public.flagged_content
FOR SELECT USING (flagged_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create flags" ON public.flagged_content;
CREATE POLICY "Users can create flags" ON public.flagged_content
FOR INSERT WITH CHECK (flagged_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can update flags" ON public.flagged_content;
CREATE POLICY "Admins can update flags" ON public.flagged_content
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- users policies (2 policies)
DROP POLICY IF EXISTS "users_can_read_own_or_public" ON public.users;
CREATE POLICY "users_can_read_own_or_public" ON public.users
FOR SELECT USING (
  id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "users_can_update_own" ON public.users;
CREATE POLICY "users_can_update_own" ON public.users
FOR UPDATE USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT USING (
  id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- user_points policies (6 policies)
DROP POLICY IF EXISTS "Users can view own points or admin sees all" ON public.user_points;
CREATE POLICY "Users can view own points or admin sees all" ON public.user_points
FOR SELECT USING (
  user_id = (SELECT auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;
DROP POLICY IF EXISTS "user_points_select_own" ON public.user_points;
-- Consolidated in policy above

DROP POLICY IF EXISTS "authenticated_manage_user_points" ON public.user_points;
CREATE POLICY "authenticated_manage_user_points" ON public.user_points
FOR ALL USING (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'partner')
  )
);

DROP POLICY IF EXISTS "service_role_manage_user_points" ON public.user_points;
CREATE POLICY "service_role_manage_user_points" ON public.user_points
FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- point_transactions policies (3 policies)
DROP POLICY IF EXISTS "Users can view own transactions or admin sees all" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "point_transactions_select_own" ON public.point_transactions;
CREATE POLICY "Users can view own transactions or admin sees all" ON public.point_transactions
FOR SELECT USING (
  user_id = (SELECT auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- email_verification_tokens policy
DROP POLICY IF EXISTS "Users can view own verification tokens" ON public.email_verification_tokens;
CREATE POLICY "Users can view own verification tokens" ON public.email_verification_tokens
FOR SELECT USING (user_id = (SELECT auth.uid()));

-- password_reset_tokens policy
DROP POLICY IF EXISTS "Users can view own reset tokens" ON public.password_reset_tokens;
CREATE POLICY "Users can view own reset tokens" ON public.password_reset_tokens
FOR SELECT USING (user_id = (SELECT auth.uid()));

-- partner_points policies (3 policies)
DROP POLICY IF EXISTS "authenticated_manage_partner_points" ON public.partner_points;
DROP POLICY IF EXISTS "service_role_manage_partner_points" ON public.partner_points;
DROP POLICY IF EXISTS "partners_view_own_points" ON public.partner_points;
DROP POLICY IF EXISTS "partners_read_own_points" ON public.partner_points;
DROP POLICY IF EXISTS "admin_full_access_partner_points" ON public.partner_points;
DROP POLICY IF EXISTS "authenticated_read_partner_points" ON public.partner_points;

CREATE POLICY "partner_points_manage" ON public.partner_points
FOR ALL USING (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ) OR
  (SELECT auth.role()) = 'service_role'
);

-- system_config policies (2 policies)
DROP POLICY IF EXISTS "Admins can read system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can update system config" ON public.system_config;
CREATE POLICY "Admins can manage system config" ON public.system_config
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- escrow_points policies (4 policies)
DROP POLICY IF EXISTS "service_role_all" ON public.escrow_points;
DROP POLICY IF EXISTS "admin_all" ON public.escrow_points;
DROP POLICY IF EXISTS "user_read_own" ON public.escrow_points;
DROP POLICY IF EXISTS "partner_read_own" ON public.escrow_points;

CREATE POLICY "escrow_points_policy" ON public.escrow_points
FOR ALL USING (
  (SELECT auth.role()) = 'service_role' OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ) OR
  reservation_id IN (
    SELECT id FROM public.reservations WHERE user_id = (SELECT auth.uid())
  ) OR
  reservation_id IN (
    SELECT r.id FROM public.reservations r
    INNER JOIN public.offers o ON r.offer_id = o.id
    INNER JOIN public.partners p ON o.partner_id = p.id
    WHERE p.user_id = (SELECT auth.uid())
  )
);

-- user_achievements policies (3 policies)
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can update their own achievements" ON public.user_achievements;

CREATE POLICY "Users manage own achievements" ON public.user_achievements
FOR ALL USING (user_id = (SELECT auth.uid()));

-- notification_preferences policies (3 policies)
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users manage own preferences" ON public.notification_preferences;

CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
FOR ALL USING (user_id = (SELECT auth.uid()));

-- partners policies (5 policies)
DROP POLICY IF EXISTS "Partners can view own data" ON public.partners;
DROP POLICY IF EXISTS "partners_view_own" ON public.partners;
DROP POLICY IF EXISTS "partners_update_own" ON public.partners;
DROP POLICY IF EXISTS "users_create_partner" ON public.partners;
DROP POLICY IF EXISTS "admins_manage_partners" ON public.partners;
DROP POLICY IF EXISTS "public_view_approved_partners" ON public.partners;

-- Public read access for approved partners
CREATE POLICY "public_view_approved_partners" ON public.partners
FOR SELECT USING (status = 'approved');

-- Manage access for partners and admins
CREATE POLICY "partners_manage" ON public.partners
FOR ALL USING (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
) WITH CHECK (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- reservations policies (7 policies)
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Customers can read their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "users_view_own_reservations" ON public.reservations;
DROP POLICY IF EXISTS "users_create_reservations" ON public.reservations;
DROP POLICY IF EXISTS "users_update_own_reservations" ON public.reservations;
DROP POLICY IF EXISTS "Partners can view reservations for their offers" ON public.reservations;
DROP POLICY IF EXISTS "partners_view_their_reservations" ON public.reservations;
DROP POLICY IF EXISTS "partners_update_their_reservations" ON public.reservations;
DROP POLICY IF EXISTS "admins_manage_reservations" ON public.reservations;

CREATE POLICY "reservations_manage" ON public.reservations
FOR ALL USING (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ) OR
  offer_id IN (
    SELECT o.id FROM public.offers o
    INNER JOIN public.partners p ON o.partner_id = p.id
    WHERE p.user_id = (SELECT auth.uid())
  )
) WITH CHECK (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ) OR
  offer_id IN (
    SELECT o.id FROM public.offers o
    INNER JOIN public.partners p ON o.partner_id = p.id
    WHERE p.user_id = (SELECT auth.uid())
  )
);

-- user_penalties policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_penalties') THEN
    DROP POLICY IF EXISTS "Users can view own penalties" ON public.user_penalties;
    DROP POLICY IF EXISTS "Partners can view penalties for their offers" ON public.user_penalties;
    DROP POLICY IF EXISTS "Partners can update forgiveness decisions" ON public.user_penalties;
    DROP POLICY IF EXISTS "Admins can view all penalties" ON public.user_penalties;
    DROP POLICY IF EXISTS "Admins can update all penalties" ON public.user_penalties;
    DROP POLICY IF EXISTS "Users can acknowledge own penalties" ON public.user_penalties;

    CREATE POLICY "user_penalties_manage" ON public.user_penalties
    FOR ALL USING (
      user_id = (SELECT auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      ) OR
      reservation_id IN (
        SELECT r.id FROM public.reservations r
        INNER JOIN public.offers o ON r.offer_id = o.id
        INNER JOIN public.partners p ON o.partner_id = p.id
        WHERE p.user_id = (SELECT auth.uid())
      )
    );
  END IF;
END $$;

-- audit_logs policy
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- offer_flags policies (2 policies)
DROP POLICY IF EXISTS "Admins can manage offer flags" ON public.offer_flags;
DROP POLICY IF EXISTS "Users can report offers" ON public.offer_flags;

CREATE POLICY "offer_flags_manage" ON public.offer_flags
FOR ALL USING (
  reported_by = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
) WITH CHECK (
  reported_by = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- push_subscriptions policy
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions
FOR ALL USING (user_id = (SELECT auth.uid()));

-- faqs policy
DROP POLICY IF EXISTS "Admins can manage FAQs" ON public.faqs;
DROP POLICY IF EXISTS "Anyone can view published FAQs" ON public.faqs;

-- Public read for published FAQs
CREATE POLICY "Anyone can view published FAQs" ON public.faqs
FOR SELECT USING (is_published = true);

-- Admin manage access
CREATE POLICY "Admins can manage FAQs" ON public.faqs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- system_logs policy
DROP POLICY IF EXISTS "Admins can view system logs" ON public.system_logs;
CREATE POLICY "Admins can view system logs" ON public.system_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- referral_tracking policies (4 policies)
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referral_tracking;
DROP POLICY IF EXISTS "Users can view records where they were referred" ON public.referral_tracking;
DROP POLICY IF EXISTS "Service role has full access to referral tracking" ON public.referral_tracking;
DROP POLICY IF EXISTS "Users can create referral records when being referred" ON public.referral_tracking;

CREATE POLICY "referral_tracking_manage" ON public.referral_tracking
FOR ALL USING (
  referrer_id = (SELECT auth.uid()) OR
  referred_user_id = (SELECT auth.uid()) OR
  (SELECT auth.role()) = 'service_role'
);

-- referral_limits policy
DROP POLICY IF EXISTS "Users can view their own referral limits" ON public.referral_limits;
DROP POLICY IF EXISTS "Service role has full access to referral limits" ON public.referral_limits;

CREATE POLICY "referral_limits_manage" ON public.referral_limits
FOR ALL USING (
  user_id = (SELECT auth.uid()) OR
  (SELECT auth.role()) = 'service_role'
);

-- user_activity policy
DROP POLICY IF EXISTS "Admins can view all user activity" ON public.user_activity;
CREATE POLICY "Admins can view all user activity" ON public.user_activity
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- app_metadata policy
DROP POLICY IF EXISTS "Admins can manage app metadata" ON public.app_metadata;
DROP POLICY IF EXISTS "Anyone can read app metadata" ON public.app_metadata;

-- Public read access
CREATE POLICY "Anyone can read app metadata" ON public.app_metadata
FOR SELECT USING (true);

-- Admin manage access
CREATE POLICY "Admins can manage app metadata" ON public.app_metadata
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- penalty_offense_history policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'penalty_offense_history') THEN
    DROP POLICY IF EXISTS "Users can view own offense history" ON public.penalty_offense_history;
    DROP POLICY IF EXISTS "Admins can view all offense history" ON public.penalty_offense_history;

    CREATE POLICY "penalty_offense_history_view" ON public.penalty_offense_history
    FOR SELECT USING (
      user_id = (SELECT auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
  END IF;
END $$;

-- penalty_point_transactions policy (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'penalty_point_transactions') THEN
    DROP POLICY IF EXISTS "Users can view own point transactions" ON public.penalty_point_transactions;
    CREATE POLICY "Users can view own point transactions" ON public.penalty_point_transactions
    FOR SELECT USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- system_settings policy
DROP POLICY IF EXISTS "Only admins can update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;

-- Public read access
CREATE POLICY "Anyone can read system settings" ON public.system_settings
FOR SELECT USING (true);

-- Admin manage access
CREATE POLICY "Admins can manage system settings" ON public.system_settings
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "Admins can update system settings" ON public.system_settings
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete system settings" ON public.system_settings
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- audit_log policies
DROP POLICY IF EXISTS "audit_log_select_admin" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert_service" ON public.audit_log;

CREATE POLICY "audit_log_manage" ON public.audit_log
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ) OR
  (SELECT auth.role()) = 'service_role'
);

-- point_purchase_orders policies
DROP POLICY IF EXISTS "Users can view own purchase orders" ON public.point_purchase_orders;
DROP POLICY IF EXISTS "Users can create own purchase orders" ON public.point_purchase_orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.point_purchase_orders;

CREATE POLICY "point_purchase_orders_manage" ON public.point_purchase_orders
FOR ALL USING (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- contact_submissions policies
DROP POLICY IF EXISTS "Users can view own submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON public.contact_submissions;

CREATE POLICY "contact_submissions_manage" ON public.contact_submissions
FOR ALL USING (
  (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))) OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);

-- offers policies
DROP POLICY IF EXISTS "partners_manage_own_offers" ON public.offers;
DROP POLICY IF EXISTS "admins_manage_offers" ON public.offers;
DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
DROP POLICY IF EXISTS "public_view_active_offers" ON public.offers;

-- Public read access for active offers
CREATE POLICY "public_view_active_offers" ON public.offers
FOR SELECT USING (
  status = 'active' AND 
  is_flagged = false
);

-- Manage access for partners and admins
CREATE POLICY "offers_manage" ON public.offers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  ) OR
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

-- partner_point_transactions policy
DROP POLICY IF EXISTS "partners_view_own_transactions" ON public.partner_point_transactions;
CREATE POLICY "partners_view_own_transactions" ON public.partner_point_transactions
FOR SELECT USING (
  partner_id IN (
    SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
  )
);

-- alert_rules policy (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alert_rules') THEN
    DROP POLICY IF EXISTS "admin_alert_rules_all" ON public.alert_rules;
    CREATE POLICY "admin_alert_rules_all" ON public.alert_rules
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
  END IF;
END $$;

-- alert_events policy (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alert_events') THEN
    DROP POLICY IF EXISTS "admin_alert_events_all" ON public.alert_events;
    CREATE POLICY "admin_alert_events_all" ON public.alert_events
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
  END IF;
END $$;

-- system_alerts policy (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_alerts') THEN
    DROP POLICY IF EXISTS "admin_system_alerts_all" ON public.system_alerts;
    CREATE POLICY "admin_system_alerts_all" ON public.system_alerts
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
  END IF;
END $$;

-- partner_activity_logs policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'partner_activity_logs') THEN
    DROP POLICY IF EXISTS "partners_view_own_activity" ON public.partner_activity_logs;
    DROP POLICY IF EXISTS "partners_insert_own_activity" ON public.partner_activity_logs;
    DROP POLICY IF EXISTS "admins_view_all_activity" ON public.partner_activity_logs;

    CREATE POLICY "partner_activity_logs_manage" ON public.partner_activity_logs
    FOR ALL USING (
      partner_id IN (
        SELECT id FROM public.partners WHERE user_id = (SELECT auth.uid())
      ) OR
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
  END IF;
END $$;

-- announcement_reads policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcement_reads') THEN
    DROP POLICY IF EXISTS "users_announcement_reads" ON public.announcement_reads;
    DROP POLICY IF EXISTS "admin_announcement_reads" ON public.announcement_reads;

    CREATE POLICY "announcement_reads_manage" ON public.announcement_reads
    FOR ALL USING (
      user_id = (SELECT auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
  END IF;
END $$;

-- direct_messages policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'direct_messages') THEN
    DROP POLICY IF EXISTS "read_own_messages" ON public.direct_messages;
    DROP POLICY IF EXISTS "admin_direct_messages" ON public.direct_messages;

    CREATE POLICY "direct_messages_manage" ON public.direct_messages
    FOR ALL USING (
      sender_id = (SELECT auth.uid()) OR
      recipient_id = (SELECT auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
      )
    );
  END IF;
END $$;

-- ============================================================================
-- COMMIT CHANGES
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFY CHANGES
-- ============================================================================
SELECT 
  'RLS Policies Fixed' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public';

SELECT 
  'Indexes Cleaned' as status,
  COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public';
