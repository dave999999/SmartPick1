-- ============================================
-- DUMMY PARTNERS & OFFERS GENERATOR
-- Creates 10 partners with 3-10 offers each
-- 
-- IMPORTANT: This matches your current schema:
-- - partners.business_hours is JSONB (not separate columns)
-- - partners.status (not approval_status)
-- - partners.email column is required
-- - Business types: BAKERY, RESTAURANT, CAFE, GROCERY only
-- - Note: If you have FAST_FOOD migration, apply it first
-- ============================================

-- First, create user accounts for each partner
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES 
  -- Partner 1: Bakery
  ('a1111111-1111-1111-1111-111111111111', 'bakery.sunrise@smartpick.ge', crypt('DummyPass123!', gen_salt('bf')), now(), now(), now(), '{"role": "partner"}'::jsonb),
  -- Partner 2: Restaurant
  ('a2222222-2222-2222-2222-222222222222', 'restaurant.tbilisi@smartpick.ge', crypt('DummyPass123!', gen_salt('bf')), now(), now(), now(), '{"role": "partner"}'::jsonb),
  -- Partner 3: Cafe
  ('a3333333-3333-3333-3333-333333333333', 'cafe.liberty@smartpick.ge', crypt('DummyPass123!', gen_salt('bf')), now(), now(), now(), '{"role": "partner"}'::jsonb),
  -- Partner 4: Grocery
  ('a4444444-4444-4444-4444-444444444444', 'grocery.fresh@smartpick.ge', crypt('DummyPass123!', gen_salt('bf')), now(), now(), now(), '{"role": "partner"}'::jsonb),
  -- Partner 5: Fast Food
  ('a5555555-5555-5555-5555-555555555555', 'fastfood.express@smartpick.ge', crypt('DummyPass123!', gen_salt('bf')), now(), now(), now(), '{"role": "partner"}'::jsonb),
  -- Partner 6: Bakery (24h)
  ('a6666666-6666-6666-6666-666666666666', 'bakery.night@smartpick.ge', crypt('DummyPass123!', gen_salt('bf')), now(), now(), now(), '{"role": "partner"}'::jsonb),
  -- Partner 7: Restaurant (Fine Dining)
  ('a7777777-7777-7777-7777-777777777777', 'restaurant.garden@smartpick.ge', crypt('DummyPass123!', gen_salt('bf')), now(), now(), now(), '{"role": "partner"}'::jsonb),
  -- Partner 8: Cafe (Specialty)
  ('a8888888-8888-8888-8888-888888888888', 'cafe.brew@smartpick.ge', crypt('DummyPass123!', gen_salt('bf')), now(), now(), now(), '{"role": "partner"}'::jsonb),
  -- Partner 9: Grocery (Organic)
  ('a9999999-9999-9999-9999-999999999999', 'grocery.organic@smartpick.ge', crypt('DummyPass123!', gen_salt('bf')), now(), now(), now(), '{"role": "partner"}'::jsonb),
  -- Partner 10: Fast Food (Healthy)
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fastfood.healthy@smartpick.ge', crypt('DummyPass123!', gen_salt('bf')), now(), now(), now(), '{"role": "partner"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert partner profiles
INSERT INTO partners (
  id, user_id, business_name, business_type, description, 
  address, city, latitude, longitude,
  phone, email, telegram, whatsapp,
  business_hours, status, created_at, updated_at
) VALUES 
  -- Partner 1: Sunrise Bakery (Saburtalo)
  (
    'a1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'Sunrise Bakery',
    'BAKERY',
    'Fresh Georgian bread and pastries baked daily. Family-owned since 1995.',
    'Pekini Ave 15, Saburtalo',
    'Tbilisi',
    41.7225, 44.7517,
    '+995 555 123 456', 'bakery.sunrise@smartpick.ge', '@sunrisebakery', '+995555123456',
    '{"opening": "06:00", "closing": "20:00", "is_24h": false}'::jsonb,
    'APPROVED', now() - interval '30 days', now()
  ),
  
  -- Partner 2: Old Tbilisi Restaurant (Old Town)
  (
    'a2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'Old Tbilisi Restaurant',
    'RESTAURANT',
    'Traditional Georgian cuisine in the heart of Old Tbilisi. Authentic recipes passed through generations.',
    'Shardeni Street 8',
    'Tbilisi',
    41.6922, 44.8082,
    '+995 555 234 567', 'restaurant.tbilisi@smartpick.ge', '@oldtbilisi', '+995555234567',
    '{"opening": "11:00", "closing": "23:00", "is_24h": false}'::jsonb,
    'APPROVED', now() - interval '45 days', now()
  ),
  
  -- Partner 3: Liberty Cafe (Vake)
  (
    'a3333333-3333-3333-3333-333333333333',
    'a3333333-3333-3333-3333-333333333333',
    'Liberty Cafe',
    'CAFE',
    'Cozy cafe with specialty coffee and homemade desserts. Perfect for remote work and meetings.',
    'Chavchavadze Ave 45, Vake',
    'Tbilisi',
    41.7089, 44.7652,
    '+995 555 345 678', 'cafe.liberty@smartpick.ge', '@libertycafe', '+995555345678',
    '{"opening": "08:00", "closing": "22:00", "is_24h": false}'::jsonb,
    'APPROVED', now() - interval '20 days', now()
  ),
  
  -- Partner 4: Fresh Market Grocery (Didube)
  (
    'a4444444-4444-4444-4444-444444444444',
    'a4444444-4444-4444-4444-444444444444',
    'Fresh Market',
    'GROCERY',
    'Local produce, dairy, and daily essentials. Supporting Georgian farmers directly.',
    'Guramishvili Ave 2, Didube',
    'Tbilisi',
    41.7396, 44.7710,
    '+995 555 456 789', 'grocery.fresh@smartpick.ge', '@freshmarket', '+995555456789',
    '{"opening": "07:00", "closing": "21:00", "is_24h": false}'::jsonb,
    'APPROVED', now() - interval '60 days', now()
  ),
  
  -- Partner 5: Quick Bite Express (Station Square)
  (
    'a5555555-5555-5555-5555-555555555555',
    'a5555555-5555-5555-5555-555555555555',
    'Quick Bite Express',
    'RESTAURANT',
    'Fast, fresh, and tasty meals on the go. Georgian fast food done right.',
    'Station Square 1',
    'Tbilisi',
    41.6929, 44.8012,
    '+995 555 567 890', 'fastfood.express@smartpick.ge', '@quickbite', '+995555567890',
    '{"opening": "10:00", "closing": "02:00", "is_24h": false}'::jsonb,
    'APPROVED', now() - interval '15 days', now()
  ),
  
  -- Partner 6: Night Owl Bakery (Gldani) - 24h
  (
    'a6666666-6666-6666-6666-666666666666',
    'a6666666-6666-6666-6666-666666666666',
    'Night Owl Bakery',
    'BAKERY',
    'Fresh bread and pastries 24/7. Never sleep, always fresh!',
    'Gldani Metro, Building 3',
    'Tbilisi',
    41.7642, 44.8065,
    '+995 555 678 901', 'bakery.night@smartpick.ge', '@nightowl', '+995555678901',
    '{"is_24h": true}'::jsonb,
    'APPROVED', now() - interval '10 days', now()
  ),
  
  -- Partner 7: Garden Terrace Restaurant (Mtatsminda)
  (
    'a7777777-7777-7777-7777-777777777777',
    'a7777777-7777-7777-7777-777777777777',
    'Garden Terrace',
    'RESTAURANT',
    'Fine dining with panoramic city views. Modern Georgian cuisine with a twist.',
    'Mtatsminda Park Road 12',
    'Tbilisi',
    41.6941, 44.7884,
    '+995 555 789 012', 'restaurant.garden@smartpick.ge', '@gardenterrace', '+995555789012',
    '{"opening": "12:00", "closing": "00:00", "is_24h": false}'::jsonb,
    'APPROVED', now() - interval '40 days', now()
  ),
  
  -- Partner 8: Artisan Brew Cafe (Vera)
  (
    'a8888888-8888-8888-8888-888888888888',
    'a8888888-8888-8888-8888-888888888888',
    'Artisan Brew',
    'CAFE',
    'Third-wave coffee roastery and cafe. Single-origin beans and expert baristas.',
    'Barnovi Street 23, Vera',
    'Tbilisi',
    41.7067, 44.7855,
    '+995 555 890 123', 'cafe.brew@smartpick.ge', '@artisanbrew', '+995555890123',
    '{"opening": "07:30", "closing": "20:00", "is_24h": false}'::jsonb,
    'APPROVED', now() - interval '25 days', now()
  ),
  
  -- Partner 9: Green Valley Organic (Isani)
  (
    'a9999999-9999-9999-9999-999999999999',
    'a9999999-9999-9999-9999-999999999999',
    'Green Valley Organic',
    'GROCERY',
    'Certified organic produce and products. Farm-to-table in the city.',
    'Isani Mall, Floor 1',
    'Tbilisi',
    41.6972, 44.8275,
    '+995 555 901 234', 'grocery.organic@smartpick.ge', '@greenvalley', '+995555901234',
    '{"opening": "09:00", "closing": "21:00", "is_24h": false}'::jsonb,
    'APPROVED', now() - interval '35 days', now()
  ),
  
  -- Partner 10: Fit Bowl (Saburtalo)
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Fit Bowl',
    'CAFE',
    'Healthy bowls, salads, and smoothies. Clean eating made convenient.',
    'Vazha-Pshavela Ave 71',
    'Tbilisi',
    41.7251, 44.7629,
    '+995 555 012 345', 'fastfood.healthy@smartpick.ge', '@fitbowl', '+995555012345',
    '{"opening": "08:00", "closing": "22:00", "is_24h": false}'::jsonb,
    'APPROVED', now() - interval '12 days', now()
  );

