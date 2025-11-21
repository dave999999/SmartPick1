-- =====================================================
-- Migration: Fix Reservation Quantity Constraint
-- Date: 2025-11-17
-- Description: Remove hardcoded quantity constraint to allow dynamic slot-based limits
-- =====================================================

-- Drop the old constraint that limits quantity to 3
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS valid_reservation_quantity;

-- Add a new flexible constraint that allows up to 10 items
-- (The actual user limit is enforced in the application logic based on purchased slots)
ALTER TABLE reservations 
ADD CONSTRAINT valid_reservation_quantity 
CHECK (quantity > 0 AND quantity <= 10);

-- =====================================================
-- Verification
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'valid_reservation_quantity'
    AND table_name = 'reservations'
  ) THEN
    RAISE NOTICE '✅ Reservation quantity constraint updated successfully (allows 1-10 items)';
  ELSE
    RAISE WARNING '⚠️ Constraint not found - may already be correct';
  END IF;
END $$;
