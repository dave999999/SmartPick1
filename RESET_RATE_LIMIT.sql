-- Reset rate limit for batuamshvili.davit@gmail.com

-- Check what rate limit records exist
SELECT * FROM rate_limits LIMIT 5;

-- If the table uses a different structure, try deleting all records (temporary fix)
TRUNCATE TABLE rate_limits;
