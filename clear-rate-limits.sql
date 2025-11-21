-- Clear rate limits for testing
-- Run this in Supabase SQL Editor if you're stuck at rate limit

-- Check current rate limits
SELECT * FROM email_rate_limits 
WHERE email = 'YOUR_EMAIL_HERE' 
ORDER BY last_attempt DESC;

-- Delete rate limit records to allow immediate retry
DELETE FROM email_rate_limits 
WHERE email = 'YOUR_EMAIL_HERE';

-- Verify it's cleared
SELECT * FROM email_rate_limits 
WHERE email = 'YOUR_EMAIL_HERE';
