-- =====================================================
-- DEMO PARTNERS: 20 Partners with Varied Offers (2-4 each)
-- =====================================================
-- Purpose: Populate database with diverse demo data
-- Partners: 20 businesses (all use business_type='RESTAURANT' for now)
-- Offers: ~57 total (varying 2-4 per partner) with thematic images
-- Offer Categories: RESTAURANT, FAST_FOOD, BAKERY, DESSERTS_SWEETS, CAFE, 
--            DRINKS_JUICE, GROCERY, MINI_MARKET, MEAT_BUTCHER, 
--            FISH_SEAFOOD, ALCOHOL, DRIVE
-- Created: 2024-12-04 (Updated Version with Varied Offers)
-- Note: Partners table uses business_type, Offers table uses category field
-- =====================================================

-- ===============================================
-- STEP 1: Clean existing test data
-- ===============================================
DELETE FROM user_penalties WHERE reservation_id IN (
  SELECT id FROM reservations WHERE offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (SELECT id FROM partners)
  )
);

DELETE FROM reservations WHERE offer_id IN (
  SELECT id FROM offers WHERE partner_id IN (SELECT id FROM partners)
);

DELETE FROM offers WHERE partner_id IN (SELECT id FROM partners);
DELETE FROM partners;

ALTER SEQUENCE IF EXISTS offers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS partners_id_seq RESTART WITH 1;

-- ===============================================
-- STEP 2: Get Test Partner User
-- ===============================================
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  CREATE TEMP TABLE IF NOT EXISTS temp_partner_user (user_id UUID);
  DELETE FROM temp_partner_user;
  
  IF test_user_id IS NOT NULL THEN
    INSERT INTO temp_partner_user VALUES (test_user_id);
  ELSE
    INSERT INTO temp_partner_user VALUES ('00000000-0000-0000-0000-000000000000'::UUID);
  END IF;
END $$;

-- ===============================================
-- STEP 3: Insert 20 Partners (All 12 Categories)
-- ===============================================

-- 1. Pizza Napoli - RESTAURANT (Old Tbilisi)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Pizza Napoli',
  'info@pizzanapoli.ge',
  '+995 555 123 456',
  'Aghmashenebeli Avenue 45, Old Tbilisi',
  'Tbilisi',
  41.6938,
  44.8085,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.8085, 41.6938), 4326),
  '{"monday": "11:00-23:00", "tuesday": "11:00-23:00", "wednesday": "11:00-23:00", "thursday": "11:00-23:00", "friday": "11:00-01:00", "saturday": "11:00-01:00", "sunday": "11:00-23:00"}'::jsonb,
  'Authentic Italian pizzeria in the heart of Old Tbilisi'
);

-- 2. Burger House - RESTAURANT (Saburtalo)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Burger House',
  'contact@burgerhouse.ge',
  '+995 555 234 567',
  'Vazha-Pshavela Avenue 12, Saburtalo',
  'Tbilisi',
  41.7235,
  44.7456,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7456, 41.7235), 4326),
  '{"monday": "10:00-23:00", "tuesday": "10:00-23:00", "wednesday": "10:00-23:00", "thursday": "10:00-23:00", "friday": "10:00-02:00", "saturday": "10:00-02:00", "sunday": "10:00-23:00"}'::jsonb,
  'Premium burgers with fresh ingredients daily'
);

-- 3. French Bakery - RESTAURANT (Vake)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'French Bakery',
  'hello@frenchbakery.ge',
  '+995 555 345 678',
  'Chavchavadze Avenue 68, Vake',
  'Tbilisi',
  41.7114,
  44.7724,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7724, 41.7114), 4326),
  '{"monday": "07:00-21:00", "tuesday": "07:00-21:00", "wednesday": "07:00-21:00", "thursday": "07:00-21:00", "friday": "07:00-22:00", "saturday": "08:00-22:00", "sunday": "08:00-21:00"}'::jsonb,
  'Fresh croissants and artisan bread every morning'
);