-- Initialize partner points for each partner
-- Note: Slots set to 4 (max offers per partner: 1-4)
INSERT INTO partner_points (user_id, balance, offer_slots, created_at, updated_at)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 500, 4, now(), now()),  -- Sunrise Bakery: 3 offers
  ('a2222222-2222-2222-2222-222222222222', 500, 4, now(), now()),  -- Old Tbilisi Restaurant: 2 offers
  ('a3333333-3333-3333-3333-333333333333', 500, 4, now(), now()),  -- Liberty Cafe: 4 offers
  ('a4444444-4444-4444-4444-444444444444', 500, 4, now(), now()),  -- Fresh Market: 3 offers
  ('a5555555-5555-5555-5555-555555555555', 500, 4, now(), now()),  -- Quick Bite Express: 2 offers
  ('a6666666-6666-6666-6666-666666666666', 500, 4, now(), now()),  -- Night Owl Bakery: 1 offer
  ('a7777777-7777-7777-7777-777777777777', 500, 4, now(), now()),  -- Garden Terrace: 3 offers
  ('a8888888-8888-8888-8888-888888888888', 500, 4, now(), now()),  -- Artisan Brew: 4 offers
  ('a9999999-9999-9999-9999-999999999999', 500, 4, now(), now()),  -- Green Valley Organic: 2 offers
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 500, 4, now(), now())   -- Fit Bowl: 4 offers
ON CONFLICT (user_id) DO UPDATE 
SET offer_slots = EXCLUDED.offer_slots, 
    updated_at = now();

