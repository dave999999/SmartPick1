-- =============================================
-- CLEANUP ORPHANED DATA FROM DELETED USER
-- =============================================
-- User: batumashvili.davit@gmail.com
-- Issue: User deleted from auth.users but data remains
-- Impact: Causes 403 errors and broken FK relationships
-- =============================================

-- STEP 1: Find the orphaned user_id
-- (Run this first to get the user_id)
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.role,
    u.created_at,
    'User exists in public.users but NOT in auth.users' as status
FROM public.users u
WHERE u.email = 'batumashvili.davit@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = u.id
  );

-- STEP 2: Find all related partner records
SELECT 
    p.id as partner_id,
    p.user_id,
    p.business_name,
    p.status,
    (SELECT COUNT(*) FROM offers WHERE partner_id = p.id) as offer_count,
    'Orphaned partner' as status
FROM partners p
WHERE p.user_id IN (
    SELECT u.id FROM public.users u
    WHERE u.email = 'batumashvili.davit@gmail.com'
      AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id)
);

-- STEP 3: Find all related offers
SELECT 
    o.id as offer_id,
    o.partner_id,
    o.title,
    o.status,
    (SELECT COUNT(*) FROM reservations WHERE offer_id = o.id) as reservation_count,
    'Orphaned offer' as status
FROM offers o
WHERE o.partner_id IN (
    SELECT p.id FROM partners p
    WHERE p.user_id IN (
        SELECT u.id FROM public.users u
        WHERE u.email = 'batumashvili.davit@gmail.com'
          AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id)
    )
);

-- =============================================
-- CLEANUP ACTIONS (Run after reviewing above)
-- =============================================

-- Option A: DELETE EVERYTHING (Clean slate for re-registration)
-- This will allow the user to register fresh with no conflicts

BEGIN;

-- 1. Delete reservations for orphaned offers (if any)
DELETE FROM reservations
WHERE offer_id IN (
    SELECT o.id FROM offers o
    JOIN partners p ON o.partner_id = p.id
    JOIN public.users u ON p.user_id = u.id
    WHERE u.email = 'batumashvili.davit@gmail.com'
      AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id)
);

-- 2. Delete orphaned offers
DELETE FROM offers
WHERE partner_id IN (
    SELECT p.id FROM partners p
    JOIN public.users u ON p.user_id = u.id
    WHERE u.email = 'batumashvili.davit@gmail.com'
      AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id)
);

-- 3. Delete orphaned partner records
DELETE FROM partners
WHERE user_id IN (
    SELECT u.id FROM public.users u
    WHERE u.email = 'batumashvili.davit@gmail.com'
      AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id)
);

-- 4. Delete orphaned user record from public.users
DELETE FROM public.users
WHERE email = 'batumashvili.davit@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = id);

COMMIT;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify cleanup was successful (should return 0 rows)
SELECT 
    'Orphaned Users' as type, 
    COUNT(*) as count
FROM public.users u
WHERE u.email = 'batumashvili.davit@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id)

UNION ALL

SELECT 
    'Orphaned Partners', 
    COUNT(*)
FROM partners p
JOIN public.users u ON p.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id)

UNION ALL

SELECT 
    'Orphaned Offers', 
    COUNT(*)
FROM offers o
JOIN partners p ON o.partner_id = p.id
JOIN public.users u ON p.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id);

-- =============================================
-- AFTER CLEANUP: User can now register fresh
-- =============================================
-- The email batumashvili.davit@gmail.com is now free to register again
-- All old data and broken relationships have been removed
-- The 403 errors should be resolved

-- =============================================
-- PREVENTION: Add CASCADE DELETE for future
-- =============================================

-- Ensure proper cascade deletes are configured
-- (This prevents orphaned data when users are deleted)

-- Check current foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name IN ('partners', 'offers', 'reservations')
       OR ccu.table_name IN ('partners', 'offers', 'users'))
ORDER BY tc.table_name, tc.constraint_name;

-- Recommended: Update FK constraints to CASCADE DELETE
-- (This ensures when a user is deleted, all related data is also deleted)

-- Example (adjust constraint names based on your schema):
/*
ALTER TABLE partners
DROP CONSTRAINT partners_user_id_fkey,
ADD CONSTRAINT partners_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

ALTER TABLE offers
DROP CONSTRAINT offers_partner_id_fkey,
ADD CONSTRAINT offers_partner_id_fkey 
    FOREIGN KEY (partner_id) 
    REFERENCES partners(id) 
    ON DELETE CASCADE;

ALTER TABLE reservations
DROP CONSTRAINT reservations_offer_id_fkey,
ADD CONSTRAINT reservations_offer_id_fkey 
    FOREIGN KEY (offer_id) 
    REFERENCES offers(id) 
    ON DELETE CASCADE;
*/