-- 4. Sweet Dreams - RESTAURANT (Rustaveli)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Sweet Dreams',
  'info@sweetdreams.ge',
  '+995 555 456 789',
  'Rustaveli Avenue 24, Mtatsminda',
  'Tbilisi',
  41.6959,
  44.7981,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7981, 41.6959), 4326),
  '{"monday": "09:00-22:00", "tuesday": "09:00-22:00", "wednesday": "09:00-22:00", "thursday": "09:00-22:00", "friday": "09:00-23:00", "saturday": "10:00-23:00", "sunday": "10:00-22:00"}'::jsonb,
  'Handmade cakes and Georgian sweets'
);

-- 5. Café Central - RESTAURANT (City Center)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Café Central',
  'contact@cafecentral.ge',
  '+995 555 567 890',
  'Freedom Square 5, City Center',
  'Tbilisi',
  41.6938,
  44.8077,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.8077, 41.6938), 4326),
  '{"monday": "08:00-22:00", "tuesday": "08:00-22:00", "wednesday": "08:00-22:00", "thursday": "08:00-22:00", "friday": "08:00-23:00", "saturday": "09:00-23:00", "sunday": "09:00-22:00"}'::jsonb,
  'Premium coffee and cozy atmosphere in the heart of Tbilisi'
);

-- 6. Fresh Juice Bar - RESTAURANT (Saburtalo)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Fresh Juice Bar',
  'info@freshjuice.ge',
  '+995 555 678 901',
  'Pekini Avenue 34, Saburtalo',
  'Tbilisi',
  41.7189,
  44.7512,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7512, 41.7189), 4326),
  '{"monday": "08:00-21:00", "tuesday": "08:00-21:00", "wednesday": "08:00-21:00", "thursday": "08:00-21:00", "friday": "08:00-22:00", "saturday": "09:00-22:00", "sunday": "09:00-21:00"}'::jsonb,
  'Fresh-pressed juices and healthy smoothies'
);

-- 7. SuperMart - RESTAURANT (Gldani)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'SuperMart',
  'contact@supermart.ge',
  '+995 555 789 012',
  'Ilia Chavchavadze Avenue 78, Gldani',
  'Tbilisi',
  41.7456,
  44.7892,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7892, 41.7456), 4326),
  '{"monday": "08:00-23:00", "tuesday": "08:00-23:00", "wednesday": "08:00-23:00", "thursday": "08:00-23:00", "friday": "08:00-23:00", "saturday": "08:00-23:00", "sunday": "09:00-22:00"}'::jsonb,
  'Your neighborhood grocery store with fresh products'
);

-- 8. Mini Stop - RESTAURANT (Isani)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Mini Stop',
  'info@ministop.ge',
  '+995 555 890 123',
  'Kakheti Highway 45, Isani',
  'Tbilisi',
  41.7012,
  44.8345,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.8345, 41.7012), 4326),
  '{"monday": "00:00-23:59", "tuesday": "00:00-23:59", "wednesday": "00:00-23:59", "thursday": "00:00-23:59", "friday": "00:00-23:59", "saturday": "00:00-23:59", "sunday": "00:00-23:59"}'::jsonb,
  '24/7 convenience store for all your needs'
);

-- 9. Prime Butcher - RESTAURANT (Didube)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Prime Butcher',
  'shop@primebutcher.ge',
  '+995 555 901 234',
  'Tsereteli Avenue 112, Didube',
  'Tbilisi',
  41.7345,
  44.7534,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7534, 41.7345), 4326),
  '{"monday": "09:00-20:00", "tuesday": "09:00-20:00", "wednesday": "09:00-20:00", "thursday": "09:00-20:00", "friday": "09:00-21:00", "saturday": "09:00-21:00", "sunday": "09:00-19:00"}'::jsonb,
  'Premium quality meat from local farms'
);