-- Update existing partner slots if they already exist (fallback)
UPDATE partner_points 
SET offer_slots = 4,
    updated_at = now()
WHERE user_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333',
  'a4444444-4444-4444-4444-444444444444',
  'a5555555-5555-5555-5555-555555555555',
  'a6666666-6666-6666-6666-666666666666',
  'a7777777-7777-7777-7777-777777777777',
  'a8888888-8888-8888-8888-888888888888',
  'a9999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

-- ============================================
-- OFFERS FOR EACH PARTNER (1-4 offers each, randomly distributed)
-- Total: 28 offers across 10 partners
-- ============================================

INSERT INTO offers (
  partner_id, title, description, original_price, smart_price,
  quantity_available, quantity_total, category, images, status,
  pickup_start, pickup_end, expires_at, created_at, updated_at
) VALUES 

-- PARTNER 1: Sunrise Bakery (3 offers)
(
  'a1111111-1111-1111-1111-111111111111',
  'Fresh Khachapuri',
  'Traditional Georgian cheese bread, hot from the oven. Imeruli style.',
  8.00, 4.50, 12, 12, 'BAKERY', ARRAY['bakery-1.jpg'],
  'ACTIVE', now(), now() + interval '6 hours', now() + interval '6 hours', now(), now()
),
(
  'a1111111-1111-1111-1111-111111111111',
  'Assorted Pastries Box',
  '6 mixed pastries - croissants, danishes, and cinnamon rolls.',
  15.00, 8.00, 8, 8, 'BAKERY', ARRAY['bakery-2.jpg'],  'ACTIVE', now(), now() + interval '5 hours', now() + interval '5 hours', now(), now()
),
(
  'a1111111-1111-1111-1111-111111111111',
  'Whole Grain Bread Loaf',
  'Freshly baked whole grain bread, perfect for sandwiches.',
  6.00, 3.00, 15, 15, 'BAKERY', ARRAY['bakery-3.jpg'],  'ACTIVE', now(), now() + interval '7 hours', now() + interval '7 hours', now(), now()
),

