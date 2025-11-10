-- Create escrow records for existing active reservations
-- This is needed for reservations created BEFORE the escrow system was installed

INSERT INTO public.escrow_points (
  reservation_id,
  customer_id,
  partner_id,
  amount_held,
  status,
  created_at
)
SELECT 
  r.id as reservation_id,
  r.customer_id,
  p.user_id as partner_id,
  ROUND(r.total_price)::INT as amount_held,
  'HELD' as status,
  r.created_at
FROM public.reservations r
JOIN public.partners p ON p.id = r.partner_id
WHERE r.status = 'ACTIVE'
AND NOT EXISTS (
  SELECT 1 FROM public.escrow_points ep 
  WHERE ep.reservation_id = r.id
)
ON CONFLICT (reservation_id) DO NOTHING;

-- Check your reservation now has escrow
SELECT 
  'Escrow records created' as status,
  COUNT(*) as count
FROM public.escrow_points
WHERE reservation_id = '7c7e45a0-9dae-405b-8197-a5528c3b08a9';
