-- =====================================================
-- Fix Admin User Partner Dashboard Issue
-- =====================================================
-- Problem: Admin user (davitbatumashvili@gmail.com) applied as partner
-- and now has PENDING partner status, blocking admin dashboard access
--
-- Solution: Choose ONE of the following options:
-- =====================================================

-- OPTION 1: Approve the partner application (recommended if you want to be both admin AND partner)
-- This allows the admin to access both admin dashboard AND partner dashboard
UPDATE partners p
SET status = 'APPROVED',
    updated_at = NOW()
FROM users u
WHERE p.user_id = u.id
  AND u.email = 'davitbatumashvili@gmail.com'
  AND p.status = 'PENDING';

-- Verify the update
SELECT p.id, p.business_name, p.status, p.user_id, u.email, u.role
FROM partners p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'davitbatumashvili@gmail.com';

-- =====================================================
-- OPTION 2: Delete the partner application (if you only want admin access)
-- Uncomment the following lines if you prefer to remain admin-only:
-- =====================================================

-- DELETE FROM partners p
-- USING users u
-- WHERE p.user_id = u.id
--   AND u.email = 'davitbatumashvili@gmail.com';

-- -- Verify deletion
-- SELECT COUNT(*) as partner_count
-- FROM partners p
-- JOIN users u ON p.user_id = u.id
-- WHERE u.email = 'davitbatumashvili@gmail.com';
-- -- Should return 0 if deleted successfully

-- =====================================================
-- Additional Info
-- =====================================================

-- Check current status before making changes:
SELECT 
  u.id as user_id,
  u.email,
  u.role as user_role,
  p.id as partner_id,
  p.business_name,
  p.status as partner_status,
  p.created_at as partner_applied_at
FROM users u
LEFT JOIN partners p ON p.user_id = u.id
WHERE u.email = 'davitbatumashvili@gmail.com';

-- =====================================================
-- Why This Happened
-- =====================================================
-- When an admin user submits the partner application form at /partner/apply,
-- a new partner record is created with status='PENDING'.
-- The PartnerDashboard checks for a partner record by user_id and shows
-- the pending status screen, which is the expected behavior.
--
-- This is not a bug - it's by design to prevent conflicts between
-- admin and partner roles.
--
-- Solution: Either approve the partner application to become both admin+partner,
-- or delete it to remain admin-only.