-- 10. Ocean Fresh - RESTAURANT (Vake)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Ocean Fresh',
  'info@oceanfresh.ge',
  '+995 555 012 345',
  'Abashidze Street 23, Vake',
  'Tbilisi',
  41.7156,
  44.7689,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7689, 41.7156), 4326),
  '{"monday": "10:00-20:00", "tuesday": "10:00-20:00", "wednesday": "10:00-20:00", "thursday": "10:00-20:00", "friday": "10:00-21:00", "saturday": "10:00-21:00", "sunday": "10:00-19:00"}'::jsonb,
  'Fresh seafood delivered daily from Black Sea'
);

-- 11. Wine Cellar - RESTAURANT (Old Tbilisi)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Wine Cellar',
  'sales@winecellar.ge',
  '+995 555 123 987',
  'Sololaki Street 15, Old Tbilisi',
  'Tbilisi',
  41.6889,
  44.8123,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.8123, 41.6889), 4326),
  '{"monday": "11:00-22:00", "tuesday": "11:00-22:00", "wednesday": "11:00-22:00", "thursday": "11:00-22:00", "friday": "11:00-23:00", "saturday": "11:00-23:00", "sunday": "12:00-21:00"}'::jsonb,
  'Premium Georgian and imported wines'
);

-- 12. Drive & Dine - RESTAURANT (Highway)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Drive & Dine',
  'orders@driveanddine.ge',
  '+995 555 234 876',
  'Tbilisi-Rustavi Highway, Km 5',
  'Tbilisi',
  41.6523,
  44.8856,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.8856, 41.6523), 4326),
  '{"monday": "00:00-23:59", "tuesday": "00:00-23:59", "wednesday": "00:00-23:59", "thursday": "00:00-23:59", "friday": "00:00-23:59", "saturday": "00:00-23:59", "sunday": "00:00-23:59"}'::jsonb,
  '24/7 drive-through for quick meals and essentials'
);

-- 13. Taco Express - RESTAURANT (Saburtalo)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Taco Express',
  'hello@tacoexpress.ge',
  '+995 555 345 765',
  'University Street 22, Saburtalo',
  'Tbilisi',
  41.7267,
  44.7423,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7423, 41.7267), 4326),
  '{"monday": "11:00-23:00", "tuesday": "11:00-23:00", "wednesday": "11:00-23:00", "thursday": "11:00-23:00", "friday": "11:00-01:00", "saturday": "11:00-01:00", "sunday": "11:00-23:00"}'::jsonb,
  'Authentic Mexican street food'
);

-- 14. Croissant & Co - RESTAURANT (Vera)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Croissant & Co',
  'orders@croissantco.ge',
  '+995 555 456 654',
  'Barnovi Street 12, Vera',
  'Tbilisi',
  41.7089,
  44.7934,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7934, 41.7089), 4326),
  '{"monday": "07:00-20:00", "tuesday": "07:00-20:00", "wednesday": "07:00-20:00", "thursday": "07:00-20:00", "friday": "07:00-21:00", "saturday": "08:00-21:00", "sunday": "08:00-20:00"}'::jsonb,
  'European-style bakery with fresh pastries'
);

-- 15. Chocolate Heaven - RESTAURANT (Saburtalo)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Chocolate Heaven',
  'info@chocheaven.ge',
  '+995 555 567 543',
  'Kostava Street 89, Saburtalo',
  'Tbilisi',
  41.7178,
  44.7567,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7567, 41.7178), 4326),
  '{"monday": "10:00-21:00", "tuesday": "10:00-21:00", "wednesday": "10:00-21:00", "thursday": "10:00-21:00", "friday": "10:00-22:00", "saturday": "10:00-22:00", "sunday": "11:00-21:00"}'::jsonb,
  'Belgian chocolates and handmade truffles'
);

