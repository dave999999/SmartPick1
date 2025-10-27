-- SmartPick Database Setup Script
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

BEGIN;

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'PARTNER', 'ADMIN')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partners table
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('BAKERY', 'RESTAURANT', 'CAFE', 'GROCERY')),
  description TEXT NOT NULL,
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telegram VARCHAR(100),
  whatsapp VARCHAR(50),
  business_hours JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'BLOCKED')),
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('BAKERY', 'RESTAURANT', 'CAFE', 'GROCERY')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  images TEXT[],
  original_price DECIMAL(10,2) NOT NULL CHECK (original_price > 0),
  smart_price DECIMAL(10,2) NOT NULL CHECK (smart_price > 0 AND smart_price < original_price),
  quantity_available INTEGER NOT NULL CHECK (quantity_available >= 0),
  quantity_total INTEGER NOT NULL CHECK (quantity_total > 0),
  pickup_start TIMESTAMP WITH TIME ZONE NOT NULL,
  pickup_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'EXPIRED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT valid_pickup_window CHECK (pickup_end > pickup_start),
  CONSTRAINT valid_quantity CHECK (quantity_available <= quantity_total)
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
  qr_code VARCHAR(50) UNIQUE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PICKED_UP', 'CANCELLED', 'EXPIRED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  picked_up_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_city ON partners(city);
CREATE INDEX IF NOT EXISTS idx_partners_business_type ON partners(business_type);

CREATE INDEX IF NOT EXISTS idx_offers_partner_id ON offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_category ON offers(category);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_partner_id ON reservations(partner_id);
CREATE INDEX IF NOT EXISTS idx_reservations_offer_id ON reservations(offer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_qr_code ON reservations(qr_code);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations(created_at DESC);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow user creation on signup" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Partners policies
CREATE POLICY "Anyone can view approved partners" ON partners
  FOR SELECT USING (status = 'APPROVED');

CREATE POLICY "Partners can view their own profile" ON partners
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create partner applications" ON partners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Partners can update their own profile" ON partners
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all partners" ON partners
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can update partner status" ON partners
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Offers policies
CREATE POLICY "Anyone can view active offers" ON offers
  FOR SELECT USING (status = 'ACTIVE' AND expires_at > NOW());

CREATE POLICY "Partners can view their own offers" ON offers
  FOR SELECT USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

CREATE POLICY "Partners can create offers" ON offers
  FOR INSERT WITH CHECK (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid() AND status = 'APPROVED')
  );

CREATE POLICY "Partners can update their own offers" ON offers
  FOR UPDATE USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

CREATE POLICY "Partners can delete their own offers" ON offers
  FOR DELETE USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

-- Reservations policies
CREATE POLICY "Customers can view their own reservations" ON reservations
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Partners can view their reservations" ON reservations
  FOR SELECT USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create reservations" ON reservations
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update their own reservations" ON reservations
  FOR UPDATE USING (customer_id = auth.uid());

CREATE POLICY "Partners can update reservations for their offers" ON reservations
  FOR UPDATE USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 5. CREATE STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('offer-images', 'offer-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('partner-images', 'partner-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for offer-images
CREATE POLICY "Anyone can view offer images" ON storage.objects
  FOR SELECT USING (bucket_id = 'offer-images');

CREATE POLICY "Partners can upload offer images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'offer-images' AND
    auth.uid() IN (SELECT user_id FROM partners WHERE status = 'APPROVED')
  );

CREATE POLICY "Partners can update their offer images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'offer-images' AND
    auth.uid() IN (SELECT user_id FROM partners)
  );

CREATE POLICY "Partners can delete their offer images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'offer-images' AND
    auth.uid() IN (SELECT user_id FROM partners)
  );

-- Storage policies for partner-images
CREATE POLICY "Anyone can view partner images" ON storage.objects
  FOR SELECT USING (bucket_id = 'partner-images');

CREATE POLICY "Partners can upload their images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'partner-images' AND
    auth.uid() IN (SELECT user_id FROM partners)
  );

CREATE POLICY "Partners can update their images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'partner-images' AND
    auth.uid() IN (SELECT user_id FROM partners)
  );

CREATE POLICY "Partners can delete their images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'partner-images' AND
    auth.uid() IN (SELECT user_id FROM partners)
  );

-- ============================================================================
-- 6. CREATE FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-expire offers
CREATE OR REPLACE FUNCTION expire_old_offers()
RETURNS void AS $$
BEGIN
  UPDATE offers
  SET status = 'EXPIRED'
  WHERE status = 'ACTIVE' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire reservations
CREATE OR REPLACE FUNCTION expire_old_reservations()
RETURNS void AS $$
BEGIN
  UPDATE reservations
  SET status = 'EXPIRED'
  WHERE status = 'ACTIVE' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 7. SEED DATA (Optional - for testing)
-- ============================================================================

-- Note: You'll need to sign up through the app first to get a real user ID
-- Then you can manually insert test data using your user ID

-- Example: Insert a test partner (replace USER_ID with your actual user ID after signup)
-- INSERT INTO partners (
--   user_id,
--   business_name,
--   business_type,
--   description,
--   address,
--   city,
--   latitude,
--   longitude,
--   phone,
--   email,
--   status
-- ) VALUES (
--   'YOUR_USER_ID_HERE',
--   'Bakery Sakartvelo',
--   'BAKERY',
--   'Traditional Georgian bakery serving fresh khachapuri and pastries daily',
--   '123 Rustaveli Avenue, Tbilisi',
--   'Tbilisi',
--   41.7151,
--   44.8271,
--   '+995 555 123 456',
--   'info@bakery-sakartvelo.ge',
--   'APPROVED'
-- );

COMMIT;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Next steps:
-- 1. Sign up through your SmartPick app to create your first user
-- 2. Check the users table to get your user ID
-- 3. Optionally insert test partner data using your user ID
-- 4. Configure Google OAuth in Supabase Dashboard → Authentication → Providers
-- 5. Start using the app!

-- To check if everything is set up correctly, run:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';