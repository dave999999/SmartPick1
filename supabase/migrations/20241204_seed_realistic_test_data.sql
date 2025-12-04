-- =====================================================
-- REALISTIC TEST DATA: 20 Partners × 2-4 Offers Each
-- =====================================================
-- Purpose: Populate database with realistic test data across Tbilisi
-- Partners: 20 diverse businesses across all 12 categories
-- Offers: ~60 total (2-4 per partner) with thematic images
-- Categories: RESTAURANT, FAST_FOOD, BAKERY, DESSERTS_SWEETS, CAFE, 
--            DRINKS_JUICE, GROCERY, MINI_MARKET, MEAT_BUTCHER, 
--            FISH_SEAFOOD, ALCOHOL, DRIVE
-- Created: 2024-12-04
-- =====================================================

-- ===============================================
-- STEP 1: Clean existing test data
-- ===============================================
-- Delete in correct order respecting foreign key constraints:
-- 1. Delete dependent records first (user_penalties -> reservations -> offers -> partners)

-- Delete user penalties that reference reservations
DELETE FROM user_penalties WHERE reservation_id IN (
  SELECT id FROM reservations WHERE offer_id IN (
    SELECT id FROM offers WHERE partner_id IN (SELECT id FROM partners)
  )
);

-- Delete reservations that reference offers
DELETE FROM reservations WHERE offer_id IN (
  SELECT id FROM offers WHERE partner_id IN (SELECT id FROM partners)
);

-- Now safe to delete offers and partners
DELETE FROM offers WHERE partner_id IN (SELECT id FROM partners);
DELETE FROM partners;

-- Reset sequences
ALTER SEQUENCE IF EXISTS offers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS partners_id_seq RESTART WITH 1;

-- ===============================================
-- STEP 2: Get or Create Test Partner User
-- ===============================================
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Try to get an existing user, or use a default test user ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  -- If no users exist, we'll need to handle this differently
  -- Store the user_id in a temporary table for use in inserts
  CREATE TEMP TABLE IF NOT EXISTS temp_partner_user (user_id UUID);
  DELETE FROM temp_partner_user;
  
  IF test_user_id IS NOT NULL THEN
    INSERT INTO temp_partner_user VALUES (test_user_id);
  ELSE
    -- Use a placeholder UUID that we'll need to update later
    INSERT INTO temp_partner_user VALUES ('00000000-0000-0000-0000-000000000000'::UUID);
  END IF;
END $$;

-- ===============================================
-- STEP 3: Insert 20 Partners across Tbilisi
-- ===============================================

-- 1. Pizza Napoli - Italian Restaurant (Old Tbilisi)
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

-- 2. Burger House - Fast Food (Saburtalo)
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

-- 3. French Bakery - Bakery (Vake)
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

-- 4. Sweet Dreams - Desserts & Sweets (Rustaveli)
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

-- 5. Café Central - Cafe (City Center)
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

-- 6. Fresh Juice Bar - Drinks & Juice (Saburtalo)
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

-- 7. SuperMart - Grocery (Gldani)
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

-- 8. Mini Stop - Mini Market (Isani)
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

-- 9. Prime Butcher - Meat & Butcher (Didube)
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

-- 10. Ocean Fresh - Fish & Seafood (Vake)
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

-- 11. Wine Cellar - Alcohol (Old Tbilisi)
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

-- 12. Georgian Feast - Restaurant (Mtatsminda)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Georgian Feast',
  'info@georgianfeast.ge',
  '+995 555 234 876',
  'Mtatsminda Park Road 8',
  'Tbilisi',
  41.7023,
  44.7867,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7867, 41.7023), 4326),
  '{"monday": "12:00-23:00", "tuesday": "12:00-23:00", "wednesday": "12:00-23:00", "thursday": "12:00-23:00", "friday": "12:00-01:00", "saturday": "12:00-01:00", "sunday": "12:00-23:00"}'::jsonb,
  'Traditional Georgian cuisine with panoramic city views'
);

-- 13. Taco Express - Fast Food (Saburtalo)
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

-- 14. Croissant & Co - Bakery (Vera)
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

-- 15. Chocolate Heaven - Desserts & Sweets (Saburtalo)
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

-- 16. Coffee Lab - Cafe (Vake)
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

-- 17. Smoothie Station - Drinks & Juice (Isani)
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

-- 18. Fresh Market - Grocery (Gldani)
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

