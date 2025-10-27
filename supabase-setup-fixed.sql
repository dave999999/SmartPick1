-- ============================================================================
-- SmartPick Database Setup Script - FIXED VERSION
-- ============================================================================
-- Run each section separately in Supabase SQL Editor
-- Copy and paste ONE SECTION AT A TIME, then click RUN
-- Wait for "Success" message before moving to the next section
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE TABLES
-- Copy from here to the next section marker
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('CUSTOMER', 'PARTNER', 'ADMIN'))
);

-- Partners table
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50) NOT NULL,
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
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_business_type CHECK (business_type IN ('BAKERY', 'RESTAURANT', 'CAFE', 'GROCERY')),
  CONSTRAINT valid_status CHECK (status IN ('PENDING', 'APPROVED', 'BLOCKED'))
);

-- Offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  images TEXT[],
  original_price DECIMAL(10,2) NOT NULL,
  smart_price DECIMAL(10,2) NOT NULL,
  quantity_available INTEGER NOT NULL,
  quantity_total INTEGER NOT NULL,
  pickup_start TIMESTAMP WITH TIME ZONE NOT NULL,
  pickup_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT valid_category CHECK (category IN ('BAKERY', 'RESTAURANT', 'CAFE', 'GROCERY')),
  CONSTRAINT valid_offer_status CHECK (status IN ('ACTIVE', 'PAUSED', 'EXPIRED')),
  CONSTRAINT valid_prices CHECK (original_price > 0 AND smart_price > 0 AND smart_price < original_price),
  CONSTRAINT valid_pickup_window CHECK (pickup_end > pickup_start),
  CONSTRAINT valid_quantity CHECK (quantity_available >= 0 AND quantity_available <= quantity_total AND quantity_total > 0)
);

-- Reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES public.offers(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE NOT NULL,
  qr_code VARCHAR(50) UNIQUE NOT NULL,
  quantity INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_reservation_status CHECK (status IN ('ACTIVE', 'PICKED_UP', 'CANCELLED', 'EXPIRED')),
  CONSTRAINT valid_reservation_quantity CHECK (quantity > 0),
  CONSTRAINT valid_reservation_price CHECK (total_price > 0)
);

-- ============================================================================
-- SECTION 2: CREATE INDEXES
-- Copy from here to the next section marker
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_partners_user_id ON public.partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_city ON public.partners(city);
CREATE INDEX IF NOT EXISTS idx_partners_business_type ON public.partners(business_type);

CREATE INDEX IF NOT EXISTS idx_offers_partner_id ON public.offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_category ON public.offers(category);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON public.offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON public.offers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_partner_id ON public.reservations(partner_id);
CREATE INDEX IF NOT EXISTS idx_reservations_offer_id ON public.reservations(offer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_qr_code ON public.reservations(qr_code);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON public.reservations(created_at DESC);

-- ============================================================================
-- SECTION 3: ENABLE ROW LEVEL SECURITY
-- Copy from here to the next section marker
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 4: CREATE RLS POLICIES FOR USERS TABLE
-- Copy from here to the next section marker
-- ============================================================================

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- SECTION 5: CREATE RLS POLICIES FOR PARTNERS TABLE
-- Copy from here to the next section marker
-- ============================================================================

DROP POLICY IF EXISTS "partners_select_approved" ON public.partners;
CREATE POLICY "partners_select_approved" ON public.partners
  FOR SELECT USING (status = 'APPROVED');

DROP POLICY IF EXISTS "partners_select_own" ON public.partners;
CREATE POLICY "partners_select_own" ON public.partners
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "partners_insert_own" ON public.partners;
CREATE POLICY "partners_insert_own" ON public.partners
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "partners_update_own" ON public.partners;
CREATE POLICY "partners_update_own" ON public.partners
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- SECTION 6: CREATE RLS POLICIES FOR OFFERS TABLE
-- Copy from here to the next section marker
-- ============================================================================

DROP POLICY IF EXISTS "offers_select_active" ON public.offers;
CREATE POLICY "offers_select_active" ON public.offers
  FOR SELECT USING (status = 'ACTIVE' AND expires_at > NOW());

DROP POLICY IF EXISTS "offers_select_own" ON public.offers;
CREATE POLICY "offers_select_own" ON public.offers
  FOR SELECT USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "offers_insert_own" ON public.offers;
CREATE POLICY "offers_insert_own" ON public.offers
  FOR INSERT WITH CHECK (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid() AND status = 'APPROVED')
  );

DROP POLICY IF EXISTS "offers_update_own" ON public.offers;
CREATE POLICY "offers_update_own" ON public.offers
  FOR UPDATE USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "offers_delete_own" ON public.offers;
CREATE POLICY "offers_delete_own" ON public.offers
  FOR DELETE USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- ============================================================================
-- SECTION 7: CREATE RLS POLICIES FOR RESERVATIONS TABLE
-- Copy from here to the next section marker
-- ============================================================================

DROP POLICY IF EXISTS "reservations_select_customer" ON public.reservations;
CREATE POLICY "reservations_select_customer" ON public.reservations
  FOR SELECT USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "reservations_select_partner" ON public.reservations;
CREATE POLICY "reservations_select_partner" ON public.reservations
  FOR SELECT USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "reservations_insert_customer" ON public.reservations;
CREATE POLICY "reservations_insert_customer" ON public.reservations
  FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "reservations_update_customer" ON public.reservations;
CREATE POLICY "reservations_update_customer" ON public.reservations
  FOR UPDATE USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "reservations_update_partner" ON public.reservations;
CREATE POLICY "reservations_update_partner" ON public.reservations
  FOR UPDATE USING (
    partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- ============================================================================
-- SECTION 8: CREATE STORAGE BUCKETS
-- Copy from here to the next section marker
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('offer-images', 'offer-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('partner-images', 'partner-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 9: CREATE STORAGE POLICIES
-- Copy from here to the next section marker
-- ============================================================================

DROP POLICY IF EXISTS "offer_images_select" ON storage.objects;
CREATE POLICY "offer_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'offer-images');

DROP POLICY IF EXISTS "offer_images_insert" ON storage.objects;
CREATE POLICY "offer_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'offer-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "offer_images_update" ON storage.objects;
CREATE POLICY "offer_images_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'offer-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "offer_images_delete" ON storage.objects;
CREATE POLICY "offer_images_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'offer-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "partner_images_select" ON storage.objects;
CREATE POLICY "partner_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'partner-images');

DROP POLICY IF EXISTS "partner_images_insert" ON storage.objects;
CREATE POLICY "partner_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'partner-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "partner_images_update" ON storage.objects;
CREATE POLICY "partner_images_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'partner-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "partner_images_delete" ON storage.objects;
CREATE POLICY "partner_images_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'partner-images' AND auth.role() = 'authenticated');

-- ============================================================================
-- SECTION 10: CREATE FUNCTIONS AND TRIGGERS
-- Copy from here to the end
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_partners_updated_at ON public.partners;
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_offers_updated_at ON public.offers;
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservations_updated_at ON public.reservations;
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
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
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Verify tables were created by running:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';