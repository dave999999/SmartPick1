-- Refresh Offers Script
-- This script deletes all existing offers and creates fresh ones with updated pickup times
-- Run this in Supabase SQL Editor to refresh expired offers

-- Step 1: Delete all existing offers
DELETE FROM public.offers;

-- Step 2: Add fresh offers for all approved partners with updated pickup times
DO $$
DECLARE
  partner_record RECORD;
  offer_count INTEGER;
  i INTEGER;
  template_idx INTEGER;
  original_price DECIMAL(10,2);
  smart_price DECIMAL(10,2);
  quantity INTEGER;
  pickup_start TIMESTAMP WITH TIME ZONE;
  pickup_end TIMESTAMP WITH TIME ZONE;
  day_offset INTEGER;
BEGIN
  RAISE NOTICE 'Starting to create fresh offers...';
  
  -- Loop through all approved partners
  FOR partner_record IN 
    SELECT id, business_name, business_type 
    FROM public.partners 
    WHERE status = 'APPROVED'
  LOOP
    RAISE NOTICE 'Creating offers for: % (%)', partner_record.business_name, partner_record.business_type;
    
    -- Create 4-6 offers per partner across different time slots
    FOR i IN 1..6 LOOP
      template_idx := (i - 1) % 4;
      original_price := 10 + FLOOR(RANDOM() * 40);
      smart_price := ROUND((original_price * (0.5 + RANDOM() * 0.3))::numeric, 2);
      quantity := 5 + FLOOR(RANDOM() * 20);
      
      -- Distribute offers across today and next 2 days with different time slots
      day_offset := (i - 1) / 2; -- 2 offers per day
      
      -- Set pickup times based on business type and offer index
      IF partner_record.business_type = 'BAKERY' THEN
        -- Bakery: Morning slots (7 AM - 11 AM)
        pickup_start := DATE_TRUNC('day', NOW() + (day_offset || ' days')::INTERVAL) + INTERVAL '7 hours' + ((i % 2) * 2 || ' hours')::INTERVAL;
        pickup_end := pickup_start + INTERVAL '2 hours';
      ELSIF partner_record.business_type = 'CAFE' THEN
        -- Cafe: Morning and afternoon slots (8 AM - 4 PM)
        pickup_start := DATE_TRUNC('day', NOW() + (day_offset || ' days')::INTERVAL) + INTERVAL '8 hours' + ((i % 2) * 4 || ' hours')::INTERVAL;
        pickup_end := pickup_start + INTERVAL '2 hours';
      ELSIF partner_record.business_type = 'RESTAURANT' THEN
        -- Restaurant: Lunch and dinner slots (11 AM - 2 PM, 5 PM - 9 PM)
        IF i % 2 = 1 THEN
          -- Lunch slot
          pickup_start := DATE_TRUNC('day', NOW() + (day_offset || ' days')::INTERVAL) + INTERVAL '11 hours';
          pickup_end := pickup_start + INTERVAL '3 hours';
        ELSE
          -- Dinner slot
          pickup_start := DATE_TRUNC('day', NOW() + (day_offset || ' days')::INTERVAL) + INTERVAL '17 hours';
          pickup_end := pickup_start + INTERVAL '4 hours';
        END IF;
      ELSIF partner_record.business_type = 'GROCERY' THEN
        -- Grocery: All day slots (9 AM - 8 PM)
        pickup_start := DATE_TRUNC('day', NOW() + (day_offset || ' days')::INTERVAL) + INTERVAL '9 hours' + ((i % 2) * 5 || ' hours')::INTERVAL;
        pickup_end := pickup_start + INTERVAL '3 hours';
      ELSE
        -- Default: Evening slots (5 PM - 9 PM)
        pickup_start := DATE_TRUNC('day', NOW() + (day_offset || ' days')::INTERVAL) + INTERVAL '17 hours' + ((i % 2) * 2 || ' hours')::INTERVAL;
        pickup_end := pickup_start + INTERVAL '2 hours';
      END IF;
      
      -- Insert offer based on business type
      IF partner_record.business_type = 'BAKERY' THEN
        INSERT INTO public.offers (
          partner_id, category, title, description,
          original_price, smart_price, quantity_available, quantity_total,
          pickup_start, pickup_end, expires_at, status, images
        ) VALUES (
          partner_record.id,
          'BAKERY',
          CASE template_idx
            WHEN 0 THEN 'Khachapuri Imeruli'
            WHEN 1 THEN 'Khachapuri Adjaruli'
            WHEN 2 THEN 'Lobiani'
            ELSE 'Shotis Puri'
          END,
          CASE template_idx
            WHEN 0 THEN 'Traditional cheese-filled bread from Imereti region'
            WHEN 1 THEN 'Boat-shaped khachapuri with egg and butter'
            WHEN 2 THEN 'Bean-filled Georgian bread, perfect for lunch'
            ELSE 'Traditional Georgian bread baked in tone oven'
          END,
          original_price, smart_price, quantity, quantity,
          pickup_start, pickup_end, pickup_end, 'ACTIVE', ARRAY[]::TEXT[]
        );
        
      ELSIF partner_record.business_type = 'RESTAURANT' THEN
        INSERT INTO public.offers (
          partner_id, category, title, description,
          original_price, smart_price, quantity_available, quantity_total,
          pickup_start, pickup_end, expires_at, status, images
        ) VALUES (
          partner_record.id,
          'RESTAURANT',
          CASE template_idx
            WHEN 0 THEN 'Khinkali (10 pcs)'
            WHEN 1 THEN 'Mtsvadi Set'
            WHEN 2 THEN 'Ojakhuri'
            ELSE 'Pkhali Assortment'
          END,
          CASE template_idx
            WHEN 0 THEN 'Georgian dumplings filled with spiced meat'
            WHEN 1 THEN 'Grilled meat skewers with vegetables'
            WHEN 2 THEN 'Fried potatoes with meat and onions'
            ELSE 'Mixed vegetable pâtés with walnuts'
          END,
          original_price, smart_price, quantity, quantity,
          pickup_start, pickup_end, pickup_end, 'ACTIVE', ARRAY[]::TEXT[]
        );
        
      ELSIF partner_record.business_type = 'CAFE' THEN
        INSERT INTO public.offers (
          partner_id, category, title, description,
          original_price, smart_price, quantity_available, quantity_total,
          pickup_start, pickup_end, expires_at, status, images
        ) VALUES (
          partner_record.id,
          'CAFE',
          CASE template_idx
            WHEN 0 THEN 'Churchkhela (3 pcs)'
            WHEN 1 THEN 'Pelamushi'
            WHEN 2 THEN 'Napoleon Cake Slice'
            ELSE 'Cheese Pastry Box'
          END,
          CASE template_idx
            WHEN 0 THEN 'Traditional Georgian candy made with nuts and grape juice'
            WHEN 1 THEN 'Grape juice dessert with walnuts'
            WHEN 2 THEN 'Layered puff pastry cake with cream'
            ELSE 'Assorted cheese-filled pastries'
          END,
          original_price, smart_price, quantity, quantity,
          pickup_start, pickup_end, pickup_end, 'ACTIVE', ARRAY[]::TEXT[]
        );
        
      ELSIF partner_record.business_type = 'GROCERY' THEN
        INSERT INTO public.offers (
          partner_id, category, title, description,
          original_price, smart_price, quantity_available, quantity_total,
          pickup_start, pickup_end, expires_at, status, images
        ) VALUES (
          partner_record.id,
          'GROCERY',
          CASE template_idx
            WHEN 0 THEN 'Fresh Bread Bundle'
            WHEN 1 THEN 'Vegetable Mix'
            WHEN 2 THEN 'Dairy Products Set'
            ELSE 'Fruit Basket'
          END,
          CASE template_idx
            WHEN 0 THEN 'Assorted fresh bread from today''s baking'
            WHEN 1 THEN 'Fresh seasonal vegetables nearing best-by date'
            WHEN 2 THEN 'Milk, yogurt, and cheese approaching expiry'
            ELSE 'Mixed fruits perfect for immediate consumption'
          END,
          original_price, smart_price, quantity, quantity,
          pickup_start, pickup_end, pickup_end, 'ACTIVE', ARRAY[]::TEXT[]
        );
      END IF;
      
      RAISE NOTICE '  Added offer % for %', i, partner_record.business_name;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'All offers refreshed successfully!';
END $$;

-- Step 3: Show summary of created offers
SELECT 
  p.business_name,
  p.business_type,
  COUNT(o.id) as offer_count,
  MIN(o.pickup_start) as earliest_pickup,
  MAX(o.pickup_end) as latest_pickup
FROM public.partners p
LEFT JOIN public.offers o ON o.partner_id = p.id
WHERE p.status = 'APPROVED'
GROUP BY p.id, p.business_name, p.business_type
ORDER BY p.business_name;

-- Step 4: Show total offers created
SELECT COUNT(*) as total_offers FROM public.offers;