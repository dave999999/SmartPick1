-- Add missing offers for all partners
-- This script bypasses RLS by running as a database function

DO $$
DECLARE
  partner_record RECORD;
  offer_count INTEGER;
  needed_offers INTEGER;
  i INTEGER;
  template_idx INTEGER;
  original_price DECIMAL(10,2);
  smart_price DECIMAL(10,2);
  quantity INTEGER;
  pickup_start TIMESTAMP WITH TIME ZONE;
  pickup_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set pickup window (today 6 PM - 9 PM)
  pickup_start := DATE_TRUNC('day', NOW()) + INTERVAL '18 hours';
  pickup_end := DATE_TRUNC('day', NOW()) + INTERVAL '21 hours';

  -- Loop through all approved partners
  FOR partner_record IN 
    SELECT id, business_name, business_type 
    FROM public.partners 
    WHERE status = 'APPROVED'
  LOOP
    -- Count existing offers
    SELECT COUNT(*) INTO offer_count 
    FROM public.offers 
    WHERE partner_id = partner_record.id;
    
    needed_offers := 4 - offer_count;
    
    RAISE NOTICE 'Partner: % (%), Current offers: %, Adding: %', 
      partner_record.business_name, partner_record.business_type, offer_count, needed_offers;
    
    IF needed_offers > 0 THEN
      -- Add offers based on business type
      FOR i IN 1..needed_offers LOOP
        template_idx := (offer_count + i - 1) % 4;
        original_price := 10 + FLOOR(RANDOM() * 40);
        smart_price := ROUND(original_price * (0.5 + RANDOM() * 0.3), 2);
        quantity := 5 + FLOOR(RANDOM() * 20);
        
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
    END IF;
  END LOOP;
  
  RAISE NOTICE 'All offers added successfully!';
END $$;

-- Show final count
SELECT 
  p.business_name,
  p.business_type,
  COUNT(o.id) as offer_count
FROM public.partners p
LEFT JOIN public.offers o ON o.partner_id = p.id
WHERE p.status = 'APPROVED'
GROUP BY p.id, p.business_name, p.business_type
ORDER BY p.business_name;