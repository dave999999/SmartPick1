-- ============================================================================
-- ADD MISSING FOREIGN KEY INDEXES FOR PERFORMANCE
-- ============================================================================
-- These 23 foreign keys need indexes to avoid table scans during JOINs
-- Based on actual Supabase linter warnings (unindexed_foreign_keys)
-- ============================================================================

BEGIN;

-- ============================================================================
-- ALL 23 UNINDEXED FOREIGN KEYS
-- ============================================================================

-- 1. alert_events: acknowledged_by (column 11)
CREATE INDEX IF NOT EXISTS idx_alert_events_acknowledged_by 
ON public.alert_events(acknowledged_by);

-- 2. alert_events: rule_id (column 2)
CREATE INDEX IF NOT EXISTS idx_alert_events_rule_id 
ON public.alert_events(rule_id);

-- 3. alert_rules: created_by (column 16)
CREATE INDEX IF NOT EXISTS idx_alert_rules_created_by 
ON public.alert_rules(created_by);

-- 4. announcement_reads: user_id (column 3)
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id 
ON public.announcement_reads(user_id);

-- 5. announcements: created_by (column 7)
CREATE INDEX IF NOT EXISTS idx_announcements_created_by 
ON public.announcements(created_by);

-- 6. contact_submissions: resolved_by (column 13)
CREATE INDEX IF NOT EXISTS idx_contact_submissions_resolved_by 
ON public.contact_submissions(resolved_by);

-- 7. direct_messages: sender_id (column 4)
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id 
ON public.direct_messages(sender_id);

-- 8. escrow_points: customer_id (column 3)
CREATE INDEX IF NOT EXISTS idx_escrow_points_customer_id 
ON public.escrow_points(customer_id);

-- 9. faqs: created_by (column 7)
CREATE INDEX IF NOT EXISTS idx_faqs_created_by 
ON public.faqs(created_by);

-- 10. flagged_content: flagged_by (column 4)
CREATE INDEX IF NOT EXISTS idx_flagged_content_flagged_by 
ON public.flagged_content(flagged_by);

-- 11. flagged_content: reviewed_by (column 10)
CREATE INDEX IF NOT EXISTS idx_flagged_content_reviewed_by 
ON public.flagged_content(reviewed_by);

-- 12. offer_flags: reported_by (column 3)
CREATE INDEX IF NOT EXISTS idx_offer_flags_reported_by 
ON public.offer_flags(reported_by);

-- 13. offer_flags: reviewed_by (column 7)
CREATE INDEX IF NOT EXISTS idx_offer_flags_reviewed_by 
ON public.offer_flags(reviewed_by);

-- 14. referral_tracking: referred_user_id (column 3)
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referred_user_id 
ON public.referral_tracking(referred_user_id);

-- 15. reservations: penalty_id (column 24)
CREATE INDEX IF NOT EXISTS idx_reservations_penalty_id 
ON public.reservations(penalty_id);

-- 16. system_config: updated_by (column 29)
CREATE INDEX IF NOT EXISTS idx_system_config_updated_by 
ON public.system_config(updated_by);

-- 17. system_logs: user_id (column 6)
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id 
ON public.system_logs(user_id);

-- 18. system_settings: updated_by (column 5)
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by 
ON public.system_settings(updated_by);

-- 19. user_achievements: achievement_id (column 3)
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id 
ON public.user_achievements(achievement_id);

-- 20. user_bans: banned_by (column 3)
CREATE INDEX IF NOT EXISTS idx_user_bans_banned_by 
ON public.user_bans(banned_by);

-- 21. user_penalties: forgiveness_decided_by (column 22)
CREATE INDEX IF NOT EXISTS idx_user_penalties_forgiveness_decided_by 
ON public.user_penalties(forgiveness_decided_by);

-- 22. user_penalties: reviewed_by (column 28)
CREATE INDEX IF NOT EXISTS idx_user_penalties_reviewed_by 
ON public.user_penalties(reviewed_by);

-- 23. users: referred_by (column 14)
CREATE INDEX IF NOT EXISTS idx_users_referred_by 
ON public.users(referred_by);

-- ============================================================================
-- COMMIT CHANGES
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFY INDEXES CREATED
-- ============================================================================
SELECT 
  '23 foreign key indexes created successfully!' as status,
  COUNT(*) as total_indexes
FROM pg_indexes 
WHERE schemaname = 'public';

-- List all newly created FK indexes
SELECT 
  tablename,
  indexname
FROM pg_indexes 
WHERE schemaname = 'public'
  AND (
    indexname = 'idx_alert_events_acknowledged_by' OR
    indexname = 'idx_alert_events_rule_id' OR
    indexname = 'idx_alert_rules_created_by' OR
    indexname = 'idx_announcement_reads_user_id' OR
    indexname = 'idx_announcements_created_by' OR
    indexname = 'idx_contact_submissions_resolved_by' OR
    indexname = 'idx_direct_messages_sender_id' OR
    indexname = 'idx_escrow_points_customer_id' OR
    indexname = 'idx_faqs_created_by' OR
    indexname = 'idx_flagged_content_flagged_by' OR
    indexname = 'idx_flagged_content_reviewed_by' OR
    indexname = 'idx_offer_flags_reported_by' OR
    indexname = 'idx_offer_flags_reviewed_by' OR
    indexname = 'idx_referral_tracking_referred_user_id' OR
    indexname = 'idx_reservations_penalty_id' OR
    indexname = 'idx_system_config_updated_by' OR
    indexname = 'idx_system_logs_user_id' OR
    indexname = 'idx_system_settings_updated_by' OR
    indexname = 'idx_user_achievements_achievement_id' OR
    indexname = 'idx_user_bans_banned_by' OR
    indexname = 'idx_user_penalties_forgiveness_decided_by' OR
    indexname = 'idx_user_penalties_reviewed_by' OR
    indexname = 'idx_users_referred_by'
  )
ORDER BY tablename, indexname;
