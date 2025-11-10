-- Create 40 offers for existing partners (4 offers per partner)
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  partner_record RECORD;
  pickup_start TIMESTAMP;
  pickup_end TIMESTAMP;
  expires_at TIMESTAMP;
  offer_data RECORD;
BEGIN
  -- Set pickup times for today
  pickup_start := CURRENT_DATE + INTERVAL '18 hours';
  pickup_end := CURRENT_DATE + INTERVAL '21 hours';
  expires_at := CURRENT_DATE + INTERVAL '23 hours 59 minutes';

  -- Define offers by business type
  FOR partner_record IN 
    SELECT id, business_name, business_type, address 
    FROM partners 
    WHERE status = 'APPROVED'
    ORDER BY id
  LOOP
    -- Create 4 offers per partner based on business_type
    IF partner_record.business_type = 'BAKERY' THEN
      -- Offer 1: Khachapuri
      INSERT INTO offers (partner_id, category, title, description, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
      VALUES (
        partner_record.id,
        'BAKERY',
        'Fresh Khachapuri',
        'Traditional Georgian cheese bread',
        '{}',
        8.00,
        CAST(8.00 * 0.70 AS NUMERIC(10,2)),
        15,
        20,
        pickup_start,
        pickup_end,
        expires_at,
        'ACTIVE'
      );

      -- Offer 2: Shotis Puri
      INSERT INTO offers (partner_id, category, title, description, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
      VALUES (
        partner_record.id,
        'BAKERY',
        'Shotis Puri',
        'Classic Georgian bread baked in tone',
        '{}',
        3.00,
        CAST(3.00 * 0.75 AS NUMERIC(10,2)),
        20,
        25,
        pickup_start,
        pickup_end,
        expires_at,
        'ACTIVE'
      );

      -- Offer 3: Lobiani
      INSERT INTO offers (partner_id, category, title, description, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
      VALUES (
        partner_record.id,
        'BAKERY',
        'Lobiani',
        'Bean-filled bread',
        '{}',
        6.00,
        CAST(6.00 * 0.65 AS NUMERIC(10,2)),
        12,
        15,
        pickup_start,
        pickup_end,
        expires_at,
        'ACTIVE'
      );

      -- Offer 4: Sweet Pastries
      INSERT INTO offers (partner_id, category, title, description, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
      VALUES (
        partner_record.id,
        'BAKERY',
        'Sweet Pastries Mix',
        'Assorted fresh pastries',
        '{}',
        12.00,
        CAST(12.00 * 0.60 AS NUMERIC(10,2)),
        10,
        15,
        pickup_start,
        pickup_end,
        expires_at,
        'ACTIVE'
      );

    ELSIF partner_record.business_type = 'RESTAURANT' THEN
      -- Restaurant offers
      INSERT INTO offers (partner_id, category, title, description, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
      VALUES 
        (partner_record.id, 'RESTAURANT', 'Khinkali (10 pcs)', 'Georgian dumplings with meat', '{}', 15.00, CAST(15.00 * 0.70 AS NUMERIC(10,2)), 8, 12, pickup_start, pickup_end, expires_at, 'ACTIVE'),
        (partner_record.id, 'RESTAURANT', 'Mtsvadi Plate', 'Grilled meat skewers', '{}', 20.00, CAST(20.00 * 0.65 AS NUMERIC(10,2)), 6, 10, pickup_start, pickup_end, expires_at, 'ACTIVE'),
        (partner_record.id, 'RESTAURANT', 'Ojakhuri', 'Fried potatoes with meat', '{}', 12.00, CAST(12.00 * 0.75 AS NUMERIC(10,2)), 10, 15, pickup_start, pickup_end, expires_at, 'ACTIVE'),
        (partner_record.id, 'RESTAURANT', 'Pkhali Assortment', 'Mixed vegetable pâtés', '{}', 10.00, CAST(10.00 * 0.70 AS NUMERIC(10,2)), 12, 15, pickup_start, pickup_end, expires_at, 'ACTIVE');

    ELSIF partner_record.business_type = 'CAFE' THEN
      -- Cafe offers
      INSERT INTO offers (partner_id, category, title, description, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
      VALUES 
        (partner_record.id, 'CAFE', 'Coffee & Cake Combo', 'Fresh coffee with homemade cake', '{}', 8.00, CAST(8.00 * 0.60 AS NUMERIC(10,2)), 15, 20, pickup_start, pickup_end, expires_at, 'ACTIVE'),
        (partner_record.id, 'CAFE', 'Breakfast Set', 'Eggs, bread, and coffee', '{}', 10.00, CAST(10.00 * 0.65 AS NUMERIC(10,2)), 10, 15, pickup_start, pickup_end, expires_at, 'ACTIVE'),
        (partner_record.id, 'CAFE', 'Sandwich & Drink', 'Fresh sandwich with beverage', '{}', 7.00, CAST(7.00 * 0.70 AS NUMERIC(10,2)), 12, 18, pickup_start, pickup_end, expires_at, 'ACTIVE'),
        (partner_record.id, 'CAFE', 'Dessert Platter', 'Selection of sweet treats', '{}', 12.00, CAST(12.00 * 0.55 AS NUMERIC(10,2)), 8, 12, pickup_start, pickup_end, expires_at, 'ACTIVE');

    ELSIF partner_record.business_type = 'GROCERY' THEN
      -- Grocery offers
      INSERT INTO offers (partner_id, category, title, description, images, original_price, smart_price, quantity_available, quantity_total, pickup_start, pickup_end, expires_at, status)
      VALUES 
        (partner_record.id, 'GROCERY', 'Fresh Produce Box', 'Mixed seasonal vegetables', '{}', 15.00, CAST(15.00 * 0.70 AS NUMERIC(10,2)), 10, 15, pickup_start, pickup_end, expires_at, 'ACTIVE'),
        (partner_record.id, 'GROCERY', 'Dairy Bundle', 'Milk, cheese, and yogurt', '{}', 12.00, CAST(12.00 * 0.75 AS NUMERIC(10,2)), 12, 18, pickup_start, pickup_end, expires_at, 'ACTIVE'),
        (partner_record.id, 'GROCERY', 'Bread & Bakery Pack', 'Assorted bread products', '{}', 8.00, CAST(8.00 * 0.65 AS NUMERIC(10,2)), 15, 20, pickup_start, pickup_end, expires_at, 'ACTIVE'),
        (partner_record.id, 'GROCERY', 'Fruit Basket', 'Fresh seasonal fruits', '{}', 18.00, CAST(18.00 * 0.60 AS NUMERIC(10,2)), 8, 12, pickup_start, pickup_end, expires_at, 'ACTIVE');
    END IF;

  END LOOP;

  RAISE NOTICE 'Successfully created offers for all partners!';
END $$;

-- Verify the results
SELECT 
  p.business_name,
  p.business_type,
  COUNT(o.id) as offer_count
FROM partners p
LEFT JOIN offers o ON p.id = o.partner_id
WHERE p.status = 'APPROVED'
GROUP BY p.id, p.business_name, p.business_type
ORDER BY p.business_name;

-- Show total count
SELECT COUNT(*) as total_offers FROM offers;
