-- ================================================
-- GRANT ALL PARTNERS 100 POINTS
-- ================================================
-- This script gives each partner 100 points as a welcome bonus
-- and creates a transaction record for transparency

BEGIN;

-- Update all existing partner_points records to have 100 points
UPDATE public.partner_points
SET 
  balance = 100,
  updated_at = NOW()
WHERE balance < 100;

-- Insert partner_points for any partners that don't have a record yet
INSERT INTO public.partner_points (partner_id, balance, created_at, updated_at)
SELECT 
  id,
  100,
  NOW(),
  NOW()
FROM public.partners
WHERE id NOT IN (SELECT partner_id FROM public.partner_points)
ON CONFLICT (partner_id) DO NOTHING;

-- Record transaction for each partner who received points
INSERT INTO public.partner_point_transactions (
  partner_id,
  change,
  reason,
  balance_before,
  balance_after,
  metadata
)
SELECT 
  pp.partner_id,
  100 - COALESCE(pp.balance, 0) as change,
  'Welcome bonus - Initial partner points grant',
  COALESCE(pp.balance, 0) as balance_before,
  100 as balance_after,
  jsonb_build_object(
    'type', 'welcome_bonus',
    'granted_by', 'system',
    'granted_at', NOW()
  )
FROM public.partner_points pp
WHERE pp.balance <= 100;

COMMIT;

-- Show results
SELECT 
  p.business_name,
  pp.balance as points_balance,
  pp.updated_at as last_updated
FROM public.partners p
LEFT JOIN public.partner_points pp ON pp.partner_id = p.id
ORDER BY p.business_name;

SELECT '✅ All partners now have 100 points!' AS status;
SELECT '🎉 Partners can use these points to purchase additional offer slots' AS info;
