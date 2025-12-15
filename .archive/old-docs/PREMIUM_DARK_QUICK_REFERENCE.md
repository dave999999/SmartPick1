# SmartPick Premium Dark Design - Quick Reference

## Color Utilities

Use these Tailwind classes throughout the app:

### Backgrounds
```tsx
bg-sp-bg                  // Deep dark app background #05070C
bg-sp-surface1            // Large panels #0B0F16
bg-sp-surface2            // Cards, nested panels #141923
bg-sp-surface-glass       // Glass overlay rgba(12,16,24,0.75)
```

### Borders
```tsx
border-sp-border-soft     // Subtle borders rgba(255,255,255,0.06)
border-sp-border-strong   // Stronger borders rgba(255,255,255,0.14)
```

### Text
```tsx
text-sp-text-primary      // White #FFFFFF
text-sp-text-secondary    // Light gray #9FA8C3
text-sp-text-muted        // Muted gray #6D7488
```

### Accents
```tsx
text-sp-accent-orange     // Orange #FF8A30
bg-sp-accent-orange-soft  // Soft orange rgba(255,138,48,0.35)
text-sp-accent-mint       // Mint #38EBC1
bg-sp-accent-mint-soft    // Soft mint rgba(56,235,193,0.35)
```

### Status
```tsx
text-sp-danger            // Red #FF4D6A
text-sp-success           // Green #3BE77A
```

## Component Usage

### 1. Search Bar
```tsx
import { TopSearchBarRedesigned } from '@/components/home/TopSearchBarRedesigned';

<TopSearchBarRedesigned 
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  onFilterClick={() => setShowFilters(true)} 
/>
```

### 2. Category Bar
```tsx
import { CategoryBar } from '@/components/home/CategoryBar';

<CategoryBar
  selectedCategory={selectedCategory}
  onCategorySelect={setSelectedCategory}
/>
```

### 3. Offer Card
```tsx
import { OfferCard } from '@/components/home/OfferCard';

<OfferCard 
  offer={offer} 
  onClick={handleOfferClick} 
  variant="grid" // or "scroll"
/>
```

### 4. Restaurant/Food Section (Bottom Sheet Content)
```tsx
import { RestaurantFoodSectionNew } from '@/components/home/RestaurantFoodSectionNew';

<RestaurantFoodSectionNew
  offers={filteredOffers}
  onOfferClick={handleOfferClick}
/>
```

### 5. Map Section
```tsx
import { MapSectionNew } from '@/components/home/MapSectionNew';

<MapSectionNew
  offers={filteredOffers}
  onOfferClick={handleOfferClick}
  onMarkerClick={handleMarkerClick}
  selectedCategory={selectedCategory}
  onCategorySelect={setSelectedCategory}
  onLocationChange={setUserLocation}
/>
```

### 6. Bottom Navigation
```tsx
import { BottomNavBarNew } from '@/components/home/BottomNavBarNew';

<BottomNavBarNew />
```

## Common Patterns

### Glass Card
```tsx
<div className="
  bg-sp-surface-glass backdrop-blur-xl
  rounded-2xl
  border border-sp-border-soft
  shadow-[0_18px_40px_rgba(0,0,0,0.55)]
  p-4
">
  {/* content */}
</div>
```

### Glow Button
```tsx
<button className="
  bg-gradient-to-r from-sp-accent-orange to-orange-600
  hover:shadow-[0_0_24px_rgba(255,138,48,0.4)]
  text-white font-semibold
  px-6 py-3 rounded-full
  transition-all duration-300
  active:scale-95
">
  Click Me
</button>
```

### Category Pill
```tsx
<button className="
  w-[56px] h-[56px] rounded-full
  bg-sp-surface-glass backdrop-blur-md
  border border-sp-border-soft
  hover:bg-white/5 hover:scale-105
  transition-all duration-200
  flex items-center justify-center
">
  <img src="/icons/categories/RESTAURANT.png" className="w-8 h-8" />
</button>
```

### Active State with Glow
```tsx
<div className="
  relative
  bg-gradient-to-br from-sp-surface2 to-sp-surface1
  border border-sp-accent-orange-soft
  shadow-[0_0_18px_rgba(255,138,48,0.3)]
  scale-105
">
  <div className="absolute inset-0 rounded-full ring-2 ring-sp-accent-orange opacity-60 animate-pulse" />
  {/* content */}
</div>
```

## Shadows

```css
/* Card shadow */
shadow-[0_18px_40px_rgba(0,0,0,0.55)]

/* Deep shadow for bottom sheet */
shadow-[0_-18px_40px_rgba(0,0,0,0.85)]

/* Glow for orange elements */
shadow-[0_0_18px_rgba(255,138,48,0.3)]

/* Glow for mint elements */
shadow-[0_0_26px_rgba(56,235,193,0.55)]
```

## Animations

### Scale on Hover
```tsx
hover:scale-105 transition-all duration-200
```

### Active Press
```tsx
active:scale-95 transition-all duration-200
```

### Fade In
```tsx
animate-in fade-in-0 duration-300
```

### Slide In from Bottom
```tsx
animate-in slide-in-from-bottom-1 duration-300
```

### Pulse (for glows)
```tsx
animate-pulse
```

## Accessibility

### Touch Targets
Always ensure interactive elements are at least 44x44px:
```tsx
min-w-[44px] min-h-[44px]
```

### Reduced Motion
All animations automatically respect `prefers-reduced-motion` media query through global CSS.

### ARIA Labels
```tsx
<button aria-label="Open filters">
  <SlidersHorizontal />
</button>
```

## Safe Areas (Mobile)

### Bottom Safe Area
```tsx
style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
```

### Top Safe Area
```tsx
style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
```

## Z-Index Layers

```
z-[9999]  - Bottom Navigation (always on top)
z-50      - Search Bar
z-30      - Map Controls
z-20      - Bottom Sheet
z-10      - Map Base Layer
z-1       - Map Overlay Gradient
```

## Icon Requirements

Category icons should be placed in:
```
/public/icons/categories/
  RESTAURANT.png
  FAST_FOOD.png
  BAKERY.png
  DESSERTS_SWEETS.png
  DRINKS_JUICE.png
  GROCERY.png
  CAFE.png
  ... (32x32px or 64x64px PNG with transparency)
```

## Performance Tips

1. **Use backdrop-blur sparingly** - Already optimized in glass surfaces
2. **Lazy load images** - Use `loading="lazy"` attribute
3. **Optimize transforms** - Stick to scale/translate for GPU acceleration
4. **Batch animations** - Group state changes to minimize rerenders

## Dark Mode Only

This design system is dark-mode only. Do not add light mode support without redesigning the entire color palette for proper contrast.

---

**Need Help?** Check `PREMIUM_DARK_DESIGN_COMPLETE.md` for full implementation details.
