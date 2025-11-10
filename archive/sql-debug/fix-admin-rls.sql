-- Fix RLS policies for Admin Dashboard data visibility
-- This script allows admin users to access all data needed for the dashboard

BEGIN;

-- Temporarily disable RLS for testing (can be re-enabled later)
-- This will allow the admin dashboard to read data without RLS restrictions

-- For partners table

-- Admin-specific policies (role-based access)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
        CREATE ROLE admin;
    END IF;
END
$$;

DROP POLICY IF EXISTS "admin_read_partners" ON partners;
CREATE POLICY "admin_read_partners" ON partners FOR SELECT TO admin USING (true);

DROP POLICY IF EXISTS "admin_read_users" ON users;
CREATE POLICY "admin_read_users" ON users FOR SELECT TO admin USING (true);

DROP POLICY IF EXISTS "admin_read_offers" ON offers;
CREATE POLICY "admin_read_offers" ON offers FOR SELECT TO admin USING (true);

DROP POLICY IF EXISTS "admin_read_reservations" ON reservations;
CREATE POLICY "admin_read_reservations" ON reservations FOR SELECT TO admin USING (true);

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Alternative: Create admin-specific policies (more secure)
-- Uncomment these if you want role-based access instead of public read

/*
-- Create admin role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
        CREATE ROLE admin;
    END IF;
END
$$;

-- Admin-specific policies
DROP POLICY IF EXISTS "admin_read_partners" ON partners;
CREATE POLICY "admin_read_partners" ON partners FOR SELECT TO admin USING (true);

DROP POLICY IF EXISTS "admin_read_users" ON users;
CREATE POLICY "admin_read_users" ON users FOR SELECT TO admin USING (true);

DROP POLICY IF EXISTS "admin_read_offers" ON offers;
CREATE POLICY "admin_read_offers" ON offers FOR SELECT TO admin USING (true);

DROP POLICY IF EXISTS "admin_read_reservations" ON reservations;
CREATE POLICY "admin_read_reservations" ON reservations FOR SELECT TO admin USING (true);
*/

COMMIT;

-- Test queries to verify data access
-- Run these to check if data is accessible:

-- SELECT COUNT(*) FROM partners;
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM offers;
-- SELECT COUNT(*) FROM reservations;

-- Insert some test data if tables are empty
-- Uncomment these if you need test data:

/*
-- Insert test partners
INSERT INTO partners (id, user_id, business_name, owner_name, email, phone, status, created_at) VALUES
('test-partner-1', 'test-user-1', 'Test Bakery', 'John Doe', 'john@testbakery.com', '+1234567890', 'APPROVED', NOW()),
('test-partner-2', 'test-user-2', 'Test Restaurant', 'Jane Smith', 'jane@testrestaurant.com', '+1234567891', 'PENDING', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test users
INSERT INTO users (id, name, email, role, created_at) VALUES
('test-user-1', 'John Doe', 'john@testbakery.com', 'PARTNER', NOW()),
('test-user-2', 'Jane Smith', 'jane@testrestaurant.com', 'PARTNER', NOW()),
('test-admin-1', 'Admin User', 'admin@smartpick.com', 'ADMIN', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test offers
INSERT INTO offers (id, partner_id, title, description, category, original_price, smart_price, quantity_available, quantity_total, status, created_at) VALUES
('test-offer-1', 'test-partner-1', 'Fresh Bread', 'Delicious fresh bread', 'BAKERY', 5.00, 3.00, 10, 10, 'ACTIVE', NOW()),
('test-offer-2', 'test-partner-2', 'Pizza Special', 'Margherita pizza', 'RESTAURANT', 15.00, 10.00, 5, 5, 'ACTIVE', NOW())
ON CONFLICT (id) DO NOTHING;
*/