-- 16. Coffee Lab - RESTAURANT (Vake)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Coffee Lab',
  'hello@coffeelab.ge',
  '+995 555 678 432',
  'Chavchavadze Avenue 52, Vake',
  'Tbilisi',
  41.7098,
  44.7756,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7756, 41.7098), 4326),
  '{"monday": "07:00-22:00", "tuesday": "07:00-22:00", "wednesday": "07:00-22:00", "thursday": "07:00-22:00", "friday": "07:00-23:00", "saturday": "08:00-23:00", "sunday": "08:00-22:00"}'::jsonb,
  'Specialty coffee roasted on-site'
);

-- 17. Smoothie Station - RESTAURANT (Isani)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Smoothie Station',
  'info@smoothiestation.ge',
  '+995 555 789 321',
  'Navtlughi Street 34, Isani',
  'Tbilisi',
  41.7045,
  44.8289,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.8289, 41.7045), 4326),
  '{"monday": "09:00-21:00", "tuesday": "09:00-21:00", "wednesday": "09:00-21:00", "thursday": "09:00-21:00", "friday": "09:00-22:00", "saturday": "10:00-22:00", "sunday": "10:00-21:00"}'::jsonb,
  'Healthy smoothies and protein shakes'
);

-- 18. Fresh Market - RESTAURANT (Gldani)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Fresh Market',
  'contact@freshmarket.ge',
  '+995 555 890 210',
  'Moscow Avenue 145, Gldani',
  'Tbilisi',
  41.7512,
  44.7823,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7823, 41.7512), 4326),
  '{"monday": "08:00-22:00", "tuesday": "08:00-22:00", "wednesday": "08:00-22:00", "thursday": "08:00-22:00", "friday": "08:00-22:00", "saturday": "08:00-22:00", "sunday": "09:00-21:00"}'::jsonb,
  'Organic vegetables and farm-fresh products'
);

-- 19. Highway Express - RESTAURANT (Ring Road)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Highway Express',
  'service@highwayexpress.ge',
  '+995 555 901 109',
  'Tbilisi Ring Road, Exit 3',
  'Tbilisi',
  41.7523,
  44.8234,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.8234, 41.7523), 4326),
  '{"monday": "06:00-23:00", "tuesday": "06:00-23:00", "wednesday": "06:00-23:00", "thursday": "06:00-23:00", "friday": "06:00-23:00", "saturday": "06:00-23:00", "sunday": "07:00-22:00"}'::jsonb,
  'Quick drive-through service with coffee and snacks'
);

-- 20. Georgian Feast - RESTAURANT (Mtatsminda)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Georgian Feast',
  'order@georgianfeast.ge',
  '+995 555 012 098',
  'Mtatsminda Park Road 8',
  'Tbilisi',
  41.7023,
  44.7867,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7867, 41.7023), 4326),
  '{"monday": "12:00-23:00", "tuesday": "12:00-23:00", "wednesday": "12:00-23:00", "thursday": "12:00-23:00", "friday": "12:00-01:00", "saturday": "12:00-01:00", "sunday": "12:00-23:00"}'::jsonb,
  'Traditional Georgian cuisine with panoramic city views'
);

-- ===============================================
-- STEP 4: Insert Varied Offers (2-4 per Partner)
-- ===============================================

-- Pizza Napoli - 3 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Margherita Pizza', 'Classic pizza with fresh mozzarella and basil',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=600&fit=crop&q=80'],
  25.00, 12.00, 8, 8, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Pizza Napoli'
UNION ALL
SELECT 
  id, 'Pepperoni Feast', 'Large pepperoni pizza with extra cheese',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&h=600&fit=crop&q=80'],
  30.00, 15.00, 5, 5, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '7 hours', NOW() + INTERVAL '7 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Pizza Napoli'
