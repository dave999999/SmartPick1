-- =====================================================
-- COMPREHENSIVE CHECK: What's actually in the database now
-- =====================================================

-- 1. Check ALL RLS policies across all tables
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    CASE 
        WHEN LENGTH(qual) > 100 THEN LEFT(qual, 100) || '...'
        ELSE qual
    END as condition_preview
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'offers', 'partners', 'reservations')
ORDER BY tablename, policyname;

-- 2. Check RLS is enabled on all tables
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'offers', 'partners', 'reservations')
ORDER BY tablename;

-- 3. Check if we have active offers
SELECT 
    status,
    COUNT(*) as count,
    MIN(expires_at) as earliest_expiry,
    MAX(expires_at) as latest_expiry
FROM public.offers
GROUP BY status;

-- 4. Check partners status
SELECT 
    status,
    COUNT(*) as count
FROM public.partners
GROUP BY status;

-- 5. Test anonymous access to offers (most critical)
SELECT COUNT(*) as publicly_accessible_offers
FROM public.offers
WHERE status = 'ACTIVE'
AND expires_at > NOW()
AND quantity_available > 0;

-- 6. Check for any policy conflicts (policies with same name)
SELECT 
    tablename,
    policyname,
    COUNT(*) as occurrences
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1;
