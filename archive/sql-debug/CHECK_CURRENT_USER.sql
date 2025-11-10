-- Check who you're logged in as
SELECT auth.uid() as current_user_id;

-- Check if current user has a partner record
SELECT 
  auth.uid() as current_user_id,
  p.id as partner_id,
  p.business_name
FROM partners p
WHERE p.user_id = auth.uid();

-- If the second query returns nothing, you're NOT logged in as a partner!
-- You might be logged in as the customer account by mistake.