UNION ALL
SELECT 
  id, 'Quattro Formaggi', 'Four cheese pizza with herbs',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1571407970349-bc81e7e96b47?w=600&h=600&fit=crop&q=80'],
  28.00, 14.00, 6, 6, NOW() + INTERVAL '5 hours', NOW() + INTERVAL '8 hours', NOW() + INTERVAL '8 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Pizza Napoli';

-- Burger House - 4 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Double Cheeseburger', 'Two beef patties with cheese and special sauce',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80'],
  18.00, 9.00, 12, 12, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Burger House'
UNION ALL
SELECT 
  id, 'Chicken Burger Combo', 'Crispy chicken with fries and drink',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1562547687-e21e9f275a96?w=600&h=600&fit=crop&q=80'],
  16.00, 8.00, 10, 10, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Burger House'
UNION ALL
SELECT 
  id, 'Veggie Burger', 'Plant-based patty with fresh vegetables',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&h=600&fit=crop&q=80'],
  15.00, 7.50, 8, 8, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '7 hours', NOW() + INTERVAL '7 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Burger House'
UNION ALL
SELECT 
  id, 'BBQ Bacon Burger', 'Premium burger with crispy bacon',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&h=600&fit=crop&q=80'],
  20.00, 10.00, 6, 6, NOW() + INTERVAL '5 hours', NOW() + INTERVAL '8 hours', NOW() + INTERVAL '8 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Burger House';

-- French Bakery - 2 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Croissant Pack (6)', 'Fresh butter croissants',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&h=600&fit=crop&q=80'],
  12.00, 6.00, 15, 15, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '4 hours', NOW() + INTERVAL '4 hours', 'ACTIVE'
FROM partners WHERE business_name = 'French Bakery'
UNION ALL
SELECT 
  id, 'Baguette Bundle (3)', 'Traditional French baguettes',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600&h=600&fit=crop&q=80'],
  9.00, 4.50, 20, 20, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'French Bakery';

-- Sweet Dreams - 3 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Mixed Cake Slices', 'Chocolate, vanilla, and red velvet',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&h=600&fit=crop&q=80'],
  18.00, 9.00, 8, 8, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Sweet Dreams'
UNION ALL
SELECT 
  id, 'Cupcake Dozen', '12 gourmet cupcakes with various flavors',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=600&h=600&fit=crop&q=80'],
  24.00, 12.00, 6, 6, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '7 hours', NOW() + INTERVAL '7 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Sweet Dreams'
UNION ALL
SELECT 
  id, 'Chocolate Brownies (6)', 'Rich chocolate brownies with walnuts',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=600&h=600&fit=crop&q=80'],
  15.00, 7.50, 10, 10, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Sweet Dreams';

-- Café Central - 4 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Coffee & Pastry Combo', 'Large coffee with choice of pastry',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop&q=80'],
  8.00, 4.00, 20, 20, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '4 hours', NOW() + INTERVAL '4 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Café Central'
UNION ALL
SELECT 
  id, 'Cappuccino + Sandwich', 'Fresh cappuccino with club sandwich',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=600&fit=crop&q=80'],
  12.00, 6.00, 15, 15, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Café Central'
UNION ALL
SELECT 
  id, 'Latte Art Special', 'Premium latte with house cookies',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=600&h=600&fit=crop&q=80'],
  10.00, 5.00, 12, 12, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Café Central'
UNION ALL
SELECT 
  id, 'Cold Brew + Cake', 'Iced cold brew with cake slice',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=600&fit=crop&q=80'],
  11.00, 5.50, 10, 10, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '7 hours', NOW() + INTERVAL '7 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Café Central';

-- Fresh Juice Bar - 3 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Green Detox Juice', 'Kale, spinach, apple, cucumber blend',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=600&h=600&fit=crop&q=80'],
  7.00, 3.50, 15, 15, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Fresh Juice Bar'
