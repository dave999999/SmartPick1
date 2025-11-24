# SmartPick 12-Category Quick Reference

## 📊 Complete Category Breakdown

| # | Main Category | Emoji | Icon File | Subcategories Count |
|---|--------------|-------|-----------|-------------------|
| 1 | RESTAURANT | 🍽️ | restaurant.png | 10 |
| 2 | FAST_FOOD | 🍔 | fast-food.png | 7 |
| 3 | BAKERY | 🥐 | bakery.png | 7 |
| 4 | DESSERTS_SWEETS | 🍰 | dessert.png | 6 |
| 5 | CAFE | ☕ | cafe.png | 5 |
| 6 | DRINKS_JUICE | 🥤 | juice.png | 5 |
| 7 | GROCERY | 🛒 | grocery.png | 6 |
| 8 | MINI_MARKET | 🏪 | minimarket.png | 6 |
| 9 | MEAT_BUTCHER | 🥩 | meat.png | 7 |
| 10 | FISH_SEAFOOD | 🐟 | fish.png | 5 |
| 11 | ALCOHOL | 🍷 | alcohol.png | 5 |
| 12 | GEORGIAN_TRADITIONAL | 🇬🇪 | georgian.png | 7 |

**Total Subcategories: 91**

---

## 🔍 Subcategory Details

### 1️⃣ RESTAURANT (10 subcategories)
```
✓ Georgian Cuisine
✓ European
✓ Italian
✓ Asian / Chinese
✓ Japanese / Sushi
✓ Indian
✓ Middle Eastern
✓ Turkish
✓ BBQ / Grill
✓ Seafood Restaurants
```

### 2️⃣ FAST FOOD (7 subcategories)
```
✓ Burgers
✓ Fries / Wings
✓ Shawarma / Doner
✓ Hotdogs
✓ Sandwiches
✓ Tacos / Wraps
✓ Fried Chicken
```

### 3️⃣ BAKERY (7 subcategories)
```
✓ Fresh Bread
✓ Pastries
✓ Croissants
✓ Cake slices
✓ Cookies
✓ Pretzels
✓ Puff Pastry (Penovani)
```

### 4️⃣ DESSERTS & SWEETS (6 subcategories)
```
✓ Cakes
✓ Cupcakes
✓ Cheesecakes
✓ Ice Cream / Gelato
✓ Donuts
✓ Chocolate / Confectionery
```

### 5️⃣ CAFE (5 subcategories)
```
✓ Coffee
✓ Tea
✓ Latte / Cappuccino
✓ Bakery Café
✓ Breakfast Café
```

### 6️⃣ DRINKS & JUICE BARS (5 subcategories)
```
✓ Fresh Juice
✓ Smoothies
✓ Bubble Tea
✓ Iced Drinks
✓ Lemonade & Soft Drinks
```

### 7️⃣ GROCERY STORES (6 subcategories)
```
✓ Fruits & Vegetables
✓ Bread & Pastries
✓ Dairy
✓ Snacks
✓ Frozen Food
✓ Everyday Essentials
```

### 8️⃣ MINI MARKETS (6 subcategories)
```
✓ SPAR
✓ Nikora
✓ Carrefour Market
✓ Fresco
✓ Local Mini Shops
✓ 24/7 Stores
```

### 9️⃣ MEAT & BUTCHERS (7 subcategories)
```
✓ Beef
✓ Pork
✓ Chicken
✓ Sausages
✓ Smoked Meat
✓ Kebab Meat
✓ Mix Packs / Discounts
```

### 🔟 FISH & SEAFOOD (5 subcategories)
```
✓ Fresh Fish
✓ Salmon
✓ Seafood Mix
✓ Sushi Ingredients
✓ Frozen Fish
```

### 1️⃣1️⃣ ALCOHOL SHOPS (5 subcategories)
```
✓ Wine
✓ Beer
✓ Spirits
✓ Cocktails
✓ Craft Beverages
```

### 1️⃣2️⃣ GEORGIAN TRADITIONAL (7 subcategories)
```
✓ Imeruli Khachapuri
✓ Megruli Khachapuri
✓ Adjaruli Khachapuri
✓ Khinkali
✓ Mtsvadi
✓ Ojakhuri
✓ Pkhali / Marinated food
```

---

## 🗂️ Database Schema

### categories table
```sql
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  main_category VARCHAR(50) NOT NULL,
  sub_category VARCHAR(100) NOT NULL,
  icon_name VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(main_category, sub_category)
);
```

### offers table (updated)
```sql
ALTER TABLE public.offers
ADD COLUMN sub_category VARCHAR(100);
```

### partners table (updated)
```sql
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
```

---

## 💻 TypeScript Usage

### Import Categories
```typescript
import { 
  MAIN_CATEGORIES,
  getAllCategories,
  getSubcategories,
  getCategoryIcon,
  getCategoryEmoji,
  getCategoryLabel,
  isValidMainCategory,
  isValidSubcategory,
} from '@/lib/categories';
```

### Get All Categories
```typescript
const categories = getAllCategories();
// Returns array of CategoryConfig objects
```

### Get Subcategories
```typescript
const restaurantSubs = getSubcategories('RESTAURANT');
// Returns: ['Georgian Cuisine', 'European', 'Italian', ...]
```

### Get Icon Name
```typescript
const icon = getCategoryIcon('BAKERY');
// Returns: 'bakery'
```

