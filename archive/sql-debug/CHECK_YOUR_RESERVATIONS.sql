-- PART 3: Check your active reservations

SELECT 
    r.id,
    r.status,
    r.quantity,
    o.title as offer_title,
    r.created_at,
    r.expires_at
FROM public.reservations r
JOIN public.offers o ON o.id = r.offer_id
WHERE r.customer_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86'
AND r.status = 'ACTIVE'
ORDER BY r.created_at DESC;