UNION ALL
SELECT 
  id, 'Tropical Smoothie', 'Mango, pineapple, banana, coconut',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600&h=600&fit=crop&q=80'],
  8.00, 4.00, 12, 12, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Fresh Juice Bar'
UNION ALL
SELECT 
  id, 'Berry Blast', 'Strawberry, blueberry, raspberry yogurt',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&h=600&fit=crop&q=80'],
  6.50, 3.25, 18, 18, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '4 hours', NOW() + INTERVAL '4 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Fresh Juice Bar';

-- SuperMart - 2 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Fresh Vegetable Box', 'Mixed seasonal vegetables',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=600&fit=crop&q=80'],
  15.00, 7.50, 10, 10, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'SuperMart'
UNION ALL
SELECT 
  id, 'Fruit Basket', 'Assorted fresh fruits',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&h=600&fit=crop&q=80'],
  18.00, 9.00, 8, 8, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '7 hours', NOW() + INTERVAL '7 hours', 'ACTIVE'
FROM partners WHERE business_name = 'SuperMart';

-- Mini Stop - 4 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Snack Pack Deal', 'Chips, chocolate, and soft drink',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600&h=600&fit=crop&q=80'],
  6.00, 3.00, 30, 30, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '10 hours', NOW() + INTERVAL '10 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Mini Stop'
UNION ALL
SELECT 
  id, 'Ready Meal Box', 'Pre-packaged sandwiches and salad',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&h=600&fit=crop&q=80'],
  10.00, 5.00, 20, 20, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '8 hours', NOW() + INTERVAL '8 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Mini Stop'
UNION ALL
SELECT 
  id, 'Ice Cream Bundle', 'Selection of ice cream bars',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600&h=600&fit=crop&q=80'],
  8.00, 4.00, 25, 25, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '9 hours', NOW() + INTERVAL '9 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Mini Stop'
UNION ALL
SELECT 
  id, 'Coffee To-Go', 'Fresh coffee and wrapped pastry',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1511920170033-f8396924c348?w=600&h=600&fit=crop&q=80'],
  5.00, 2.50, 40, 40, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Mini Stop';

-- Prime Butcher - 3 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Premium Beef Cuts', 'Ribeye and sirloin steaks (1kg)',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=600&h=600&fit=crop&q=80'],
  45.00, 22.50, 8, 8, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Prime Butcher'
UNION ALL
SELECT 
  id, 'Chicken Variety Pack', 'Fresh chicken breasts and thighs (2kg)',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&h=600&fit=crop&q=80'],
  30.00, 15.00, 10, 10, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Prime Butcher'
UNION ALL
SELECT 
  id, 'Ground Meat Mix', 'Beef and lamb mix for burgers (1kg)',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1588347818036-5928bdf8b1b1?w=600&h=600&fit=crop&q=80'],
  20.00, 10.00, 12, 12, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Prime Butcher';

-- Ocean Fresh - 2 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Fresh Salmon Fillets', 'Wild-caught salmon (800g)',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&h=600&fit=crop&q=80'],
  40.00, 20.00, 6, 6, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Ocean Fresh'
UNION ALL
SELECT 
  id, 'Shrimp Platter', 'Large tiger prawns (500g)',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&h=600&fit=crop&q=80'],
  35.00, 17.50, 8, 8, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Ocean Fresh';

-- Wine Cellar - 3 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Georgian Wine Selection', 'Saperavi and Rkatsiteli (2 bottles)',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop&q=80'],
  50.00, 25.00, 10, 10, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Wine Cellar'
UNION ALL
SELECT 
  id, 'Craft Beer Pack', 'Local craft beers (6 bottles)',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&h=600&fit=crop&q=80'],
  24.00, 12.00, 15, 15, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '7 hours', NOW() + INTERVAL '7 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Wine Cellar'
UNION ALL
SELECT 
  id, 'Sparkling Wine Duo', 'Georgian sparkling wine (2 bottles)',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1519750783826-e2420f4d687f?w=600&h=600&fit=crop&q=80'],
  40.00, 20.00, 8, 8, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Wine Cellar';

