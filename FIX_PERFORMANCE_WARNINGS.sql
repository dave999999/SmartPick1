-- =====================================================
-- FIX: Supabase Performance Warnings
-- =====================================================
-- PART 1: Add missing foreign key indexes (CRITICAL)
-- PART 2: Remove truly unused indexes (CONSERVATIVE)
-- =====================================================

-- ============================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- ============================================
-- These are CRITICAL for JOIN performance and cascading deletes

-- 1. ip_blocklist.blocked_by (admin who blocked IP)
CREATE INDEX IF NOT EXISTS idx_ip_blocklist_blocked_by 
ON public.ip_blocklist(blocked_by);

-- 2. suspicious_activity.resolved_by (admin who resolved incident)
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_resolved_by 
ON public.suspicious_activity(resolved_by);

-- 3. user_missed_pickups.reservation_id (link to reservation)
-- Note: This table exists if you're using 3-warning missed pickup system
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_missed_pickups') THEN
    CREATE INDEX IF NOT EXISTS idx_user_missed_pickups_reservation_id 
    ON public.user_missed_pickups(reservation_id);
  END IF;
END $$;

-- ============================================
-- PART 2: REMOVE UNUSED INDEXES (CONSERVATIVE)
-- ============================================
-- Only removing indexes that are:
-- 1. For features not yet implemented
-- 2. Truly redundant (covered by other indexes)
-- 3. Low-value (on rarely queried columns)

-- KEEP ALL THESE (important for future use):
-- - User achievements indexes (feature will be heavily used)
-- - User stats indexes (gamification queries)
-- - Admin panel indexes (audit logs, flags, etc.)
-- - Security indexes (rate limits, suspicious activity)
-- - Referral system indexes

-- REMOVE ONLY THESE (safe to remove):

-- 1. idx_users_phone_lookup - Phone login not implemented yet
-- Uncomment if you're sure phone auth won't be used:
-- DROP INDEX IF EXISTS public.idx_users_phone_lookup;

-- 2. idx_notification_queue_batch - Batch processing not implemented
-- Uncomment if you're not using batch notification processing:
-- DROP INDEX IF EXISTS public.idx_notification_queue_batch;

-- 3. idx_reservations_pending_confirmation - No pending confirmation status
-- Uncomment if this status doesn't exist in your workflow:
-- DROP INDEX IF EXISTS public.idx_reservations_pending_confirmation;

-- ============================================
-- VERIFICATION
-- ============================================

-- Show all foreign key indexes
SELECT 
  'Foreign Key Indexes Added' as status,
  indexname,
  tablename
FROM pg_indexes
WHERE indexname IN (
  'idx_ip_blocklist_blocked_by',
  'idx_suspicious_activity_resolved_by',
  'idx_user_missed_pickups_reservation_id'
)
ORDER BY tablename, indexname;

-- Show index usage statistics for "unused" indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%user_achievements%'
ORDER BY idx_scan;

-- ============================================
-- RECOMMENDATIONS BY FEATURE AREA
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '=== PERFORMANCE WARNINGS ANALYSIS ===';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ADDED (3 critical foreign key indexes):';
  RAISE NOTICE '   - idx_ip_blocklist_blocked_by';
  RAISE NOTICE '   - idx_suspicious_activity_resolved_by';
  RAISE NOTICE '   - idx_user_missed_pickups_reservation_id (if table exists)';
  RAISE NOTICE '';
  RAISE NOTICE '🟡 KEEP THESE (will be heavily used):';
  RAISE NOTICE '   - All user_achievements indexes (achievement system active)';
  RAISE NOTICE '   - All user_stats indexes (gamification queries)';
  RAISE NOTICE '   - All audit_logs indexes (admin dashboard)';
  RAISE NOTICE '   - All security indexes (rate limiting, blocking)';
  RAISE NOTICE '   - idx_partners_email_lookup (partner login)';
  RAISE NOTICE '   - idx_partners_busy_mode (partner feature)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ SAFE TO REMOVE (features not implemented):';
  RAISE NOTICE '   - idx_users_phone_lookup (no phone auth)';
  RAISE NOTICE '   - idx_notification_queue_batch (no batch processing)';
  RAISE NOTICE '   - idx_reservations_pending_confirmation (status does not exist)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 WHY "UNUSED" DOES NOT MEAN "USELESS":';
  RAISE NOTICE '   - New database = indexes not accessed yet';
  RAISE NOTICE '   - Admin features = used rarely but critical when needed';
  RAISE NOTICE '   - Foreign keys = essential for JOINs (even if not scanned)';
  RAISE NOTICE '   - Future features = better to have index ready';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 IMPACT:';
  RAISE NOTICE '   - 3 foreign key indexes added (+15-30 KB)';
  RAISE NOTICE '   - 0-3 indexes removed (-24-72 KB if uncommented)';
  RAISE NOTICE '   - All critical indexes preserved for scale';
END $$;
