/**
 * SmartPick 12-Category System Configuration
 * Updated: 2025-11-24
 * 
 * This file defines the complete category structure with:
 * - 12 main categories
 * - Subcategories for each main category
 * - Icon mappings for map markers
 * - Emojis for UI display
 * - i18n keys for translations
 */

// ============================================================================
// MAIN CATEGORY TYPES
// ============================================================================

export const MAIN_CATEGORIES = [
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
  'GEORGIAN_TRADITIONAL',
] as const;

export type MainCategory = (typeof MAIN_CATEGORIES)[number];

// For backwards compatibility with existing code
export type BusinessType = MainCategory;

// ============================================================================
// SUBCATEGORY DEFINITIONS
// ============================================================================

export const SUBCATEGORIES: Record<MainCategory, readonly string[]> = {
  RESTAURANT: [
    'Georgian Cuisine',
    'European',
    'Italian',
    'Asian / Chinese',
    'Japanese / Sushi',
    'Indian',
    'Middle Eastern',
    'Turkish',
    'BBQ / Grill',
    'Seafood Restaurants',
  ],
  
  FAST_FOOD: [
    'Burgers',
    'Fries / Wings',
    'Shawarma / Doner',
    'Hotdogs',
    'Sandwiches',
    'Tacos / Wraps',
    'Fried Chicken',
  ],
  
  BAKERY: [
    'Fresh Bread',
    'Pastries',
    'Croissants',
    'Cake slices',
    'Cookies',
    'Pretzels',
    'Puff Pastry (Penovani)',
  ],
  
  DESSERTS_SWEETS: [
    'Cakes',
    'Cupcakes',
    'Cheesecakes',
    'Ice Cream / Gelato',
    'Donuts',
    'Chocolate / Confectionery',
  ],
  
  CAFE: [
    'Coffee',
    'Tea',
    'Latte / Cappuccino',
    'Bakery Café',
    'Breakfast Café',
  ],
  
  DRINKS_JUICE: [
    'Fresh Juice',
    'Smoothies',
    'Bubble Tea',
    'Iced Drinks',
    'Lemonade & Soft Drinks',
  ],
  
  GROCERY: [
    'Fruits & Vegetables',
    'Bread & Pastries',
    'Dairy',
    'Snacks',
    'Frozen Food',
    'Everyday Essentials',
  ],
  
  MINI_MARKET: [
    'SPAR',
    'Nikora',
    'Carrefour Market',
    'Fresco',
    'Local Mini Shops',
    '24/7 Stores',
  ],
  
  MEAT_BUTCHER: [
    'Beef',
    'Pork',
    'Chicken',
    'Sausages',
    'Smoked Meat',
    'Kebab Meat',
    'Mix Packs / Discounts',
  ],
  
  FISH_SEAFOOD: [
    'Fresh Fish',
    'Salmon',
    'Seafood Mix',
    'Sushi Ingredients',
    'Frozen Fish',
  ],
  
  ALCOHOL: [
    'Wine',
    'Beer',
    'Spirits',
    'Cocktails',
    'Craft Beverages',
  ],
  
  GEORGIAN_TRADITIONAL: [
    'Imeruli Khachapuri',
    'Megruli Khachapuri',
    'Adjaruli Khachapuri',
    'Khinkali',
    'Mtsvadi',
    'Ojakhuri',
    'Pkhali / Marinated food',
  ],
} as const;

// ============================================================================
// CATEGORY DISPLAY CONFIGURATION
// ============================================================================

export interface CategoryConfig {
  value: MainCategory;
  label: string;
  emoji: string;
  iconName: string; // For map markers
  labelKey: string; // For i18n
  description?: string;
}