-- PARTNER 2: Old Tbilisi Restaurant (2 offers)
(
  'a2222222-2222-2222-2222-222222222222',
  'Khinkali (10 pieces)',
  'Traditional Georgian dumplings with meat filling.',
  18.00, 10.00, 8, 8, 'RESTAURANT', ARRAY['restaurant-1.jpg'],  'ACTIVE', now(), now() + interval '4 hours', now() + interval '4 hours', now(), now()
),
(
  'a2222222-2222-2222-2222-222222222222',
  'Chicken Chakhokhbili',
  'Braised chicken in tomato sauce with herbs and spices.',
  22.00, 12.00, 6, 6, 'RESTAURANT', ARRAY['restaurant-2.jpg'],  'ACTIVE', now(), now() + interval '3 hours', now() + interval '3 hours', now(), now()
),

-- PARTNER 3: Liberty Cafe (4 offers)
(
  'a3333333-3333-3333-3333-333333333333',
  'Cappuccino & Croissant Combo',
  'Perfect morning combo - cappuccino with butter croissant.',
  12.00, 6.50, 15, 15, 'CAFE', ARRAY['cafe-1.jpg'],  'ACTIVE', now(), now() + interval '5 hours', now() + interval '5 hours', now(), now()
),
(
  'a3333333-3333-3333-3333-333333333333',
  'Carrot Cake Slice',
  'Homemade carrot cake with cream cheese frosting.',
  8.00, 4.50, 10, 10, 'CAFE', ARRAY['cafe-2.jpg'],  'ACTIVE', now(), now() + interval '6 hours', now() + interval '6 hours', now(), now()
),
(
  'a3333333-3333-3333-3333-333333333333',
  'Chicken Caesar Salad',
  'Fresh romaine, grilled chicken, parmesan, croutons.',
  16.00, 9.00, 8, 8, 'CAFE', ARRAY['cafe-3.jpg'],  'ACTIVE', now(), now() + interval '4 hours', now() + interval '4 hours', now(), now()
),
(
  'a3333333-3333-3333-3333-333333333333',
  'Club Sandwich',
  'Triple-decker with turkey, bacon, and fresh veggies.',
  14.00, 8.00, 7, 7, 'CAFE', ARRAY['cafe-4.jpg'],  'ACTIVE', now(), now() + interval '5 hours', now() + interval '5 hours', now(), now()
),

