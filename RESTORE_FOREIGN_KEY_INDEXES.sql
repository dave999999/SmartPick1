-- ============================================================================
-- RESTORE INDEXES: Needed for Foreign Key Performance
-- The indexes we dropped are actually used by foreign key constraints!
-- ============================================================================

-- ⚠️ IMPORTANT: "Unused" by SELECT queries, but USED by foreign keys
-- Foreign key indexes speed up:
-- - DELETE/UPDATE CASCADE operations
-- - Referential integrity checks
-- - JOIN operations on foreign keys

-- ============================================================================
-- RESTORE DROPPED INDEXES (They're needed for foreign keys!)
-- ============================================================================

-- Alert Rules
CREATE INDEX IF NOT EXISTS idx_alert_rules_created_by 
  ON public.alert_rules(created_by);

-- Announcements  
CREATE INDEX IF NOT EXISTS idx_announcements_created_by 
  ON public.announcements(created_by);

-- Contact Submissions
CREATE INDEX IF NOT EXISTS idx_contact_submissions_resolved_by 
  ON public.contact_submissions(resolved_by);

-- FAQs
CREATE INDEX IF NOT EXISTS idx_faqs_created_by 
  ON public.faqs(created_by);

-- Flagged Content
CREATE INDEX IF NOT EXISTS idx_flagged_content_flagged_by 
  ON public.flagged_content(flagged_by);

CREATE INDEX IF NOT EXISTS idx_flagged_content_reviewed_by 
  ON public.flagged_content(reviewed_by);

-- Offer Flags
CREATE INDEX IF NOT EXISTS idx_offer_flags_reported_by 
  ON public.offer_flags(reported_by);

CREATE INDEX IF NOT EXISTS idx_offer_flags_reviewed_by 
  ON public.offer_flags(reviewed_by);

-- System Config
CREATE INDEX IF NOT EXISTS idx_system_config_updated_by 
  ON public.system_config(updated_by);

-- System Logs
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id 
  ON public.system_logs(user_id);

-- System Settings
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by 
  ON public.system_settings(updated_by);

-- User Bans
CREATE INDEX IF NOT EXISTS idx_user_bans_banned_by 
  ON public.user_bans(banned_by);

-- User Penalties
CREATE INDEX IF NOT EXISTS idx_user_penalties_forgiveness_decided_by 
  ON public.user_penalties(forgiveness_decided_by);

CREATE INDEX IF NOT EXISTS idx_user_penalties_reviewed_by 
  ON public.user_penalties(reviewed_by);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that all foreign keys now have covering indexes
SELECT
    tc.table_name,
    tc.constraint_name as fkey_name,
    kcu.column_name,
    CASE 
        WHEN idx.indexname IS NOT NULL THEN '✅ Indexed'
        ELSE '❌ Missing Index'
    END as index_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN pg_indexes idx
  ON idx.tablename = tc.table_name
  AND idx.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'alert_rules', 'announcements', 'contact_submissions', 'faqs',
    'flagged_content', 'offer_flags', 'system_config', 'system_logs',
    'system_settings', 'user_bans', 'user_penalties'
  )
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- EXPLANATION
-- ============================================================================
-- 
-- Why restore these indexes?
-- 
-- 1. FOREIGN KEY CONSTRAINTS NEED THEM
--    - When you DELETE a user, PostgreSQL must find all records in 
--      alert_rules, announcements, etc. that reference that user
--    - Without an index, this requires a FULL TABLE SCAN (very slow!)
-- 
-- 2. "UNUSED" IS MISLEADING
--    - pg_stat_user_indexes.idx_scan tracks SELECT query usage
--    - It does NOT track foreign key constraint checks
--    - So these indexes ARE used, just not by your app queries
-- 
-- 3. PERFORMANCE IMPACT
--    - Without index: DELETE user → scan entire audit trail tables
--    - With index: DELETE user → instant lookup using index
-- 
-- ============================================================================
-- ACTUALLY SAFE TO DROP (Non-foreign-key indexes)
-- ============================================================================

-- These are truly optional (not related to foreign keys):

DROP INDEX IF EXISTS idx_upload_log_time;                     -- 16 KB
DROP INDEX IF EXISTS idx_upload_log_partner_success;          -- 16 KB
DROP INDEX IF EXISTS idx_partners_cover_image;                -- 16 KB

-- Total saved: ~48 KB (minimal impact)

-- ============================================================================
-- LESSON LEARNED
-- ============================================================================
-- 
-- Before dropping an "unused" index, check if it covers a foreign key:
-- 
-- SELECT 
--     tc.constraint_name,
--     kcu.column_name
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu 
--   ON tc.constraint_name = kcu.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_name = 'your_table'
--   AND kcu.column_name = 'your_column';
-- 
-- If it returns rows → DON'T DROP THE INDEX!
-- ============================================================================
