-- Check the pickup windows for your offers
SELECT 
    id,
    title,
    status,
    pickup_start,
    pickup_end,
    NOW() as current_time,
    CASE 
        WHEN pickup_start > NOW() THEN 'NOT STARTED YET'
        WHEN pickup_end < NOW() THEN 'EXPIRED'
        ELSE 'ACTIVE NOW'
    END as pickup_status
FROM public.offers
WHERE partner_id = '0384c929-0af0-4124-a64a-85e63cba5f1a'
ORDER BY created_at DESC
LIMIT 5;