-- PARTNER 4: Fresh Market (3 offers)
(
  'a4444444-4444-4444-4444-444444444444',
  'Farm Fresh Eggs (10pc)',
  'Free-range eggs from local farms.',
  8.00, 4.50, 20, 20, 'GROCERY', ARRAY['grocery-1.jpg'],  'ACTIVE', now(), now() + interval '8 hours', now() + interval '8 hours', now(), now()
),
(
  'a4444444-4444-4444-4444-444444444444',
  'Georgian Cheese (500g)',
  'Traditional Sulguni cheese, fresh daily.',
  15.00, 8.50, 12, 12, 'GROCERY', ARRAY['grocery-2.jpg'],  'ACTIVE', now(), now() + interval '7 hours', now() + interval '7 hours', now(), now()
),
(
  'a4444444-4444-4444-4444-444444444444',
  'Tomato Box (1kg)',
  'Ripe, fresh tomatoes from Kakhetian farms.',
  6.00, 3.50, 15, 15, 'GROCERY', ARRAY['grocery-3.jpg'],  'ACTIVE', now(), now() + interval '6 hours', now() + interval '6 hours', now(), now()
),

-- PARTNER 5: Quick Bite Express (2 offers)
(
  'a5555555-5555-5555-5555-555555555555',
  'Beef Burger Meal',
  'Juicy burger with fries and drink.',
  18.00, 10.00, 15, 15, 'RESTAURANT', ARRAY['fastfood-1.jpg'],  'ACTIVE', now(), now() + interval '4 hours', now() + interval '4 hours', now(), now()
),
(
  'a5555555-5555-5555-5555-555555555555',
  'Chicken Shawarma Wrap',
  'Grilled chicken wrap with fresh veggies and sauce.',
  12.00, 7.00, 20, 20, 'RESTAURANT', ARRAY['fastfood-2.jpg'],  'ACTIVE', now(), now() + interval '5 hours', now() + interval '5 hours', now(), now()
),

-- PARTNER 6: Night Owl Bakery - 24h (1 offer)
(
  'a6666666-6666-6666-6666-666666666666',
  'Midnight Khachapuri',
  'Hot cheese bread available 24/7.',
  9.00, 5.00, 15, 15, 'BAKERY', ARRAY['bakery-8.jpg'],  'ACTIVE', now(), now() + interval '10 hours', now() + interval '10 hours', now(), now()
),

-- PARTNER 7: Garden Terrace (Fine Dining) (3 offers)
(
  'a7777777-7777-7777-7777-777777777777',
  'Grilled Sea Bass',
  'Fresh sea bass with lemon butter sauce and vegetables.',
  45.00, 25.00, 4, 4, 'RESTAURANT', ARRAY['restaurant-9.jpg'],  'ACTIVE', now(), now() + interval '3 hours', now() + interval '3 hours', now(), now()
),
(
  'a7777777-7777-7777-7777-777777777777',
  'Filet Mignon with Truffle',
  'Premium beef tenderloin with truffle sauce.',
  55.00, 30.00, 3, 3, 'RESTAURANT', ARRAY['restaurant-10.jpg'],  'ACTIVE', now(), now() + interval '4 hours', now() + interval '4 hours', now(), now()
),
(
  'a7777777-7777-7777-7777-777777777777',
  'Tiramisu',
  'Classic Italian dessert, house-made.',
  14.00, 8.00, 8, 8, 'RESTAURANT', ARRAY['restaurant-13.jpg'],  'ACTIVE', now(), now() + interval '6 hours', now() + interval '6 hours', now(), now()
),

-- PARTNER 8: Artisan Brew (Specialty Cafe) (4 offers)
(
  'a8888888-8888-8888-8888-888888888888',
  'Pour Over Coffee (Ethiopia)',
  'Single-origin Ethiopian coffee, hand-brewed.',
  9.00, 5.00, 12, 12, 'CAFE', ARRAY['cafe-7.jpg'],  'ACTIVE', now(), now() + interval '5 hours', now() + interval '5 hours', now(), now()
),
(
  'a8888888-8888-8888-8888-888888888888',
  'Flat White',
  'Velvety espresso with microfoam milk art.',
  7.00, 4.00, 15, 15, 'CAFE', ARRAY['cafe-8.jpg'],  'ACTIVE', now(), now() + interval '6 hours', now() + interval '6 hours', now(), now()
),
(
  'a8888888-8888-8888-8888-888888888888',
  'Avocado Toast',
  'Smashed avocado on sourdough with poached egg.',
  14.00, 8.00, 10, 10, 'CAFE', ARRAY['cafe-9.jpg'],  'ACTIVE', now(), now() + interval '4 hours', now() + interval '4 hours', now(), now()
),
(
  'a8888888-8888-8888-8888-888888888888',
  'Matcha Latte',
  'Premium ceremonial matcha with oat milk.',
  10.00, 6.00, 12, 12, 'CAFE', ARRAY['cafe-11.jpg'],  'ACTIVE', now(), now() + interval '6 hours', now() + interval '6 hours', now(), now()
),

