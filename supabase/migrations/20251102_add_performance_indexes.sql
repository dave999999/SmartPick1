-- Add missing database indexes for improved query performance
-- These indexes significantly speed up common queries

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'ADMIN';
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_penalty_until ON users(penalty_until) WHERE penalty_until IS NOT NULL;

-- Partners table indexes
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_business_type ON partners(business_type);
CREATE INDEX IF NOT EXISTS idx_partners_location ON partners USING gist(
  ll_to_earth(latitude, longitude)
) WHERE status = 'APPROVED';

-- Offers table indexes
CREATE INDEX IF NOT EXISTS idx_offers_partner_id ON offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_category ON offers(category);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON offers(expires_at) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_quantity ON offers(quantity_available) WHERE quantity_available > 0;

-- Composite index for common offer queries
CREATE INDEX IF NOT EXISTS idx_offers_status_expires_quantity ON offers(status, expires_at, quantity_available)
  WHERE status = 'ACTIVE' AND quantity_available > 0;

-- Reservations table indexes
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_partner_id ON reservations(partner_id);
CREATE INDEX IF NOT EXISTS idx_reservations_offer_id ON reservations(offer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON reservations(expires_at) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_reservations_qr_code ON reservations(qr_code) WHERE status = 'ACTIVE';

-- Composite index for partner dashboard queries
CREATE INDEX IF NOT EXISTS idx_reservations_partner_status ON reservations(partner_id, status, created_at DESC);

-- Composite index for customer queries
CREATE INDEX IF NOT EXISTS idx_reservations_customer_status ON reservations(customer_id, status, created_at DESC);

-- Add comments for documentation
COMMENT ON INDEX idx_users_email IS 'Speeds up user lookup by email during authentication';
COMMENT ON INDEX idx_users_role IS 'Partial index for admin-only queries';
COMMENT ON INDEX idx_partners_location IS 'GiST index for geospatial queries (nearby partners)';
COMMENT ON INDEX idx_offers_status_expires_quantity IS 'Composite index for active offers query optimization';
COMMENT ON INDEX idx_reservations_qr_code IS 'Speeds up QR code validation during pickup';

-- Create extension for geospatial queries if not exists
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;
CREATE EXTENSION IF NOT EXISTS cube;

-- Analyze tables to update statistics for query planner
ANALYZE users;
ANALYZE partners;
ANALYZE offers;
ANALYZE reservations;
