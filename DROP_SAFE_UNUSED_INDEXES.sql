-- ============================================================================
-- SAFE TO DROP: Non-critical unused indexes
-- Based on your actual usage data - all showing 0 scans
-- ============================================================================

-- ⚠️ NEVER DROP (even if showing 0 scans):
-- - Primary keys (*_pkey)
-- - Unique constraints (*_key, unique_*)
-- - Security indexes (csrf_tokens, rate_limits)

-- ============================================================================
-- TIER 1: Definitely Safe (Admin audit trails) - Total ~112 KB
-- ============================================================================
-- These track WHO did admin actions, rarely queried

DROP INDEX IF EXISTS idx_alert_rules_created_by;              -- 8 KB
DROP INDEX IF EXISTS idx_announcements_created_by;            -- 16 KB
DROP INDEX IF EXISTS idx_faqs_created_by;                     -- 8 KB
DROP INDEX IF EXISTS idx_system_config_updated_by;            -- 16 KB
DROP INDEX IF EXISTS idx_system_settings_updated_by;          -- 16 KB
DROP INDEX IF EXISTS idx_contact_submissions_resolved_by;     -- 8 KB
DROP INDEX IF EXISTS idx_flagged_content_flagged_by;          -- 8 KB
DROP INDEX IF EXISTS idx_flagged_content_reviewed_by;         -- 8 KB
DROP INDEX IF EXISTS idx_offer_flags_reported_by;             -- 8 KB
DROP INDEX IF EXISTS idx_offer_flags_reviewed_by;             -- 8 KB
DROP INDEX IF EXISTS idx_user_bans_banned_by;                 -- 8 KB
DROP INDEX IF EXISTS idx_user_penalties_reviewed_by;          -- 16 KB
DROP INDEX IF EXISTS idx_user_penalties_forgiveness_decided_by; -- 16 KB

-- ============================================================================
-- TIER 2: Probably Safe (Historical/Metadata) - Total ~56 KB
-- ============================================================================
-- Log tables and metadata fields

DROP INDEX IF EXISTS idx_upload_log_time;                     -- 16 KB
DROP INDEX IF EXISTS idx_upload_log_partner_success;          -- 16 KB
DROP INDEX IF EXISTS idx_system_logs_user_id;                 -- 8 KB
DROP INDEX IF EXISTS idx_partners_cover_image;                -- 16 KB (visual only)

-- ============================================================================
-- TIER 3: Review First (Might be needed) - Total ~168 KB
-- ============================================================================
-- These relate to active features - test app thoroughly after dropping!

-- User reliability (if this feature is active, might need these)
-- DROP INDEX IF EXISTS idx_user_reliability_user_id;         -- 16 KB
-- DROP INDEX IF EXISTS idx_user_reliability_cooldown;        -- 8 KB
-- DROP INDEX IF EXISTS idx_user_reliability_score;           -- 16 KB

-- Partner operations
-- DROP INDEX IF EXISTS idx_partners_busy_mode;               -- 16 KB

-- Notifications (if telegram/batch notifications used)
-- DROP INDEX IF EXISTS idx_notification_queue_batch;         -- 8 KB
-- DROP INDEX IF EXISTS idx_np_enable_telegram;               -- 16 KB

-- Reservations
-- DROP INDEX IF EXISTS idx_reservations_pending_confirmation; -- 8 KB

-- Security alerts (might be needed during incidents)
-- DROP INDEX IF EXISTS idx_security_alerts_partner;          -- 16 KB
-- DROP INDEX IF EXISTS idx_security_alerts_severity;         -- 16 KB
-- DROP INDEX IF EXISTS idx_security_alerts_type;             -- 16 KB
-- DROP INDEX IF EXISTS idx_alert_events_acknowledged_by;     -- 8 KB
-- DROP INDEX IF EXISTS idx_alert_events_rule_id;             -- 8 KB

-- User social features
-- DROP INDEX IF EXISTS idx_users_referred_by;                -- 16 KB
-- DROP INDEX IF EXISTS idx_referral_tracking_referred_user_id; -- 8 KB
-- DROP INDEX IF EXISTS idx_announcement_reads_user_id;        -- 8 KB
-- DROP INDEX IF EXISTS idx_direct_messages_sender_id;         -- 8 KB
-- DROP INDEX IF EXISTS idx_user_achievements_achievement_id;  -- 16 KB

-- Payments
-- DROP INDEX IF EXISTS idx_escrow_points_customer_id;         -- 16 KB
-- DROP INDEX IF EXISTS idx_push_subscriptions_fcm_token;      -- 8 KB

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after dropping to verify they're gone
SELECT 
    relname as table_name,
    indexrelname as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as size_saved
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname IN (
    'idx_alert_rules_created_by',
    'idx_announcements_created_by',
    'idx_faqs_created_by',
    'idx_system_config_updated_by',
    'idx_system_settings_updated_by',
    'idx_contact_submissions_resolved_by',
    'idx_flagged_content_flagged_by',
    'idx_flagged_content_reviewed_by',
    'idx_offer_flags_reported_by',
    'idx_offer_flags_reviewed_by',
    'idx_user_bans_banned_by',
    'idx_user_penalties_reviewed_by',
    'idx_user_penalties_forgiveness_decided_by',
    'idx_upload_log_time',
    'idx_upload_log_partner_success',
    'idx_system_logs_user_id',
    'idx_partners_cover_image'
  );

-- Should return 0 rows if successfully dropped

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- TIER 1 (Safe): ~112 KB saved - Admin audit trails
-- TIER 2 (Safe): ~56 KB saved - Historical data
-- TIER 3 (Review): ~168 KB potential - Active features
-- 
-- TOTAL SAFE TO DROP NOW: ~168 KB
-- 
-- Recommendation: Drop Tier 1 & 2 now, monitor app performance.
-- If everything works fine after a week, consider Tier 3.
-- ============================================================================
