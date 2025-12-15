# 🎨 Explore Sheet - Visual Design Reference

## Component Hierarchy

```
ExploreSheet (Bottom Sheet)
├── Drag Handle (gray rounded bar)
├── Collapsed State (12vh)
│   └── "Explore Offers ⭐" header
├── Medium/Expanded State (50vh / 85vh)
│   ├── Sticky Header Section
│   │   ├── Title Row ("Discover" + Close button)
│   │   ├── Search Bar (pill with 🔍 + filter button)
│   │   ├── Smart Sorting Pills (horizontal scroll)
│   │   │   ├── ⭐ Recommended
│   │   │   ├── 📍 Nearest
│   │   │   ├── 💸 Cheapest
│   │   │   ├── ⏳ Expiring Soon
│   │   │   └── 🆕 Newly Added
│   │   └── Category Carousel (horizontal scroll)
│   │       ├── ⭐ All
│   │       ├── 🍽️ Restaurant
│   │       ├── 🍔 Fast Food
│   │       └── ... (12 categories)
│   └── Scrollable Content
│       ├── Offer Clusters (conditional)
│       │   ├── 🔥 Trending Right Now
│       │   ├── ⏰ Closing Soon
│       │   ├── 💸 Under 5 GEL
│       │   └── 🍞 Freshly Baked Today
│       └── All Offers Grid (2 columns)

FloatingStarButton (bottom-right)
├── Default: ⭐ Star icon with pulse
└── When Explore Open: Sort menu
    ├── ⭐ Recommended
    ├── 📍 Nearest
    ├── 💸 Cheapest
    ├── ⏳ Ending Soon
    └── 🆕 Newest
```

## Visual States

### State 1: Collapsed (12vh)
```
┌─────────────────────────────┐
│         ──────              │ ← Drag handle
│                             │
│  ⭐ Explore Offers (24) →   │ ← Tap to expand
│                             │
└─────────────────────────────┘
```

### State 2: Medium (50vh)
```
┌─────────────────────────────┐
│         ──────              │ ← Drag handle
├─────────────────────────────┤
│ Discover              ✕     │ ← Header
│                             │
│ 🔍 Search...      [⚙]      │ ← Search + Filter
│                             │
│ [⭐ Recommended] [📍] [💸]  │ ← Sort pills (scroll)
│                             │
│ [⭐] [🍽️] [🍔] [🥖] ...    │ ← Categories (scroll)
├─────────────────────────────┤
│ 🔥 Trending Right Now       │
│ ┌─────┐ ┌─────┐            │
│ │Card │ │Card │            │ ← Offer grid
│ └─────┘ └─────┘            │
│                             │
│ 📍 All Offers (24)          │
│ ┌─────┐ ┌─────┐            │
│ │Card │ │Card │            │ ← Scrollable
│ └─────┘ └─────┘            │
│   ...                       │
└─────────────────────────────┘
```

### State 3: Expanded (85vh)
```
┌─────────────────────────────┐
│         ──────              │
├─────────────────────────────┤
│ [Full header - pinned]      │
│                             │
├─────────────────────────────┤
│                             │
│ [More space for             │
│  scrolling offers]          │
│                             │
│ ┌─────┐ ┌─────┐            │
│ │Card │ │Card │            │
│ └─────┘ └─────┘            │
│ ┌─────┐ ┌─────┐            │
│ │Card │ │Card │            │
│ └─────┘ └─────┘            │
│   ...                       │
│                             │
└─────────────────────────────┘
```

## Offer Card Anatomy

```
┌──────────────────────────┐
│ ┌────────────────────┐   │
│ │   [Offer Image]    │   │ ← aspect-[4/3]
│ │                    │   │
│ │ [1.2km] 📍  ⏰[5m] │   │ ← Distance + Time badges
│ │                    │   │
│ │         [Save 40%] │   │ ← Savings badge (bottom-left)
│ └────────────────────┘   │
│                          │
│ Fresh Bread Loaf         │ ← Title (bold, 2 lines)
│ Baker's Paradise  ⭐4.5  │ ← Business + Rating
│                          │
│ ₾3.50  ₾5.00  •  12 left │ ← Price + Quantity
│                          │
│ 💚 Partner rated highly  │ ← Trust message
└──────────────────────────┘
```

## Color Palette

### Primary Orange (Cosmic Orange)
```css
bg-gradient-to-r from-orange-500 to-orange-600
shadow-orange-500/30
```

### Active Sort Pill
```css
bg-gradient-to-r from-orange-500 to-orange-600
text-white
shadow-md shadow-orange-500/30
```

