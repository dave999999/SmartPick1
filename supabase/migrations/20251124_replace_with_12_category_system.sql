-- =====================================================
-- MIGRATION: Replace Category System with New 12-Category Structure
-- Date: 2025-11-24
-- Description: Completely replaces the existing 6-category system with a new
-- 12-category system with main categories and subcategories
-- =====================================================

-- =====================================================
-- STEP 1: Create categories lookup table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  main_category VARCHAR(50) NOT NULL,
  sub_category VARCHAR(100) NOT NULL,
  icon_name VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(main_category, sub_category)
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_categories_main ON public.categories(main_category);
CREATE INDEX IF NOT EXISTS idx_categories_sub ON public.categories(sub_category);

-- =====================================================
-- STEP 2: Modify offers table to support subcategories
-- =====================================================
-- Add sub_category column to offers table
ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100);

-- Update the category column to allow longer names
ALTER TABLE public.offers
ALTER COLUMN category TYPE VARCHAR(50);

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_offers_category ON public.offers(category);
CREATE INDEX IF NOT EXISTS idx_offers_sub_category ON public.offers(sub_category);

-- =====================================================
-- STEP 3: Update partners table business_type constraint
-- =====================================================
-- Drop old constraint
ALTER TABLE public.partners
DROP CONSTRAINT IF EXISTS partners_business_type_check;

-- Add new constraint with all 12 categories
ALTER TABLE public.partners
ADD CONSTRAINT partners_business_type_check
CHECK (business_type::text = ANY (
  ARRAY[
    'RESTAURANT',
    'FAST_FOOD',
    'BAKERY',
    'DESSERTS_SWEETS',
    'CAFE',
    'DRINKS_JUICE',
    'GROCERY',
    'MINI_MARKET',
    'MEAT_BUTCHER',
    'FISH_SEAFOOD',
    'ALCOHOL',
    'GEORGIAN_TRADITIONAL'
  ]::text[]
));

-- =====================================================
-- STEP 4: Insert new category data
-- =====================================================

-- Clear existing categories if table existed
TRUNCATE TABLE public.categories RESTART IDENTITY CASCADE;

-- 1. RESTAURANT
INSERT INTO public.categories (main_category, sub_category, icon_name) VALUES
('RESTAURANT', 'Georgian Cuisine', 'restaurant'),
('RESTAURANT', 'European', 'restaurant'),
('RESTAURANT', 'Italian', 'restaurant'),
('RESTAURANT', 'Asian / Chinese', 'restaurant'),
('RESTAURANT', 'Japanese / Sushi', 'restaurant'),
('RESTAURANT', 'Indian', 'restaurant'),
('RESTAURANT', 'Middle Eastern', 'restaurant'),
('RESTAURANT', 'Turkish', 'restaurant'),
('RESTAURANT', 'BBQ / Grill', 'restaurant'),
('RESTAURANT', 'Seafood Restaurants', 'restaurant');

-- 2. FAST FOOD
INSERT INTO public.categories (main_category, sub_category, icon_name) VALUES
('FAST_FOOD', 'Burgers', 'fast-food'),
('FAST_FOOD', 'Fries / Wings', 'fast-food'),
('FAST_FOOD', 'Shawarma / Doner', 'fast-food'),
('FAST_FOOD', 'Hotdogs', 'fast-food'),
('FAST_FOOD', 'Sandwiches', 'fast-food'),
('FAST_FOOD', 'Tacos / Wraps', 'fast-food'),
('FAST_FOOD', 'Fried Chicken', 'fast-food');

-- 3. BAKERY
INSERT INTO public.categories (main_category, sub_category, icon_name) VALUES
('BAKERY', 'Fresh Bread', 'bakery'),
('BAKERY', 'Pastries', 'bakery'),
('BAKERY', 'Croissants', 'bakery'),
('BAKERY', 'Cake slices', 'bakery'),
('BAKERY', 'Cookies', 'bakery'),
('BAKERY', 'Pretzels', 'bakery'),
('BAKERY', 'Puff Pastry (Penovani)', 'bakery');

