-- Make description column optional in partners table
ALTER TABLE partners
ALTER COLUMN description DROP NOT NULL;

-- Add comment to document this is optional
COMMENT ON COLUMN partners.description IS 'Optional business description';