### Inactive Sort Pill
```css
bg-gray-100
text-gray-700
hover:bg-gray-200
```

### Category Active
```css
bg-gradient-to-br from-orange-500 to-orange-600
text-white
shadow-lg shadow-orange-500/30
scale-105
```

### Category Inactive
```css
bg-gray-100
text-gray-600
opacity-60
```

### Badges
```css
/* Distance */
bg-white/95 backdrop-blur-sm
text-gray-900

/* Time (expiring) */
bg-red-500/95
text-white

/* Time (normal) */
bg-white/95
text-gray-900

/* Savings */
bg-gradient-to-r from-orange-500 to-orange-600
text-white

/* Rating */
bg-green-50
text-green-700
```

## Typography Scale

```css
/* Sheet Title */
text-xl font-bold text-gray-900

/* Cluster Headers */
text-lg font-bold text-gray-900

/* Sort Pills */
text-sm font-medium

/* Category Labels */
text-xs font-medium text-gray-700

/* Card Title */
text-sm font-bold text-gray-900

/* Card Meta */
text-xs text-gray-600

/* Badges */
text-xs font-bold

/* Partner Message */
text-[10px] text-green-600 font-medium

/* Price (Main) */
text-lg font-bold text-orange-600

/* Price (Original) */
text-xs text-gray-400 line-through
```

## Spacing System

```css
/* Sheet padding */
px-4 py-4

/* Header sections */
space-y-3

/* Cluster spacing */
space-y-6

/* Card grid gap */
gap-3 (grid-cols-2)

/* Pill row gap */
gap-2

/* Category row gap */
gap-3

/* Card internal padding */
p-3

/* Badge padding */
px-2.5 py-1
```

## Border Radius

```css
/* Sheet top corners */
rounded-t-3xl

/* Pill buttons */
rounded-full

/* Category buttons */
rounded-2xl

/* Offer cards */
rounded-2xl

/* Badges */
rounded-full

/* Sort menu */
rounded-2xl
```

## Shadows

```css
/* Sheet */
shadow-2xl

/* Cards */
shadow-md

/* Badges */
shadow-md

/* Active pill */
shadow-md shadow-orange-500/30

/* Sort menu */
shadow-2xl

/* Star button */
shadow-lg (orange: rgba(249, 115, 22, 0.4))
```

## Animations

### Sheet Drag
```tsx
transition: { type: 'spring', damping: 30, stiffness: 300 }
```

### Card Hover
```tsx
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }}
```

### Star Button Pulse
```tsx
animate={{
  scale: [1, 1.3, 1],
  opacity: [0.5, 0, 0.5],
}}
transition={{
  duration: 2,
  repeat: Infinity,
  ease: 'easeInOut',
}}
```

### Icon Rotation (Star Menu)
```tsx
initial={{ rotate: -90, opacity: 0 }}
animate={{ rotate: 0, opacity: 1 }}
exit={{ rotate: 90, opacity: 0 }}
transition={{ duration: 0.2 }}
```

## Responsive Breakpoints

All components are mobile-first. No desktop breakpoints needed as this is a mobile-focused discovery interface.

## Accessibility

### Touch Targets
- Minimum 44x44px for all interactive elements
- Sort pills: h-11 (44px)
- Category buttons: 56x56px (w-14 h-14)
- Star button: 56x56px (w-14 h-14)

### Semantic HTML
- `<button>` for all clickable elements
- `<input>` for search field
- Proper ARIA labels (future enhancement)

### Keyboard Navigation
- Tab through sort pills
- Tab through categories
- Enter/Space to activate

## Performance Optimizations

### Intersection Observer
```tsx
threshold: [0.4] // Trigger at 40% visibility
```

### useMemo Dependencies
```tsx
[offers, searchQuery, selectedCategory, selectedSort, userLocation]
```

### Lazy Images
Consider adding:
```tsx
loading="lazy"
```

### Debounce Search
Consider adding:
```tsx
useDebounce(searchQuery, 300)
```

## Z-Index Stack

```
50 - ExploreSheet
40 - FloatingStarButton, Backdrop
30 - (Reserved for modals)
20 - (Reserved for dropdowns)
10 - (Reserved for tooltips)
```

## Empty State

```
       🙈
       
No offers match your filters

Try clearing filters or 
browsing what's nearby!

[Clear Filters]
```

---

**Design System**: Based on Uber Eats, Apple Wallet, Google Maps Explore  
**Color Theme**: Cosmic Orange (#f97316 → #ea580c)  
**Animation Library**: Framer Motion  
**Typography**: System fonts (iOS: SF Pro, Android: Roboto)