### Validate Category
```typescript
if (isValidMainCategory('RESTAURANT')) {
  // Valid category
}

if (isValidSubcategory('BAKERY', 'Fresh Bread')) {
  // Valid subcategory for this main category
}
```

---

## 🎨 UI Display

### Category Dropdown
```tsx
import { getAllCategories } from '@/lib/categories';

function CategorySelect() {
  const categories = getAllCategories();
  
  return (
    <select>
      {categories.map(cat => (
        <option key={cat.value} value={cat.value}>
          {cat.emoji} {cat.label}
        </option>
      ))}
    </select>
  );
}
```

### Subcategory Dropdown
```tsx
import { getSubcategories } from '@/lib/categories';

function SubcategorySelect({ mainCategory }) {
  const subcategories = getSubcategories(mainCategory);
  
  return (
    <select>
      {subcategories.map(sub => (
        <option key={sub} value={sub}>
          {sub}
        </option>
      ))}
    </select>
  );
}
```

---

## 🗺️ Map Marker Icons

### Required Icon Files
Place in `/public/images/pins/`:

**Existing:**
- ✅ restaurant.png
- ✅ fast-food.png
- ✅ bakery.png
- ✅ cafe.png
- ✅ grocery.png
- ✅ alcohol.png

**New (Need Creation):**
- ⚠️ dessert.png
- ⚠️ juice.png
- ⚠️ minimarket.png
- ⚠️ meat.png
- ⚠️ fish.png
- ⚠️ georgian.png

### Icon Mapping
```typescript
const imageMap: Record<string, string> = {
  RESTAURANT: 'restaurant.png',
  FAST_FOOD: 'fast-food.png',
  BAKERY: 'bakery.png',
  DESSERTS_SWEETS: 'dessert.png',
  CAFE: 'cafe.png',
  DRINKS_JUICE: 'juice.png',
  GROCERY: 'grocery.png',
  MINI_MARKET: 'minimarket.png',
  MEAT_BUTCHER: 'meat.png',
  FISH_SEAFOOD: 'fish.png',
  ALCOHOL: 'alcohol.png',
  GEORGIAN_TRADITIONAL: 'georgian.png',
};
```

---

## 🌐 Translations

### English
```typescript
'category.RESTAURANT': 'Restaurant',
'category.FAST_FOOD': 'Fast Food',
'category.BAKERY': 'Bakery',
'category.DESSERTS_SWEETS': 'Desserts & Sweets',
'category.CAFE': 'Café',
'category.DRINKS_JUICE': 'Drinks & Juice',
'category.GROCERY': 'Grocery',
'category.MINI_MARKET': 'Mini Market',
'category.MEAT_BUTCHER': 'Meat & Butcher',
'category.FISH_SEAFOOD': 'Fish & Seafood',
'category.ALCOHOL': 'Alcohol',
'category.GEORGIAN_TRADITIONAL': 'Georgian Traditional',
```

### Georgian (ქართული)
```typescript
'category.RESTAURANT': 'რესტორანი',
'category.FAST_FOOD': 'ფასტ ფუდი',
'category.BAKERY': 'ფუნთუშეული',
'category.DESSERTS_SWEETS': 'დესერტები და საკონდიტრო',
'category.CAFE': 'კაფე',
'category.DRINKS_JUICE': 'სასმელები და წვენები',
'category.GROCERY': 'სურსათის მაღაზია',
'category.MINI_MARKET': 'მინი მარკეტი',
'category.MEAT_BUTCHER': 'ხორცი და ჩარქი',
'category.FISH_SEAFOOD': 'თევზი და ზღვის პროდუქტები',
'category.ALCOHOL': 'ალკოჰოლი',
'category.GEORGIAN_TRADITIONAL': 'ქართული ტრადიციული',
```

---

## 📋 Testing Checklist

### Database
- [ ] Categories table created with all 91 subcategories
- [ ] Offers table has sub_category column
- [ ] Partners table constraint updated
- [ ] Existing offers migrated successfully
- [ ] Indexes created

### Frontend
- [ ] Category filters show all 12 categories
- [ ] Map displays correct icons for each category
- [ ] Category tabs scroll horizontally on mobile
- [ ] i18n translations work in both languages
- [ ] No console errors

### API
- [ ] Image library accepts new categories
- [ ] Offer creation validates categories
- [ ] Category filtering works in browse view

### End-to-End
- [ ] Partner can select business type from 12 options
- [ ] Offers are categorized correctly
- [ ] Map markers display correct icons
- [ ] Category filters work on map and browse views
- [ ] Admin dashboard shows all categories

---

## 🔗 Related Files

### Core Category System
- `src/lib/categories.ts` - Main category configuration
- `src/lib/types.ts` - TypeScript type definitions
- `src/lib/constants.ts` - Business type constants
- `supabase/migrations/20251124_replace_with_12_category_system.sql` - Database migration

### UI Components
- `src/components/CategoryBar.tsx` - Desktop category bar
- `src/components/home/CategoryTabs.tsx` - Mobile category tabs
- `src/components/home/RestaurantFoodSection.tsx` - Browse view filters
- `src/components/OfferMap.tsx` - Map marker icons

### API & Backend
- `api/library.ts` - Image library validation
- `src/lib/i18n.tsx` - Translations

### Documentation
- `CATEGORY_SYSTEM_IMPLEMENTATION.md` - Full implementation guide
- `CATEGORY_QUICK_REFERENCE.md` - This file

---

**Last Updated:** November 24, 2025  
**Version:** 2.0 (12-Category System)