-- 19. QuickShop - Mini Market (Didube)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'QuickShop',
  'shop@quickshop.ge',
  '+995 555 901 109',
  'Guramishvili Avenue 67, Didube',
  'Tbilisi',
  41.7389,
  44.7612,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7612, 41.7389), 4326),
  '{"monday": "07:00-23:00", "tuesday": "07:00-23:00", "wednesday": "07:00-23:00", "thursday": "07:00-23:00", "friday": "07:00-23:00", "saturday": "07:00-23:00", "sunday": "08:00-22:00"}'::jsonb,
  'Quick stop for essentials and snacks'
);

-- 20. Sushi Zen - Restaurant (Vake)
INSERT INTO partners (user_id, business_name, email, phone, address, city, latitude, longitude, business_type, location, business_hours, description)
VALUES (
  (SELECT user_id FROM temp_partner_user),
  'Sushi Zen',
  'order@sushizen.ge',
  '+995 555 012 098',
  'Kipshidze Street 15, Vake',
  'Tbilisi',
  41.7134,
  44.7678,
  'RESTAURANT',
  ST_SetSRID(ST_MakePoint(44.7678, 41.7134), 4326),
  '{"monday": "12:00-23:00", "tuesday": "12:00-23:00", "wednesday": "12:00-23:00", "thursday": "12:00-23:00", "friday": "12:00-00:00", "saturday": "12:00-00:00", "sunday": "12:00-23:00"}'::jsonb,
  'Japanese cuisine with fresh daily ingredients'
);

-- ===============================================
-- STEP 3: Insert 4 Offers per Partner (80 total)
-- ===============================================

-- Pizza Napoli Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Margherita Pizza - End of Day',
  'Classic Margherita pizza with fresh mozzarella, basil, and tomato sauce. Available for pickup before closing.',
  'RESTAURANT',
  ARRAY['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'],
  25.00,
  12.00,
  8,
  8,
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '8 hours',
  NOW() + INTERVAL '8 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Pizza Napoli'
UNION ALL
SELECT 
  id,
  'Pepperoni Pizza Special',
  'Large pepperoni pizza with extra cheese. Perfect for sharing!',
  'RESTAURANT',
  ARRAY['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800', 'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=800'],
  30.00,
  15.00,
  5,
  5,
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '7 hours',
  NOW() + INTERVAL '7 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Pizza Napoli'
UNION ALL
SELECT 
  id,
  'Quattro Formaggi',
  'Four cheese pizza: mozzarella, gorgonzola, parmesan, and fontina',
  'RESTAURANT',
  ARRAY['https://images.unsplash.com/photo-1571407970349-bc81e7e96b47?w=800'],
  28.00,
  14.00,
  6,
  6,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Pizza Napoli'
UNION ALL
SELECT 
  id,
  'Calzone Combo',
  'Folded pizza filled with ham, mushrooms, and mozzarella',
  'RESTAURANT',
  ARRAY['https://images.unsplash.com/photo-1555072956-7758afb20e8f?w=800'],
  22.00,
  11.00,
  4,
  4,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Pizza Napoli';

-- Burger House Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Double Cheeseburger Deal',
  'Two beef patties with cheese, lettuce, tomato, and special sauce',
  'FAST_FOOD',
  ARRAY['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800'],
  18.00,
  9.00,
  12,
  12,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Burger House'
UNION ALL
SELECT 
  id,
  'Chicken Burger + Fries',
  'Crispy chicken burger with golden fries and soft drink',
  'FAST_FOOD',
  ARRAY['https://images.unsplash.com/photo-1562547687-e21e9f275a96?w=800'],
  16.00,
  8.00,
  10,
  10,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Burger House'
UNION ALL
SELECT 
  id,
  'Veggie Burger Combo',
  'Plant-based patty with fresh vegetables and vegan sauce',
  'FAST_FOOD',
  ARRAY['https://images.unsplash.com/photo-1520072959219-c595dc870360?w=800'],
  15.00,
  7.50,
  8,
  8,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Burger House'
UNION ALL
SELECT 
  id,
  'Bacon BBQ Burger',
  'Premium burger with crispy bacon and BBQ sauce',
  'FAST_FOOD',
  ARRAY['https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800'],
  20.00,
  10.00,
  6,
  6,
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '7 hours',
  NOW() + INTERVAL '7 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Burger House';