-- Drive & Dine - 4 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Road Trip Combo', 'Burger, fries, and large drink',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80'],
  14.00, 7.00, 20, 20, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '10 hours', NOW() + INTERVAL '10 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Drive & Dine'
UNION ALL
SELECT 
  id, 'Coffee & Donut Deal', 'Large coffee with fresh donuts (3)',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=600&fit=crop&q=80'],
  6.00, 3.00, 30, 30, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '8 hours', NOW() + INTERVAL '8 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Drive & Dine'
UNION ALL
SELECT 
  id, 'Breakfast Wrap Box', 'Egg and bacon wraps (2)',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=600&fit=crop&q=80'],
  10.00, 5.00, 15, 15, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Drive & Dine'
UNION ALL
SELECT 
  id, 'Snack & Drink Pack', 'Chips, candy bar, and soda',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600&h=600&fit=crop&q=80'],
  5.00, 2.50, 40, 40, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '12 hours', NOW() + INTERVAL '12 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Drive & Dine';

-- Taco Express - 3 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Taco Party Pack (12)', 'Mix of beef, chicken, veggie tacos',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=600&fit=crop&q=80'],
  32.00, 16.00, 8, 8, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Taco Express'
UNION ALL
SELECT 
  id, 'Burrito Bowl', 'Rice bowl with beans, meat, and guacamole',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=600&fit=crop&q=80'],
  14.00, 7.00, 12, 12, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Taco Express'
UNION ALL
SELECT 
  id, 'Quesadilla Special', 'Large cheese quesadilla with chicken',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=600&h=600&fit=crop&q=80'],
  16.00, 8.00, 10, 10, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '7 hours', NOW() + INTERVAL '7 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Taco Express';

-- Croissant & Co - 2 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Morning Pastry Box', 'Assorted pastries (6 pcs)',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=600&fit=crop&q=80'],
  15.00, 7.50, 12, 12, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '4 hours', NOW() + INTERVAL '4 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Croissant & Co'
UNION ALL
SELECT 
  id, 'Almond Croissant Pack (4)', 'Fresh almond croissants with cream',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=600&h=600&fit=crop&q=80'],
  18.00, 9.00, 10, 10, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Croissant & Co';

-- Chocolate Heaven - 4 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Truffle Collection (12)', 'Handmade chocolate truffles',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1548907040-4baa42d10919?w=600&h=600&fit=crop&q=80'],
  22.00, 11.00, 8, 8, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Chocolate Heaven'
UNION ALL
SELECT 
  id, 'Chocolate Fondue Set', 'Belgian chocolate with fruits',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?w=600&h=600&fit=crop&q=80'],
  28.00, 14.00, 6, 6, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '7 hours', NOW() + INTERVAL '7 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Chocolate Heaven'
UNION ALL
SELECT 
  id, 'Cake Slice Trio', 'Dark, milk, and white chocolate cakes',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=600&fit=crop&q=80'],
  18.00, 9.00, 10, 10, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Chocolate Heaven'
UNION ALL
SELECT 
  id, 'Premium Chocolate Bars (6)', 'World chocolate selection',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1610450949065-1f2841536c88?w=600&h=600&fit=crop&q=80'],
  25.00, 12.50, 12, 12, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Chocolate Heaven';

-- Coffee Lab - 3 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Coffee Beans (250g)', 'Fresh roasted single-origin beans',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&h=600&fit=crop&q=80'],
  16.00, 8.00, 10, 10, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Coffee Lab'
UNION ALL
SELECT 
  id, 'Espresso + Dessert', 'Double espresso with artisan cookie',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&h=600&fit=crop&q=80'],
  9.00, 4.50, 15, 15, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '4 hours', NOW() + INTERVAL '4 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Coffee Lab'