-- PARTNER 9: Green Valley Organic (2 offers)
(
  'a9999999-9999-9999-9999-999999999999',
  'Organic Salad Mix (300g)',
  'Fresh mixed greens, certified organic.',
  10.00, 6.00, 15, 15, 'GROCERY', ARRAY['grocery-11.jpg'],  'ACTIVE', now(), now() + interval '7 hours', now() + interval '7 hours', now(), now()
),
(
  'a9999999-9999-9999-9999-999999999999',
  'Free-Range Chicken Breast (500g)',
  'Organic, hormone-free chicken.',
  18.00, 10.00, 10, 10, 'GROCERY', ARRAY['grocery-12.jpg'],  'ACTIVE', now(), now() + interval '6 hours', now() + interval '6 hours', now(), now()
),

-- PARTNER 10: Fit Bowl (Healthy Cafe) (4 offers)
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Protein Power Bowl',
  'Grilled chicken, quinoa, avocado, and veggies.',
  16.00, 9.00, 12, 12, 'CAFE', ARRAY['fastfood-6.jpg'],  'ACTIVE', now(), now() + interval '5 hours', now() + interval '5 hours', now(), now()
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Vegan Buddha Bowl',
  'Mixed grains, roasted vegetables, tahini dressing.',
  14.00, 8.00, 10, 10, 'CAFE', ARRAY['fastfood-7.jpg'],  'ACTIVE', now(), now() + interval '6 hours', now() + interval '6 hours', now(), now()
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Green Detox Smoothie',
  'Spinach, kale, apple, banana, chia seeds.',
  8.00, 4.50, 15, 15, 'CAFE', ARRAY['fastfood-8.jpg'],  'ACTIVE', now(), now() + interval '7 hours', now() + interval '7 hours', now(), now()
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Salmon Poke Bowl',
  'Fresh salmon, edamame, cucumber, seaweed.',
  20.00, 12.00, 8, 8, 'CAFE', ARRAY['fastfood-9.jpg'],  'ACTIVE', now(), now() + interval '4 hours', now() + interval '4 hours', now(), now()
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check partner count
SELECT COUNT(*) as total_partners FROM partners WHERE status = 'APPROVED';

-- Check offers per partner
SELECT 
  p.business_name,
  p.business_type,
  COUNT(o.id) as offer_count
FROM partners p
LEFT JOIN offers o ON p.user_id = o.partner_id
WHERE p.status = 'APPROVED'
GROUP BY p.user_id, p.business_name, p.business_type
ORDER BY p.business_name;

-- Check total offers
SELECT COUNT(*) as total_offers FROM offers WHERE status = 'ACTIVE';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Successfully created:';
  RAISE NOTICE '   - 10 dummy partners';
  RAISE NOTICE '   - 28 total offers (1-4 per partner, randomly distributed)';
  RAISE NOTICE '   - All partners approved and ready';
  RAISE NOTICE '   - All offers active with expiration times';
  RAISE NOTICE '';
  RAISE NOTICE '📍 Locations spread across Tbilisi:';
  RAISE NOTICE '   - Saburtalo, Old Town, Vake, Didube';
  RAISE NOTICE '   - Station Square, Gldani, Mtatsminda';
  RAISE NOTICE '   - Vera, Isani';
  RAISE NOTICE '';
  RAISE NOTICE '🏪 Business types:';
  RAISE NOTICE '   - 3 Bakeries (1 is 24h)';
  RAISE NOTICE '   - 3 Restaurants (1 quick service)';
  RAISE NOTICE '   - 3 Cafes (1 healthy focused)';
  RAISE NOTICE '   - 2 Grocery stores (1 organic)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Offer distribution: 3,2,4,3,2,1,3,4,2,4';
END $$;