-- 4. DESSERTS & SWEETS
INSERT INTO public.categories (main_category, sub_category, icon_name) VALUES
('DESSERTS_SWEETS', 'Cakes', 'dessert'),
('DESSERTS_SWEETS', 'Cupcakes', 'dessert'),
('DESSERTS_SWEETS', 'Cheesecakes', 'dessert'),
('DESSERTS_SWEETS', 'Ice Cream / Gelato', 'dessert'),
('DESSERTS_SWEETS', 'Donuts', 'dessert'),
('DESSERTS_SWEETS', 'Chocolate / Confectionery', 'dessert');

-- 5. CAFE
INSERT INTO public.categories (main_category, sub_category, icon_name) VALUES
('CAFE', 'Coffee', 'cafe'),
('CAFE', 'Tea', 'cafe'),
('CAFE', 'Latte / Cappuccino', 'cafe'),
('CAFE', 'Bakery Café', 'cafe'),
('CAFE', 'Breakfast Café', 'cafe');

-- 6. DRINKS & JUICE BARS
INSERT INTO public.categories (main_category, sub_category, icon_name) VALUES
('DRINKS_JUICE', 'Fresh Juice', 'juice'),
('DRINKS_JUICE', 'Smoothies', 'juice'),
('DRINKS_JUICE', 'Bubble Tea', 'juice'),
('DRINKS_JUICE', 'Iced Drinks', 'juice'),
('DRINKS_JUICE', 'Lemonade & Soft Drinks', 'juice');

-- 7. GROCERY STORES
INSERT INTO public.categories (main_category, sub_category, icon_name) VALUES
('GROCERY', 'Fruits & Vegetables', 'grocery'),
('GROCERY', 'Bread & Pastries', 'grocery'),
('GROCERY', 'Dairy', 'grocery'),
('GROCERY', 'Snacks', 'grocery'),
('GROCERY', 'Frozen Food', 'grocery'),
('GROCERY', 'Everyday Essentials', 'grocery');

-- 8. MINI MARKETS
INSERT INTO public.categories (main_category, sub_category, icon_name) VALUES
('MINI_MARKET', 'SPAR', 'minimarket'),
('MINI_MARKET', 'Nikora', 'minimarket'),
('MINI_MARKET', 'Carrefour Market', 'minimarket'),
('MINI_MARKET', 'Fresco', 'minimarket'),
('MINI_MARKET', 'Local Mini Shops', 'minimarket'),
('MINI_MARKET', '24/7 Stores', 'minimarket');

-- 9. MEAT & BUTCHERS
INSERT INTO public.categories (main_category, sub_category, icon_name) VALUES
('MEAT_BUTCHER', 'Beef', 'meat'),
('MEAT_BUTCHER', 'Pork', 'meat'),
('MEAT_BUTCHER', 'Chicken', 'meat'),
('MEAT_BUTCHER', 'Sausages', 'meat'),
('MEAT_BUTCHER', 'Smoked Meat', 'meat'),
('MEAT_BUTCHER', 'Kebab Meat', 'meat'),
('MEAT_BUTCHER', 'Mix Packs / Discounts', 'meat');

-- 10. FISH & SEAFOOD
INSERT INTO public.categories (main_category, sub_category, icon_name) VALUES
('FISH_SEAFOOD', 'Fresh Fish', 'fish'),
('FISH_SEAFOOD', 'Salmon', 'fish'),
('FISH_SEAFOOD', 'Seafood Mix', 'fish'),
('FISH_SEAFOOD', 'Sushi Ingredients', 'fish'),
('FISH_SEAFOOD', 'Frozen Fish', 'fish');

-- 11. ALCOHOL SHOPS
INSERT INTO public.categories (main_category, sub_category, icon_name) VALUES
('ALCOHOL', 'Wine', 'alcohol'),
('ALCOHOL', 'Beer', 'alcohol'),
('ALCOHOL', 'Spirits', 'alcohol'),
('ALCOHOL', 'Cocktails', 'alcohol'),
('ALCOHOL', 'Craft Beverages', 'alcohol');

