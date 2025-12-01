# 🌟 Premium Explore Sheet - Complete Implementation Guide

## Overview

The new **ExploreSheet** is a powerful, all-in-one discovery engine that replaces the old `OfferBottomSheet`. It features:

- **Sticky search bar** with filter button
- **Smart sorting pills** (Recommended, Nearest, Cheapest, Expiring Soon, Newly Added)
- **Category carousel** with icons and auto-scroll
- **Offer clusters** (Trending, Closing Soon, Under 5 GEL, Freshly Baked)
- **Map synchronization** (highlights pins, centers on scroll)
- **3 drag states**: collapsed (12%), medium (50%), expanded (85%)
- **Premium animations** with cosmic orange theme

## Files Created

### 1. `src/components/explore/ExploreSheet.tsx`
Main bottom sheet component with all discovery features.

### 2. `src/components/explore/OfferCard.tsx`
Premium compact offer card with:
- Distance badge
- Countdown timer
- Savings percentage
- Partner rating indicator
- Intersection observer for map sync

### 3. `src/components/explore/FloatingStarButton.tsx`
Smart star button that:
- Opens explore sheet when closed
- Becomes a sort menu when explore is open
- Animated transitions

## Integration Steps

### Step 1: Update IndexRedesigned.tsx

Replace the old `OfferBottomSheet` with the new `ExploreSheet`:

```tsx
// OLD IMPORTS (remove these)
import { OfferBottomSheet } from '@/components/OfferBottomSheet';

// NEW IMPORTS (add these)
import { ExploreSheet } from '@/components/explore/ExploreSheet';
import { FloatingStarButton } from '@/components/explore/FloatingStarButton';
```

### Step 2: Add State Variables

```tsx
const [exploreSheetOpen, setExploreSheetOpen] = useState(false);
const [highlightedOfferId, setHighlightedOfferId] = useState<string | null>(null);
```

### Step 3: Replace Bottom Sheet JSX

Find the old `<OfferBottomSheet>` component and replace with:

```tsx
{/* NEW: Explore Sheet */}
<ExploreSheet
  offers={filteredOffers}
  user={user}
  userLocation={userLocation}
  open={exploreSheetOpen}
  onClose={() => setExploreSheetOpen(false)}
  onOfferClick={(offer, index) => {
    setSelectedOffer(offer);
    setSelectedOfferIndex(index);
    setShowBottomSheet(true);
  }}
  onCategorySelect={setSelectedCategory}
  selectedCategory={selectedCategory}
  onMapHighlight={setHighlightedOfferId}
  onMapCenter={(location) => {
    // Center Google Map on location
    if (googleMap) {
      googleMap.panTo(location);
      googleMap.setZoom(15);
    }
  }}
/>

{/* NEW: Floating Star Button */}
<FloatingStarButton
  exploreOpen={exploreSheetOpen}
  onOpenExplore={() => setExploreSheetOpen(true)}
  onSortChange={(sort) => {
    // Sort is handled inside ExploreSheet
    console.log('Sort changed:', sort);
  }}
/>
```

### Step 4: Map Marker Highlighting

Update your map component to highlight pins based on `highlightedOfferId`:

```tsx
<SmartPickGoogleMap
  // ... existing props
  highlightedOfferId={highlightedOfferId}
/>
```

In your map component, add this effect:

```tsx
useEffect(() => {
  if (highlightedOfferId && markers[highlightedOfferId]) {
    // Highlight the marker (e.g., change color, scale, etc.)
    markers[highlightedOfferId].setAnimation(google.maps.Animation.BOUNCE);
    
    setTimeout(() => {
      markers[highlightedOfferId].setAnimation(null);
    }, 2000);
  }
}, [highlightedOfferId, markers]);
```

## Features Breakdown

### 1. Collapsed State (12vh)
- Shows "Explore Offers ⭐" with count
- Tap to expand to medium state

### 2. Medium State (50vh)
- Full search and filter UI
- Sorting pills
- Category carousel
- Scrollable offer grid
- Drag down to collapse, up to expand

### 3. Expanded State (85vh)
- Maximum height for browsing
- All content visible
- Semi-transparent backdrop

### 4. Smart Sorting Pills

```tsx
⭐ Recommended  // Default server order
📍 Nearest      // Sort by distance from user
💸 Cheapest     // Sort by original_price
⏳ Expiring Soon // Sort by pickup_end time
🆕 Newly Added  // Sort by created_at
```

Active pill glows with cosmic orange gradient.

### 5. Category Carousel

- 12 main categories with icons
- "All" category (⭐) shown first
- Auto-scrolls to selected category
- Active category has orange gradient background

### 6. Offer Clusters

**Trending Right Now** 🔥
- First 6 offers from current sort

**Closing Soon** ⏰
- Offers expiring within 2 hours

