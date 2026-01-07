-- Fix: Partner approval trigger failing due to missing is_partner column

-- Option 1: Add the missing is_partner column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT FALSE;

-- Update existing partners to have is_partner = true
UPDATE users 
SET is_partner = TRUE 
WHERE id IN (SELECT user_id FROM partners WHERE status = 'APPROVED');

-- Now try approving the partner
UPDATE partners 
SET status = 'APPROVED' 
WHERE id = 'bcc49af1-5e95-469b-8552-b1ebd6e68f4e';
