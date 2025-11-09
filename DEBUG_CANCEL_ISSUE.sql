-- Check if escrow record exists for your reservation
SELECT * FROM public.escrow_points
WHERE reservation_id = '7c7e45a0-9dae-405b-8197-a5528c3b08a9';

-- Check your reservation details
SELECT 
  r.id,
  r.customer_id,
  r.partner_id,
  r.status,
  r.total_price
FROM public.reservations r
WHERE r.id = '7c7e45a0-9dae-405b-8197-a5528c3b08a9';

-- Check if your user_points record exists
SELECT * FROM public.user_points
WHERE user_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';
