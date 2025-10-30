export type BusinessCategory = {
  readonly value: string;
  readonly label: string;
  readonly emoji: string;
  readonly description: string;
};

export const BUSINESS_CATEGORIES: readonly BusinessCategory[] = [
  {
    value: "bakery",
    label: "🥐 Bakeries",
    emoji: "🥐",
    description: "End-of-day bread, pastries, khachapuri, sweets",
  },
  {
    value: "grocery",
    label: "🛒 Groceries / Mini-markets",
    emoji: "🛒",
    description: "Soon-to-expire or overstock items",
  },
  {
    value: "restaurant",
    label: "🍛 Restaurants / Cafes",
    emoji: "🍛",
    description: "Daily menu leftovers, lunch boxes, side dishes",
  },
  {
    value: "coffee",
    label: "☕ Coffee shops",
    emoji: "☕",
    description: "Unsold sandwiches, desserts, drinks",
  },
  {
    value: "streetfood",
    label: "🏪 Street food / kiosks",
    emoji: "🏪",
    description: "End-of-shift bundles",
  },
] as const;

// For efficient lookups
const categoryMap = new Map<string, BusinessCategory>(
  BUSINESS_CATEGORIES.map((cat) => [cat.value, cat])
);

const DEFAULT_EMOJI = '🏢';
const DEFAULT_LABEL = '🏢 Business';

/**
 * Returns the emoji for a given business type.
 * @param businessType The value of the business type (e.g., "bakery").
 * @returns The corresponding emoji string, or a default emoji if not found.
 */
export const getBusinessEmoji = (businessType: string): string => {
  return categoryMap.get(businessType)?.emoji ?? DEFAULT_EMOJI;
};

/**
 * Returns the display label (with emoji) for a given business type.
 * @param businessType The value of the business type (e.g., "bakery").
 * @returns The corresponding label string, or a default label if not found.
 */
export const getBusinessLabel = (businessType: string): string => {
  return categoryMap.get(businessType)?.label ?? DEFAULT_LABEL;
};

/**
 * Returns an array of business categories formatted for use in Select components.
 * @returns An array of objects with `value` and `label` properties.
 */
export const getBusinessCategoryOptions = () => {
  return BUSINESS_CATEGORIES.map(({ value, label }) => ({
    value,
    label,
  }));
};