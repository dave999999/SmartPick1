-- ================================================
-- CHECK PARTNER STATUS AND APPROVE IF NEEDED
-- ================================================

-- Check current partner status
SELECT 
  p.id,
  p.business_name,
  p.user_id,
  p.status,
  u.email
FROM public.partners p
LEFT JOIN auth.users u ON u.id = p.user_id
ORDER BY p.created_at DESC;

-- Approve all partners (if any are PENDING)
UPDATE public.partners
SET status = 'APPROVED'
WHERE status != 'APPROVED';

-- Show updated status
SELECT 
  business_name,
  status,
  'Now can create offers!' as message
FROM public.partners
ORDER BY business_name;

SELECT '✅ All partners are now APPROVED and can create offers!' AS status;
