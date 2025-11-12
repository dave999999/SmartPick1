-- Migration: Add FAILED_PICKUP to valid_reservation_status constraint
-- Date: 2025-11-13
-- Rationale: New simplified penalty system introduces FAILED_PICKUP as a stable terminal status.
-- This replaces previous temporary penalty logic; ensure constraint allows the status.

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS valid_reservation_status;
ALTER TABLE public.reservations ADD CONSTRAINT valid_reservation_status CHECK (status IN ('ACTIVE','PICKED_UP','CANCELLED','EXPIRED','FAILED_PICKUP'));

COMMENT ON CONSTRAINT valid_reservation_status ON public.reservations IS 'Allowed reservation statuses including FAILED_PICKUP for auto-expire penalty system.';
