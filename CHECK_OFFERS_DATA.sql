-- Check if there are any offers in the database
SELECT 
    id,
    title,
    status,
    expires_at,
    quantity_available,
    partner_id,
    created_at
FROM public.offers
ORDER BY created_at DESC
LIMIT 10;

-- Check partner status for those offers
SELECT 
    o.id as offer_id,
    o.title,
    o.status as offer_status,
    p.business_name,
    p.status as partner_status
FROM public.offers o
LEFT JOIN public.partners p ON p.id = o.partner_id
WHERE o.status = 'ACTIVE'
ORDER BY o.created_at DESC
LIMIT 10;

-- Count offers by status
SELECT status, COUNT(*) 
FROM public.offers 
GROUP BY status;

-- Count partners by status
SELECT status, COUNT(*) 
FROM public.partners 
GROUP BY status;
