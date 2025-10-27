-- RLS policies to allow users to view and update their own reservations
-- Run this in your Supabase SQL Editor

-- Allow users to read their own reservations
CREATE POLICY "Users can read their own reservations" ON reservations
  FOR SELECT
  USING (customer_id = auth.uid());

-- Allow users to update their own reservations (for pickup confirmation)
CREATE POLICY "Users can update their own reservations" ON reservations
  FOR UPDATE
  USING (customer_id = auth.uid());

-- Allow users to read offers related to their reservations
CREATE POLICY "Users can read offers for their reservations" ON offers
  FOR SELECT
  USING (
    id IN (
      SELECT offer_id FROM reservations WHERE customer_id = auth.uid()
    )
  );

-- Allow users to read partners related to their reservations
CREATE POLICY "Users can read partners for their reservations" ON partners
  FOR SELECT
  USING (
    id IN (
      SELECT partner_id FROM reservations WHERE customer_id = auth.uid()
    )
  );

-- If policies already exist, you may need to drop them first:
-- DROP POLICY IF EXISTS "Users can read their own reservations" ON reservations;
-- DROP POLICY IF EXISTS "Users can update their own reservations" ON reservations;
-- DROP POLICY IF EXISTS "Users can read offers for their reservations" ON offers;
-- DROP POLICY IF EXISTS "Users can read partners for their reservations" ON partners;