-- Fix კუბდარი offer expiration from 12h to 8 days
-- Run this in Supabase SQL Editor

-- First, let's see the current state
SELECT 
  id,
  title,
  expires_at,
  pickup_end,
  created_at,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 AS hours_remaining,
  EXTRACT(EPOCH FROM (expires_at - created_at)) / 3600 AS total_duration_hours
FROM offers 
WHERE title LIKE '%კუბდარი%' OR title LIKE '%ქუბდარი%'
ORDER BY created_at DESC
LIMIT 5;

-- Update the offer to expire 8 days from creation (not from now)
-- This preserves the original creation time
UPDATE offers
SET 
  expires_at = created_at + INTERVAL '8 days',
  pickup_end = created_at + INTERVAL '8 days'
WHERE title LIKE '%კუბდარი%' OR title LIKE '%ქუბდარი%'
  AND status = 'ACTIVE'
  AND expires_at < NOW() + INTERVAL '1 day' -- Only update if currently < 1 day remaining
RETURNING 
  id, 
  title, 
  created_at,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400 AS days_remaining;
