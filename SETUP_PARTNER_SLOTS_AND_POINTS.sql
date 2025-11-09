-- ================================================
-- UPDATE ALL PARTNERS: 4 SLOTS + 1000 POINTS
-- ================================================

BEGIN;

-- Update all existing partner_points: 4 slots, 1000 balance
UPDATE public.partner_points
SET 
  balance = 1000,
  offer_slots = 4,
  updated_at = NOW()
WHERE balance < 1000 OR offer_slots < 4;

-- Insert partner_points for partners without records
INSERT INTO public.partner_points (partner_id, balance, offer_slots, created_at, updated_at)
SELECT 
  id,
  1000,
  4,
  NOW(),
  NOW()
FROM public.partners
WHERE id NOT IN (SELECT partner_id FROM public.partner_points)
ON CONFLICT (partner_id) DO UPDATE SET
  balance = 1000,
  offer_slots = 4,
  updated_at = NOW();

-- Log welcome bonus transactions for new grants
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
  1000,
  'Welcome bonus - Initial partner grant',
  0,
  1000,
  jsonb_build_object(
    'type', 'welcome_bonus',
    'slots_granted', 4,
    'granted_at', NOW()
  )
FROM public.partner_points pp
WHERE NOT EXISTS (
  SELECT 1 FROM public.partner_point_transactions ppt
  WHERE ppt.partner_id = pp.partner_id
  AND ppt.reason = 'Welcome bonus - Initial partner grant'
);

COMMIT;

-- Show results
SELECT 
  p.business_name,
  pp.balance as points,
  pp.offer_slots as slots
FROM public.partners p
LEFT JOIN public.partner_points pp ON pp.partner_id = p.id
ORDER BY p.business_name;

SELECT '✅ All partners now have 1000 points and 4 offer slots!' AS status;
