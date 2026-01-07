-- ============================================================================
-- SUPABASE LINTER INFO WARNINGS: Safe to Ignore
-- ============================================================================

-- These "unused index" warnings appear because the linter only checks
-- pg_stat_user_indexes.idx_scan (SELECT query usage).
-- It DOES NOT check if indexes are used by foreign key constraints.

-- ============================================================================
-- ✅ SAFE TO IGNORE: Foreign Key Indexes (14 warnings)
-- ============================================================================
-- These indexes are ACTIVELY USED by foreign key constraints.
-- They speed up DELETE/UPDATE CASCADE and referential integrity checks.
-- DO NOT DROP THESE!

-- 1. idx_alert_rules_created_by
--    Foreign key: alert_rules.created_by → users.id
--    Used when: Deleting users, checking who created rules

-- 2. idx_announcements_created_by
--    Foreign key: announcements.created_by → users.id
--    Used when: Deleting users, checking who created announcements

-- 3. idx_contact_submissions_resolved_by
--    Foreign key: contact_submissions.resolved_by → users.id
--    Used when: Deleting admin users, checking who resolved tickets

-- 4. idx_faqs_created_by
--    Foreign key: faqs.created_by → users.id
--    Used when: Deleting users, checking who created FAQs

-- 5. idx_flagged_content_flagged_by
--    Foreign key: flagged_content.flagged_by → users.id
--    Used when: Deleting users, checking who flagged content

-- 6. idx_flagged_content_reviewed_by
--    Foreign key: flagged_content.reviewed_by → users.id
--    Used when: Deleting admin users, checking who reviewed flags

-- 7. idx_offer_flags_reported_by
--    Foreign key: offer_flags.reported_by → users.id
--    Used when: Deleting users, checking who reported offers

-- 8. idx_offer_flags_reviewed_by
--    Foreign key: offer_flags.reviewed_by → users.id
--    Used when: Deleting admin users, checking who reviewed flags

-- 9. idx_system_config_updated_by
--    Foreign key: system_config.updated_by → users.id
--    Used when: Deleting admin users, checking who changed config

-- 10. idx_system_logs_user_id
--     Foreign key: system_logs.user_id → users.id
--     Used when: Deleting users, cleaning up their logs

-- 11. idx_system_settings_updated_by
--     Foreign key: system_settings.updated_by → users.id
--     Used when: Deleting admin users, checking who changed settings

-- 12. idx_user_bans_banned_by
--     Foreign key: user_bans.banned_by → users.id
--     Used when: Deleting admin users, checking who banned users

-- 13. idx_user_penalties_forgiveness_decided_by
--     Foreign key: user_penalties.forgiveness_decided_by → users.id
--     Used when: Deleting admin users, checking who forgave penalties

-- 14. idx_user_penalties_reviewed_by
--     Foreign key: user_penalties.reviewed_by → users.id
--     Used when: Deleting admin users, checking who reviewed penalties

-- ============================================================================
-- 🤔 REVIEW CASE-BY-CASE: Feature-Related Indexes (18 warnings)
-- ============================================================================
-- These might be needed for active features. Keep for now, drop later if
-- you're 100% sure the feature doesn't use them.

-- User Reliability (if this feature is used)
-- - idx_user_reliability_user_id
-- - idx_user_reliability_cooldown
-- - idx_user_reliability_score

-- Partners
-- - idx_partners_busy_mode

-- Notifications
-- - idx_notification_queue_batch
-- - idx_np_enable_telegram

-- Reservations
-- - idx_reservations_pending_confirmation

-- Alerts (used during incident response)
-- - idx_alert_events_acknowledged_by
-- - idx_alert_events_rule_id
-- - idx_security_alerts_partner
-- - idx_security_alerts_severity
-- - idx_security_alerts_type

-- Social/User Features
-- - idx_announcement_reads_user_id
-- - idx_direct_messages_sender_id
-- - idx_escrow_points_customer_id
-- - idx_referral_tracking_referred_user_id
-- - idx_user_achievements_achievement_id
-- - idx_users_referred_by
-- - idx_push_subscriptions_fcm_token

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- 
-- 📊 Total "Unused Index" Warnings: 32
-- 
-- ✅ IGNORE (Foreign keys): 14 warnings
--    - These ARE being used (by foreign key constraints)
--    - Linter can't detect this usage
--    - DO NOT DROP!
-- 
-- 🤔 MAYBE (Features): 18 warnings
--    - Keep if features are active
--    - Only drop after thorough testing
--    - Minimal space savings anyway (~200 KB total)
-- 
-- 💡 RECOMMENDATION: 
--    Ignore all these INFO warnings. Your database is well-indexed.
--    The foreign key indexes are doing their job behind the scenes.
-- 
-- ============================================================================
-- WHY THE LINTER SHOWS THESE AS "UNUSED"
-- ============================================================================
-- 
-- The Supabase linter checks:
--   SELECT idx_scan FROM pg_stat_user_indexes
-- 
-- This ONLY counts:
--   - SELECT queries using the index
--   - Explicit index scans in query plans
-- 
-- This DOES NOT count:
--   - Foreign key constraint validation
--   - CASCADE delete/update operations
--   - Referential integrity checks
-- 
-- So indexes on foreign key columns show as "unused" even though
-- PostgreSQL uses them constantly for foreign key operations!
-- 
-- ============================================================================