**Under 5 GEL** 💸
- Offers with original_price ≤ 5

**Freshly Baked Today** 🍞
- Bakery offers created today

Each cluster shows max 6 offers in 2-column grid.

### 7. Map Synchronization

**Card Scroll → Map Update:**
```tsx
onInView={() => {
  onMapHighlight?.(offer.id);
  onMapCenter?.({
    lat: offer.business.location.latitude,
    lng: offer.business.location.longitude,
  });
}}
```

Uses Intersection Observer with 40% threshold.

### 8. Empty State

When no offers match filters:
```
🙈
No offers match your filters
Try clearing filters or browsing what's nearby!

[Clear Filters] button
```

### 9. Offer Card Features

- **Distance Badge**: Top-left, white pill with orange map pin
- **Time Badge**: Top-right, red if expiring soon
- **Savings Badge**: Bottom-left, orange gradient
- **Partner Rating**: Green star with "4.5" rating
- **Price Display**: Large orange text for discounted price
- **Quantity**: "X left" in gray
- **Partner Message**: "💚 Partner rated highly"

## Visual Design

### Colors
- Primary: `from-orange-500 to-orange-600`
- Active Pill: Orange gradient with shadow
- Badges: White/95 with backdrop blur
- Expiring: Red 500
- Success: Green 600

### Typography
- Headers: `text-lg font-bold text-gray-900`
- Card Title: `text-sm font-bold line-clamp-2`
- Badges: `text-xs font-bold`
- Meta: `text-xs text-gray-600`

### Animations
- Sheet transitions: Spring (damping: 30, stiffness: 300)
- Card hover: Scale 1.02
- Card tap: Scale 0.98
- Pill active: Glow shadow
- Star button: Pulse ring animation

### Spacing
- Sheet padding: `px-4 py-4`
- Cluster gap: `space-y-6`
- Card grid: `grid-cols-2 gap-3`
- Pill gap: `gap-2`
- Category gap: `gap-3`

## Testing Checklist

- [ ] Open explore sheet → Shows collapsed state
- [ ] Drag up → Expands to medium
- [ ] Drag up again → Expands to full
- [ ] Drag down → Collapses step by step
- [ ] Search bar → Filters offers in real-time
- [ ] Sort pills → Change offer order
- [ ] Category tap → Filters by category
- [ ] Scroll cards → Map centers on offer location
- [ ] Scroll cards → Map pin highlights
- [ ] Star button → Opens explore when closed
- [ ] Star button → Shows sort menu when explore open
- [ ] Empty state → Shows when no matches
- [ ] Clear filters → Resets all filters
- [ ] Clusters appear → Trending, Closing Soon, etc.
- [ ] Card tap → Opens offer detail modal

## Performance Notes

- **Intersection Observer**: Used for map sync (40% threshold)
- **useMemo**: Filters and clusters recalculated only when dependencies change
- **Lazy Images**: Consider adding lazy loading for offer images
- **Debounce Search**: Consider debouncing search input for large datasets

## Customization

### Change Heights
```tsx
const HEIGHTS = {
  collapsed: '12vh',  // Change to 15vh for larger peek
  medium: '50vh',     // Change to 60vh for more content
  expanded: '85vh',   // Change to 90vh for maximum height
};
```

### Change Cluster Logic
```tsx
// In offerClusters useMemo
const trending = filteredOffers
  .filter(offer => offer.reservation_count > 10) // Add custom logic
  .slice(0, 6);
```

### Add More Sort Options
```tsx
const SORT_OPTIONS = [
  // ... existing
  { id: 'popular', label: 'Most Popular', emoji: '🔥', icon: TrendingUp },
];
```

### Customize Card Design
Edit `src/components/explore/OfferCard.tsx`:
- Change aspect ratio: `aspect-[4/3]` → `aspect-square`
- Hide badges: Remove badge JSX
- Change colors: Update Tailwind classes

## Mobile Optimization

- **Touch-friendly**: All tap targets ≥ 44px
- **Smooth scrolling**: Horizontal categories use `scrollbar-hide`
- **Safe areas**: Bottom padding added for iPhone notches
- **Drag gestures**: Sheet responds to swipe up/down
- **Responsive text**: Pills use `whitespace-nowrap`

## Next Steps

1. **Analytics**: Track which sort/category is most used
2. **Favorites**: Add heart icon to save offers
3. **Share**: Add share button to cards
4. **Notifications**: Add bell icon for new offers alerts
5. **History**: Show "Recently Viewed" cluster
6. **Personalization**: Use ML to improve "Recommended" sort

---

**Status**: ✅ READY FOR INTEGRATION  
**Components**: 3 new files  
**Breaking Changes**: None (can coexist with old OfferBottomSheet)  
**Migration**: Replace imports and JSX in IndexRedesigned.tsx