UNION ALL
SELECT 
  id, 'Iced Latte Pitcher (1L)', 'Large iced latte for sharing',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=600&h=600&fit=crop&q=80'],
  14.00, 7.00, 12, 12, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Coffee Lab';

-- Smoothie Station - 2 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Protein Power Smoothie', 'Banana, peanut butter, protein powder',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=600&h=600&fit=crop&q=80'],
  9.00, 4.50, 15, 15, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Smoothie Station'
UNION ALL
SELECT 
  id, 'Acai Bowl Deluxe', 'Acai with granola and fresh fruit',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&h=600&fit=crop&q=80'],
  12.00, 6.00, 10, 10, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Smoothie Station';

-- Fresh Market - 3 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Organic Salad Mix (500g)', 'Pre-washed organic greens',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=600&fit=crop&q=80'],
  8.00, 4.00, 20, 20, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '5 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Fresh Market'
UNION ALL
SELECT 
  id, 'Farm Fresh Eggs (20)', 'Free-range eggs from local farm',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&h=600&fit=crop&q=80'],
  12.00, 6.00, 15, 15, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Fresh Market'
UNION ALL
SELECT 
  id, 'Herb Garden Bundle', 'Fresh basil, parsley, cilantro, dill',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=600&h=600&fit=crop&q=80'],
  6.00, 3.00, 25, 25, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '4 hours', NOW() + INTERVAL '4 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Fresh Market';

-- Highway Express - 2 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Quick Coffee & Muffin', 'Large coffee with fresh muffin',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1511920170033-f8396924c348?w=600&h=600&fit=crop&q=80'],
  7.00, 3.50, 25, 25, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '8 hours', NOW() + INTERVAL '8 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Highway Express'
UNION ALL
SELECT 
  id, 'Energy Boost Pack', 'Energy drink and protein bar',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&h=600&fit=crop&q=80'],
  5.00, 2.50, 35, 35, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '10 hours', NOW() + INTERVAL '10 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Highway Express';

-- Georgian Feast - 4 offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id, 'Khinkali Feast (20)', 'Traditional Georgian dumplings',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=600&h=600&fit=crop&q=80'],
  35.00, 17.50, 10, 10, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '7 hours', NOW() + INTERVAL '7 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Georgian Feast'
UNION ALL
SELECT 
  id, 'Khachapuri Combo', 'Imeretian and Adjarian khachapuri',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=600&fit=crop&q=80'],
  28.00, 14.00, 8, 8, NOW() + INTERVAL '3 hours', NOW() + INTERVAL '6 hours', NOW() + INTERVAL '6 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Georgian Feast'
UNION ALL
SELECT 
  id, 'Mtsvadi BBQ Platter', 'Grilled meat skewers with vegetables',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=600&fit=crop&q=80'],
  42.00, 21.00, 6, 6, NOW() + INTERVAL '5 hours', NOW() + INTERVAL '8 hours', NOW() + INTERVAL '8 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Georgian Feast'
UNION ALL
SELECT 
  id, 'Traditional Feast', 'Lobio, pkhali, and badrijani assortment',
  'RESTAURANT', ARRAY['https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=600&fit=crop&q=80'],
  38.00, 19.00, 7, 7, NOW() + INTERVAL '4 hours', NOW() + INTERVAL '7 hours', NOW() + INTERVAL '7 hours', 'ACTIVE'
FROM partners WHERE business_name = 'Georgian Feast';

-- ===============================================
-- VERIFICATION
-- ===============================================
SELECT 'Demo data seeded successfully!' as status;
SELECT COUNT(*) as total_partners FROM partners;
SELECT COUNT(*) as total_offers FROM offers;
SELECT business_type, COUNT(*) as partners_per_category FROM partners GROUP BY business_type ORDER BY business_type;
SELECT category, COUNT(*) as offers_per_category FROM offers GROUP BY category ORDER BY category;



