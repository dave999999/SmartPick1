-- ============================================================================
-- UNUSED INDEXES REVIEW
-- INFO level - not urgent, optional cleanup
-- ============================================================================

-- ⚠️ DON'T DROP BLINDLY! Review each one first.
-- Some indexes might be needed for:
-- - Admin features
-- - Rare operations (bans, referrals, security)
-- - Features not yet implemented
-- - Low-traffic parts of app

-- ============================================================================
-- STEP 1: Check Index Sizes (Which ones waste the most space?)
-- ============================================================================
SELECT
    schemaname,
    relname as table_name,
    indexrelname as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    idx_tup_read as rows_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- Never used
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- STEP 2: Safe to Drop (Likely unused forever)
-- ============================================================================
-- These are probably safe because:
-- - Admin audit fields (created_by, updated_by, reviewed_by)
-- - Cover images (visual only)
-- - Upload logs (historical data, rarely queried)

/*
-- Uncomment to drop (ONE AT A TIME, test after each!)

-- Admin audit trails (rarely queried by index)
DROP INDEX IF EXISTS idx_alert_rules_created_by;
DROP INDEX IF EXISTS idx_announcements_created_by;
DROP INDEX IF EXISTS idx_faqs_created_by;
DROP INDEX IF EXISTS idx_system_config_updated_by;
DROP INDEX IF EXISTS idx_system_settings_updated_by;
DROP INDEX IF EXISTS idx_contact_submissions_resolved_by;
DROP INDEX IF EXISTS idx_flagged_content_flagged_by;
DROP INDEX IF EXISTS idx_flagged_content_reviewed_by;
DROP INDEX IF EXISTS idx_offer_flags_reported_by;
DROP INDEX IF EXISTS idx_offer_flags_reviewed_by;
DROP INDEX IF EXISTS idx_user_bans_banned_by;
DROP INDEX IF EXISTS idx_user_penalties_reviewed_by;
DROP INDEX IF EXISTS idx_user_penalties_forgiveness_decided_by;

-- Visual/metadata fields
DROP INDEX IF EXISTS idx_partners_cover_image;

-- Historical logs (rarely queried)
DROP INDEX IF EXISTS idx_upload_log_time;
DROP INDEX IF EXISTS idx_upload_log_partner_success;
DROP INDEX IF EXISTS idx_system_logs_user_id;
*/

-- ============================================================================
-- STEP 3: Maybe Keep (Might be needed)
-- ============================================================================
-- These MIGHT be useful for:
-- - Active features
-- - Performance on specific queries
-- - Future needs

/*
-- REVIEW BEFORE DROPPING!

-- User reliability (active feature?)
DROP INDEX IF EXISTS idx_user_reliability_user_id;
DROP INDEX IF EXISTS idx_user_reliability_cooldown;
DROP INDEX IF EXISTS idx_user_reliability_score;

-- Partner operations
DROP INDEX IF EXISTS idx_partners_busy_mode;

-- Notifications
DROP INDEX IF EXISTS idx_notification_queue_batch;
DROP INDEX IF EXISTS idx_np_enable_telegram;

-- Reservations
DROP INDEX IF EXISTS idx_reservations_pending_confirmation;

-- Alerts (might be used during incidents)
DROP INDEX IF EXISTS idx_alert_events_acknowledged_by;
DROP INDEX IF EXISTS idx_alert_events_rule_id;
DROP INDEX IF EXISTS idx_security_alerts_partner;
DROP INDEX IF EXISTS idx_security_alerts_severity;
DROP INDEX IF EXISTS idx_security_alerts_type;

-- User features
DROP INDEX IF EXISTS idx_users_referred_by;
DROP INDEX IF EXISTS idx_referral_tracking_referred_user_id;
DROP INDEX IF EXISTS idx_user_achievements_achievement_id;
DROP INDEX IF EXISTS idx_announcement_reads_user_id;
DROP INDEX IF EXISTS idx_direct_messages_sender_id;
DROP INDEX IF EXISTS idx_escrow_points_customer_id;
DROP INDEX IF EXISTS idx_push_subscriptions_fcm_token;
*/

-- ============================================================================
-- STEP 4: Verify Impact (Run BEFORE dropping any index)
-- ============================================================================
-- Check if any queries might need this index
-- Replace 'index_name' with the index you're considering dropping

/*
SELECT 
    schemaname,
    relname as table_name,
    indexrelname as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as size_saved
FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_partners_cover_image';  -- Change this
*/

-- ============================================================================
-- BEST PRACTICE: Drop Largest Unused Indexes First
-- ============================================================================
-- Focus on indexes that:
-- 1. Are large (save most space)
-- 2. Clearly unused (admin audit fields)
-- 3. Not related to core features (reservations, partners, reliability)

-- After dropping, monitor for slow queries. If something breaks, recreate:
-- CREATE INDEX idx_name ON table_name(column_name);

-- ============================================================================
