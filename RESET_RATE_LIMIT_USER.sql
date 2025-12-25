-- Reset ALL reservation rate limits (SIMPLE VERSION - works immediately)
-- Use this to clear rate limits for all users making reservations

DELETE FROM rate_limits WHERE key LIKE 'reservation:%';

-- Verify deletion
SELECT COUNT(*) as remaining_reservation_limits 
FROM rate_limits 
WHERE key LIKE 'reservation:%';

-- Result: Should show 0 remaining reservation limits