export const CATEGORY_CONFIG: Record<MainCategory, CategoryConfig> = {
  RESTAURANT: {
    value: 'RESTAURANT',
    label: 'Restaurant',
    emoji: '🍽️',
    iconName: 'restaurant',
    labelKey: 'category.RESTAURANT',
    description: 'Fine dining and casual restaurants',
  },
  
  FAST_FOOD: {
    value: 'FAST_FOOD',
    label: 'Fast Food',
    emoji: '🍔',
    iconName: 'fast-food',
    labelKey: 'category.FAST_FOOD',
    description: 'Quick service food outlets',
  },
  
  BAKERY: {
    value: 'BAKERY',
    label: 'Bakery',
    emoji: '🥐',
    iconName: 'bakery',
    labelKey: 'category.BAKERY',
    description: 'Fresh bread and baked goods',
  },
  
  DESSERTS_SWEETS: {
    value: 'DESSERTS_SWEETS',
    label: 'Desserts & Sweets',
    emoji: '🍰',
    iconName: 'dessert',
    labelKey: 'category.DESSERTS_SWEETS',
    description: 'Cakes, ice cream, and sweet treats',
  },
  
  CAFE: {
    value: 'CAFE',
    label: 'Café',
    emoji: '☕',
    iconName: 'cafe',
    labelKey: 'category.CAFE',
    description: 'Coffee shops and cafés',
  },
  
  DRINKS_JUICE: {
    value: 'DRINKS_JUICE',
    label: 'Drinks & Juice',
    emoji: '🥤',
    iconName: 'juice',
    labelKey: 'category.DRINKS_JUICE',
    description: 'Fresh juices and beverages',
  },
  
  GROCERY: {
    value: 'GROCERY',
    label: 'Grocery',
    emoji: '🛒',
    iconName: 'grocery',
    labelKey: 'category.GROCERY',
    description: 'Supermarkets and grocery stores',
  },
  
  MINI_MARKET: {
    value: 'MINI_MARKET',
    label: 'Mini Market',
    emoji: '🏪',
    iconName: 'minimarket',
    labelKey: 'category.MINI_MARKET',
    description: 'Convenience stores and mini markets',
  },
  
  MEAT_BUTCHER: {
    value: 'MEAT_BUTCHER',
    label: 'Meat & Butcher',
    emoji: '🥩',
    iconName: 'meat',
    labelKey: 'category.MEAT_BUTCHER',
    description: 'Fresh meat and butcher shops',
  },
  
  FISH_SEAFOOD: {
    value: 'FISH_SEAFOOD',
    label: 'Fish & Seafood',
    emoji: '🐟',
    iconName: 'fish',
    labelKey: 'category.FISH_SEAFOOD',
    description: 'Fresh fish and seafood',
  },
  
  ALCOHOL: {
    value: 'ALCOHOL',
    label: 'Alcohol',
    emoji: '🍷',
    iconName: 'alcohol',
    labelKey: 'category.ALCOHOL',
    description: 'Wine, beer, and spirits',
  },
  
  GEORGIAN_TRADITIONAL: {
    value: 'GEORGIAN_TRADITIONAL',
    label: 'Georgian Traditional',
    emoji: '🇬🇪',
    iconName: 'georgian',
    labelKey: 'category.GEORGIAN_TRADITIONAL',
    description: 'Traditional Georgian cuisine',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all subcategories for a main category
 */
export function getSubcategories(mainCategory: MainCategory): readonly string[] {
  return SUBCATEGORIES[mainCategory] || [];
}

/**
 * Get category configuration
 */
export function getCategoryConfig(mainCategory: MainCategory): CategoryConfig {
  return CATEGORY_CONFIG[mainCategory];
}

/**
 * Get icon name for map markers (main category only)
 */
export function getCategoryIcon(mainCategory: MainCategory): string {
  return CATEGORY_CONFIG[mainCategory]?.iconName || 'restaurant';
}

/**
 * Get emoji for a main category
 */
export function getCategoryEmoji(mainCategory: MainCategory): string {
  return CATEGORY_CONFIG[mainCategory]?.emoji || '🍽️';
}

/**
 * Get display label for a main category
 */
export function getCategoryLabel(mainCategory: MainCategory): string {
  return CATEGORY_CONFIG[mainCategory]?.label || mainCategory;
}

/**
 * Check if a category is valid
 */
export function isValidMainCategory(category: string): category is MainCategory {
  return MAIN_CATEGORIES.includes(category as MainCategory);
}

/**
 * Check if a subcategory is valid for a main category
 */
export function isValidSubcategory(mainCategory: MainCategory, subcategory: string): boolean {
  return SUBCATEGORIES[mainCategory]?.includes(subcategory) || false;
}

/**
 * Get all categories as an array (for dropdowns, filters, etc.)
 */
export function getAllCategories(): CategoryConfig[] {
  return MAIN_CATEGORIES.map(cat => CATEGORY_CONFIG[cat]);
}

/**
 * Map old category names to new main categories (for backwards compatibility)
 */
export function mapLegacyCategory(oldCategory: string): MainCategory {
  const normalized = oldCategory.toUpperCase();
  
  // Direct matches
  if (isValidMainCategory(normalized)) {
    return normalized as MainCategory;
  }
  
  // Legacy mappings
  const legacyMap: Record<string, MainCategory> = {
    'FAST FOOD': 'FAST_FOOD',
    'FASTFOOD': 'FAST_FOOD',
    'DESSERTS': 'DESSERTS_SWEETS',
    'SWEETS': 'DESSERTS_SWEETS',
    'DRINKS': 'DRINKS_JUICE',
    'JUICE': 'DRINKS_JUICE',
    'MINIMARKET': 'MINI_MARKET',
    'MINI MARKET': 'MINI_MARKET',
    'MEAT': 'MEAT_BUTCHER',
    'BUTCHER': 'MEAT_BUTCHER',
    'FISH': 'FISH_SEAFOOD',
    'SEAFOOD': 'FISH_SEAFOOD',
    'GEORGIAN': 'GEORGIAN_TRADITIONAL',
    'TRADITIONAL': 'GEORGIAN_TRADITIONAL',
  };
  
  return legacyMap[normalized] || 'RESTAURANT';
}