-- 12. GEORGIAN TRADITIONAL
INSERT INTO public.categories (main_category, sub_category, icon_name) VALUES
('GEORGIAN_TRADITIONAL', 'Imeruli Khachapuri', 'georgian'),
('GEORGIAN_TRADITIONAL', 'Megruli Khachapuri', 'georgian'),
('GEORGIAN_TRADITIONAL', 'Adjaruli Khachapuri', 'georgian'),
('GEORGIAN_TRADITIONAL', 'Khinkali', 'georgian'),
('GEORGIAN_TRADITIONAL', 'Mtsvadi', 'georgian'),
('GEORGIAN_TRADITIONAL', 'Ojakhuri', 'georgian'),
('GEORGIAN_TRADITIONAL', 'Pkhali / Marinated food', 'georgian');

-- =====================================================
-- STEP 5: Migrate existing offer categories
-- =====================================================
-- Map old categories to new main categories (best effort)
-- This preserves existing offers with updated category names

-- Update BAKERY → BAKERY
UPDATE public.offers
SET category = 'BAKERY',
    sub_category = 'Fresh Bread'
WHERE category IN ('BAKERY', 'bakery', 'Bakery')
  AND sub_category IS NULL;

-- Update RESTAURANT → RESTAURANT
UPDATE public.offers
SET category = 'RESTAURANT',
    sub_category = 'Georgian Cuisine'
WHERE category IN ('RESTAURANT', 'restaurant', 'Restaurant')
  AND sub_category IS NULL;

-- Update CAFE → CAFE
UPDATE public.offers
SET category = 'CAFE',
    sub_category = 'Coffee'
WHERE category IN ('CAFE', 'cafe', 'Cafe')
  AND sub_category IS NULL;

-- Update GROCERY → GROCERY
UPDATE public.offers
SET category = 'GROCERY',
    sub_category = 'Everyday Essentials'
WHERE category IN ('GROCERY', 'grocery', 'Grocery')
  AND sub_category IS NULL;

-- Update FAST_FOOD → FAST_FOOD
UPDATE public.offers
SET category = 'FAST_FOOD',
    sub_category = 'Burgers'
WHERE category IN ('FAST_FOOD', 'fast_food', 'FastFood', 'FASTFOOD')
  AND sub_category IS NULL;

-- Update ALCOHOL → ALCOHOL
UPDATE public.offers
SET category = 'ALCOHOL',
    sub_category = 'Wine'
WHERE category IN ('ALCOHOL', 'alcohol', 'Alcohol')
  AND sub_category IS NULL;

-- =====================================================
-- STEP 6: Grant permissions
-- =====================================================
-- Allow authenticated users to read categories
GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT ON public.categories TO anon;

-- =====================================================
-- STEP 7: Add comments for documentation
-- =====================================================
COMMENT ON TABLE public.categories IS 'Lookup table for SmartPick 12-category system with main categories and subcategories';
COMMENT ON COLUMN public.categories.main_category IS 'Main business category (e.g., RESTAURANT, BAKERY)';
COMMENT ON COLUMN public.categories.sub_category IS 'Specific subcategory (e.g., Georgian Cuisine, Fresh Bread)';
COMMENT ON COLUMN public.categories.icon_name IS 'Icon identifier for map markers';
COMMENT ON COLUMN public.offers.category IS 'Main category from the 12-category system';
COMMENT ON COLUMN public.offers.sub_category IS 'Specific subcategory for the offer';

-- =====================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- =====================================================
-- SELECT main_category, COUNT(*) as subcategory_count
-- FROM public.categories
-- GROUP BY main_category
-- ORDER BY main_category;

-- SELECT category, sub_category, COUNT(*) as offer_count
-- FROM public.offers
-- GROUP BY category, sub_category
-- ORDER BY category, sub_category;