-- French Bakery Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Croissant Pack (6 pcs)',
  'Fresh butter croissants baked this morning',
  'BAKERY',
  ARRAY['https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800', 'https://images.unsplash.com/photo-1623334044303-241021148842?w=800'],
  12.00,
  6.00,
  15,
  15,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '3 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'French Bakery'
UNION ALL
SELECT 
  id,
  'Baguette Bundle (3 pcs)',
  'Traditional French baguettes, crispy outside and soft inside',
  'BAKERY',
  ARRAY['https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800'],
  9.00,
  4.50,
  20,
  20,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'French Bakery'
UNION ALL
SELECT 
  id,
  'Pain au Chocolat (4 pcs)',
  'Chocolate-filled pastries perfect for breakfast',
  'BAKERY',
  ARRAY['https://images.unsplash.com/photo-1601312540212-ad53e5eaa215?w=800'],
  14.00,
  7.00,
  12,
  12,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'French Bakery'
UNION ALL
SELECT 
  id,
  'Artisan Bread Selection',
  'Mix of sourdough, whole wheat, and rye bread',
  'BAKERY',
  ARRAY['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800'],
  16.00,
  8.00,
  10,
  10,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'French Bakery';

-- Sweet Dreams Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Mixed Cake Slices Box',
  'Assorted cake slices: chocolate, vanilla, and red velvet',
  'DESSERTS_SWEETS',
  ARRAY['https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800'],
  18.00,
  9.00,
  8,
  8,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Sweet Dreams'
UNION ALL
SELECT 
  id,
  'Cupcake Dozen',
  '12 gourmet cupcakes with various flavors and toppings',
  'DESSERTS_SWEETS',
  ARRAY['https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=800'],
  24.00,
  12.00,
  6,
  6,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Sweet Dreams'
UNION ALL
SELECT 
  id,
  'Chocolate Brownies Pack',
  'Rich chocolate brownies with walnuts (6 pieces)',
  'DESSERTS_SWEETS',
  ARRAY['https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=800'],
  15.00,
  7.50,
  10,
  10,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Sweet Dreams'
UNION ALL
SELECT 
  id,
  'Macarons Collection',
  'French macarons in 6 different flavors',
  'DESSERTS_SWEETS',
  ARRAY['https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800'],
  20.00,
  10.00,
  5,
  5,
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '7 hours',
  NOW() + INTERVAL '7 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Sweet Dreams';

-- Café Central Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Coffee & Pastry Combo',
  'Large coffee (any style) with choice of pastry',
  'CAFE',
  ARRAY['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800'],
  8.00,
  4.00,
  20,
  20,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '3 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Café Central'
UNION ALL
SELECT 
  id,
  'Cappuccino + Sandwich',
  'Fresh cappuccino with club sandwich',
  'CAFE',
  ARRAY['https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800'],
  12.00,
  6.00,
  15,
  15,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Café Central'
UNION ALL
SELECT 
  id,
  'Latte Art Experience',
  'Premium latte with house-made cookies',
  'CAFE',
  ARRAY['https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800'],
  10.00,
  5.00,
  12,
  12,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Café Central'
UNION ALL
SELECT 
  id,
  'Cold Brew + Cake',
  'Iced cold brew coffee with slice of cake',
  'CAFE',
  ARRAY['https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800'],
  11.00,
  5.50,
  10,
  10,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Café Central';

