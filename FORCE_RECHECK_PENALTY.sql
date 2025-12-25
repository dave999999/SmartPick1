-- Force modal to disappear by acknowledging it, then it will re-check
UPDATE user_penalties
SET acknowledged = true
WHERE id = '476a97fe-6045-4c31-9da7-d945ed57e761';

-- Wait 2 seconds, then set it back to false to trigger new check
-- (Run this as a separate query after the first one)
UPDATE user_penalties
SET acknowledged = false
WHERE id = '476a97fe-6045-4c31-9da7-d945ed57e761';