-- Continue with remaining 14 partners...
-- (Due to length, I'll add a few more and you can see the pattern)

-- Fresh Juice Bar Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Green Detox Juice',
  'Kale, spinach, apple, cucumber, and lemon blend',
  'DRINKS_JUICE',
  ARRAY['https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=800', 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=800'],
  7.00,
  3.50,
  15,
  15,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Fresh Juice Bar'
UNION ALL
SELECT 
  id,
  'Tropical Smoothie',
  'Mango, pineapple, banana, and coconut milk',
  'DRINKS_JUICE',
  ARRAY['https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800'],
  8.00,
  4.00,
  12,
  12,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Fresh Juice Bar'
UNION ALL
SELECT 
  id,
  'Berry Blast',
  'Strawberry, blueberry, raspberry, and yogurt',
  'DRINKS_JUICE',
  ARRAY['https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800'],
  6.50,
  3.25,
  18,
  18,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '3 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Fresh Juice Bar'
UNION ALL
SELECT 
  id,
  'Orange Fresh Press',
  'Freshly squeezed orange juice (500ml)',
  'DRINKS_JUICE',
  ARRAY['https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800'],
  5.00,
  2.50,
  25,
  25,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Fresh Juice Bar';

-- SuperMart Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Fresh Vegetable Box',
  'Mixed seasonal vegetables: tomatoes, cucumbers, peppers, onions',
  'GROCERY',
  ARRAY['https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800', 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=800'],
  15.00,
  7.50,
  10,
  10,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'SuperMart'
UNION ALL
SELECT 
  id,
  'Fruit Basket',
  'Assorted fresh fruits: apples, oranges, bananas, grapes',
  'GROCERY',
  ARRAY['https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800'],
  18.00,
  9.00,
  8,
  8,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'SuperMart'
UNION ALL
SELECT 
  id,
  'Dairy Essentials Pack',
  'Milk, cheese, yogurt, and butter bundle',
  'GROCERY',
  ARRAY['https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800'],
  20.00,
  10.00,
  12,
  12,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'SuperMart'
UNION ALL
SELECT 
  id,
  'Breakfast Bundle',
  'Eggs, bread, milk, and orange juice',
  'GROCERY',
  ARRAY['https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800'],
  16.00,
  8.00,
  15,
  15,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '3 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'SuperMart';

-- Mini Stop Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Snack Pack Deal',
  'Chips, chocolate bar, and soft drink combo',
  'MINI_MARKET',
  ARRAY['https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=800'],
  6.00,
  3.00,
  30,
  30,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '12 hours',
  NOW() + INTERVAL '12 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Mini Stop'
UNION ALL
SELECT 
  id,
  'Ready Meal Box',
  'Pre-packaged sandwiches and salad',
  'MINI_MARKET',
  ARRAY['https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800'],
  10.00,
  5.00,
  20,
  20,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '8 hours',
  NOW() + INTERVAL '8 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Mini Stop'
UNION ALL
SELECT 
  id,
  'Ice Cream Bundle',
  'Selection of ice cream bars and cones',
  'MINI_MARKET',
  ARRAY['https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800'],
  8.00,
  4.00,
  25,
  25,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '10 hours',
  NOW() + INTERVAL '10 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Mini Stop'
UNION ALL
SELECT 
  id,
  'Coffee & Pastry To-Go',
  'Fresh coffee and wrapped pastry',
  'MINI_MARKET',
  ARRAY['https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800'],
  5.00,
  2.50,
  40,
  40,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Mini Stop';

-- Prime Butcher Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Premium Beef Cuts',
  'Selection of ribeye and sirloin steaks (1kg)',
  'MEAT_BUTCHER',
  ARRAY['https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=800', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800'],
  45.00,
  22.50,
  8,
  8,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Prime Butcher'
UNION ALL
SELECT 
  id,
  'Chicken Variety Pack',
  'Fresh chicken breasts, thighs, and wings (2kg)',
  'MEAT_BUTCHER',
  ARRAY['https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800'],
  30.00,
  15.00,
  10,
  10,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Prime Butcher'
UNION ALL
SELECT 
  id,
  'Pork Chops Bundle',
  'Thick-cut pork chops, ready for grilling (1.5kg)',
  'MEAT_BUTCHER',
  ARRAY['https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=800'],
  28.00,
  14.00,
  6,
  6,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '7 hours',
  NOW() + INTERVAL '7 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Prime Butcher'
UNION ALL
SELECT 
  id,
  'Ground Meat Mix',
  'Mixed ground beef and lamb for burgers and meatballs (1kg)',
  'MEAT_BUTCHER',
  ARRAY['https://images.unsplash.com/photo-1588347818036-5928bdf8b1b1?w=800'],
  20.00,
  10.00,
  12,
  12,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Prime Butcher';

-- Ocean Fresh Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Fresh Salmon Fillets',
  'Wild-caught salmon, perfect for grilling (800g)',
  'FISH_SEAFOOD',
  ARRAY['https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800', 'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=800'],
  40.00,
  20.00,
  6,
  6,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Ocean Fresh'
UNION ALL
SELECT 
  id,
  'Shrimp Platter',
  'Large tiger prawns, cleaned and deveined (500g)',
  'FISH_SEAFOOD',
  ARRAY['https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800'],
  35.00,
  17.50,
  8,
  8,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Ocean Fresh'
UNION ALL
SELECT 
  id,
  'Sea Bass Whole',
  'Fresh whole sea bass, cleaned and ready to cook (1kg)',
  'FISH_SEAFOOD',
  ARRAY['https://images.unsplash.com/photo-1535140728325-a4d3707eee61?w=800'],
  32.00,
  16.00,
  5,
  5,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Ocean Fresh'
UNION ALL
SELECT 
  id,
  'Mixed Seafood Box',
  'Assorted seafood: mussels, calamari, and clams',
  'FISH_SEAFOOD',
  ARRAY['https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=800'],
  38.00,
  19.00,
  4,
  4,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Ocean Fresh';

-- Wine Cellar Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Georgian Wine Selection',
  'Saperavi and Rkatsiteli premium wines (2 bottles)',
  'ALCOHOL',
  ARRAY['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800', 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=800'],
  50.00,
  25.00,
  10,
  10,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Wine Cellar'
UNION ALL
SELECT 
  id,
  'Craft Beer Pack',
  'Selection of local craft beers (6 bottles)',
  'ALCOHOL',
  ARRAY['https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800'],
  24.00,
  12.00,
  15,
  15,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '7 hours',
  NOW() + INTERVAL '7 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Wine Cellar'
UNION ALL
SELECT 
  id,
  'Whiskey Tasting Set',
  'Three premium whiskeys for tasting (3x 200ml)',
  'ALCOHOL',
  ARRAY['https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800'],
  60.00,
  30.00,
  6,
  6,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '8 hours',
  NOW() + INTERVAL '8 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Wine Cellar'
UNION ALL
SELECT 
  id,
  'Sparkling Wine Duo',
  'Two bottles of Georgian sparkling wine',
  'ALCOHOL',
  ARRAY['https://images.unsplash.com/photo-1519750783826-e2420f4d687f?w=800'],
  40.00,
  20.00,
  8,
  8,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Wine Cellar';

-- Georgian Feast Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Khinkali Feast (20 pcs)',
  'Traditional Georgian dumplings with meat filling',
  'RESTAURANT',
  ARRAY['https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=800', 'https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=800'],
  35.00,
  17.50,
  10,
  10,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '7 hours',
  NOW() + INTERVAL '7 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Georgian Feast'
UNION ALL
SELECT 
  id,
  'Khachapuri Combo',
  'Imeretian and Adjarian khachapuri (cheese bread)',
  'RESTAURANT',
  ARRAY['https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800'],
  28.00,
  14.00,
  8,
  8,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Georgian Feast'
UNION ALL
SELECT 
  id,
  'Mtsvadi BBQ Platter',
  'Georgian-style grilled meat skewers with vegetables',
  'RESTAURANT',
  ARRAY['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800'],
  42.00,
  21.00,
  6,
  6,
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '8 hours',
  NOW() + INTERVAL '8 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Georgian Feast'
UNION ALL
SELECT 
  id,
  'Traditional Georgian Feast',
  'Assorted Georgian dishes: lobio, pkhali, and badrijani',
  'RESTAURANT',
  ARRAY['https://images.unsplash.com/photo-1544025162-d76694265947?w=800'],
  38.00,
  19.00,
  7,
  7,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '7 hours',
  NOW() + INTERVAL '7 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Georgian Feast';

-- Taco Express Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Taco Party Pack (12 pcs)',
  'Mix of beef, chicken, and vegetarian tacos',
  'DESSERTS_SWEETS',
  ARRAY['https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800'],
  32.00,
  16.00,
  8,
  8,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Taco Express'
UNION ALL
SELECT 
  id,
  'Burrito Bowl Combo',
  'Rice bowl with beans, meat, guacamole, and salsa',
  'FAST_FOOD',
  ARRAY['https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800'],
  14.00,
  7.00,
  12,
  12,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Taco Express'
UNION ALL
SELECT 
  id,
  'Quesadilla Special',
  'Large cheese quesadilla with chicken and peppers',
  'FAST_FOOD',
  ARRAY['https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=800'],
  16.00,
  8.00,
  10,
  10,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '7 hours',
  NOW() + INTERVAL '7 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Taco Express'
UNION ALL
SELECT 
  id,
  'Nachos Grande',
  'Loaded nachos with cheese, jalapeños, and sour cream',
  'FAST_FOOD',
  ARRAY['https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=800'],
  12.00,
  6.00,
  15,
  15,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Taco Express';

-- Croissant & Co Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Morning Pastry Box',
  'Assorted pastries: croissants, danish, and muffins (6 pcs)',
  'FAST_FOOD',
  ARRAY['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', 'https://images.unsplash.com/photo-1612182062633-6f5c0395a060?w=800'],
  15.00,
  7.50,
  12,
  12,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '3 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Croissant & Co'
UNION ALL
SELECT 
  id,
  'Almond Croissant Pack',
  'Fresh almond croissants with cream filling (4 pcs)',
  'BAKERY',
  ARRAY['https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=800'],
  18.00,
  9.00,
  10,
  10,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Croissant & Co'
UNION ALL
SELECT 
  id,
  'Cinnamon Roll Bundle',
  'Warm cinnamon rolls with cream cheese frosting (5 pcs)',
  'BAKERY',
  ARRAY['https://images.unsplash.com/photo-1619985663461-8e5e44eb0a42?w=800'],
  16.00,
  8.00,
  8,
  8,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Croissant & Co'
UNION ALL
SELECT 
  id,
  'Sourdough Bread Loaves',
  'Artisan sourdough bread (2 loaves)',
  'BAKERY',
  ARRAY['https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800'],
  14.00,
  7.00,
  15,
  15,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Croissant & Co';

-- Chocolate Heaven Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Truffle Collection Box',
  'Assorted handmade chocolate truffles (12 pieces)',
  'BAKERY',
  ARRAY['https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800', 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=800'],
  22.00,
  11.00,
  8,
  8,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Chocolate Heaven'
UNION ALL
SELECT 
  id,
  'Chocolate Fondue Set',
  'Belgian chocolate for fondue with fruits',
  'DESSERTS_SWEETS',
  ARRAY['https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?w=800'],
  28.00,
  14.00,
  6,
  6,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '7 hours',
  NOW() + INTERVAL '7 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Chocolate Heaven'
UNION ALL
SELECT 
  id,
  'Chocolate Cake Slice Trio',
  'Three types of chocolate cake: dark, milk, and white',
  'DESSERTS_SWEETS',
  ARRAY['https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800'],
  18.00,
  9.00,
  10,
  10,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Chocolate Heaven'
UNION ALL
SELECT 
  id,
  'Chocolate Bar Selection',
  'Premium chocolate bars from around the world (6 bars)',
  'DESSERTS_SWEETS',
  ARRAY['https://images.unsplash.com/photo-1610450949065-1f2841536c88?w=800'],
  25.00,
  12.50,
  12,
  12,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Chocolate Heaven';

-- Coffee Lab Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Specialty Coffee Beans',
  'Fresh roasted single-origin coffee beans (250g)',
  'CAFE',
  ARRAY['https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800'],
  16.00,
  8.00,
  10,
  10,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Coffee Lab'
UNION ALL
SELECT 
  id,
  'Pour Over Coffee Kit',
  'Coffee brewing kit with fresh beans and filters',
  'CAFE',
  ARRAY['https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800'],
  24.00,
  12.00,
  8,
  8,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Coffee Lab'
UNION ALL
SELECT 
  id,
  'Espresso + Dessert Pairing',
  'Double espresso with artisan cookie',
  'CAFE',
  ARRAY['https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800'],
  9.00,
  4.50,
  15,
  15,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Coffee Lab'
UNION ALL
SELECT 
  id,
  'Iced Latte Pitcher',
  'Large iced latte (1 liter) perfect for sharing',
  'CAFE',
  ARRAY['https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800'],
  14.00,
  7.00,
  12,
  12,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Coffee Lab';

-- Smoothie Station Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Protein Power Smoothie',
  'Banana, peanut butter, protein powder, and almond milk',
  'DRINKS_JUICE',
  ARRAY['https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=800', 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=800'],
  9.00,
  4.50,
  15,
  15,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Smoothie Station'
UNION ALL
SELECT 
  id,
  'Acai Bowl Deluxe',
  'Acai berry bowl topped with granola and fresh fruit',
  'DRINKS_JUICE',
  ARRAY['https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800'],
  12.00,
  6.00,
  10,
  10,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Smoothie Station'
UNION ALL
SELECT 
  id,
  'Green Goddess Juice',
  'Celery, cucumber, spinach, and green apple',
  'DRINKS_JUICE',
  ARRAY['https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=800'],
  7.50,
  3.75,
  18,
  18,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Smoothie Station'
UNION ALL
SELECT 
  id,
  'Mixed Berry Smoothie',
  'Strawberry, blueberry, blackberry blend',
  'DRINKS_JUICE',
  ARRAY['https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800'],
  8.00,
  4.00,
  20,
  20,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Smoothie Station';

-- Fresh Market Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Organic Salad Mix',
  'Pre-washed organic mixed greens (500g)',
  'GROCERY',
  ARRAY['https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800', 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800'],
  8.00,
  4.00,
  20,
  20,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Fresh Market'
UNION ALL
SELECT 
  id,
  'Farm Fresh Eggs',
  'Free-range eggs from local farm (20 pieces)',
  'GROCERY',
  ARRAY['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800'],
  12.00,
  6.00,
  15,
  15,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Fresh Market'
UNION ALL
SELECT 
  id,
  'Herb Garden Bundle',
  'Fresh herbs: basil, parsley, cilantro, dill',
  'GROCERY',
  ARRAY['https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=800'],
  6.00,
  3.00,
  25,
  25,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '4 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Fresh Market'
UNION ALL
SELECT 
  id,
  'Root Vegetable Box',
  'Carrots, beets, potatoes, and onions (2kg)',
  'GROCERY',
  ARRAY['https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=800'],
  10.00,
  5.00,
  18,
  18,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Fresh Market';

-- QuickShop Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Student Snack Bundle',
  'Instant noodles, chips, and energy drink',
  'MINI_MARKET',
  ARRAY['https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=800'],
  7.00,
  3.50,
  30,
  30,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '10 hours',
  NOW() + INTERVAL '10 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'QuickShop'
UNION ALL
SELECT 
  id,
  'Breakfast Essentials',
  'Milk, bread, butter, and jam',
  'MINI_MARKET',
  ARRAY['https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800'],
  11.00,
  5.50,
  20,
  20,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '8 hours',
  NOW() + INTERVAL '8 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'QuickShop'
UNION ALL
SELECT 
  id,
  'Movie Night Pack',
  'Popcorn, candy, and soft drinks',
  'MINI_MARKET',
  ARRAY['https://images.unsplash.com/photo-1616683693504-3d9932093eae?w=800'],
  13.00,
  6.50,
  25,
  25,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '12 hours',
  NOW() + INTERVAL '12 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'QuickShop'
UNION ALL
SELECT 
  id,
  'Emergency Kit',
  'Batteries, tissues, water, and pain reliever',
  'MINI_MARKET',
  ARRAY['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800'],
  9.00,
  4.50,
  35,
  35,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '15 hours',
  NOW() + INTERVAL '15 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'QuickShop';

-- Sushi Zen Offers
INSERT INTO offers (partner_id, title, description, category, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
SELECT 
  id,
  'Sushi Platter for Two',
  'Assorted nigiri, maki, and California rolls (40 pieces)',
  'RESTAURANT',
  ARRAY['https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800', 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=800'],
  55.00,
  27.50,
  8,
  8,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '7 hours',
  NOW() + INTERVAL '7 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Sushi Zen'
UNION ALL
SELECT 
  id,
  'Salmon Lover Set',
  'All salmon sushi: nigiri, sashimi, and rolls (25 pieces)',
  'RESTAURANT',
  ARRAY['https://images.unsplash.com/photo-1564489563601-c53cfc451e93?w=800'],
  48.00,
  24.00,
  6,
  6,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '6 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Sushi Zen'
UNION ALL
SELECT 
  id,
  'Vegetarian Sushi Box',
  'Vegetable rolls with avocado, cucumber, and pickled radish',
  'RESTAURANT',
  ARRAY['https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800'],
  32.00,
  16.00,
  10,
  10,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '5 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Sushi Zen'
UNION ALL
SELECT 
  id,
  'Sashimi Selection',
  'Fresh sashimi: tuna, salmon, yellowtail (18 pieces)',
  'RESTAURANT',
  ARRAY['https://images.unsplash.com/photo-1553621042-f6e147245754?w=800'],
  42.00,
  21.00,
  5,
  5,
  NOW() + INTERVAL '5 hours',
  NOW() + INTERVAL '8 hours',
  NOW() + INTERVAL '8 hours',
  'ACTIVE'
FROM partners WHERE business_name = 'Sushi Zen';

-- ===============================================
-- VERIFICATION
-- ===============================================
SELECT 'Data seeded successfully!' as status;
SELECT COUNT(*) as total_partners FROM partners;
SELECT COUNT(*) as total_offers FROM offers;
SELECT category, COUNT(*) as offers_per_category FROM offers GROUP BY category ORDER BY category;




