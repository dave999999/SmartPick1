# 🎯 Unified Discover Sheet — Quick Reference

**One-page cheat sheet for developers**

---

## 📦 Component Props

```tsx
<UnifiedDiscoverSheet
  // Data
  offers={Offer[]}
  user={User | null}
  userLocation={[lat, lng] | null}
  
  // Core
  open={boolean}
  onClose={() => void}
  
  // Mode Control
  mode={'discover' | 'partner'}
  partnerId={string | null}
  onModeChange={(mode) => void}
  onHeightChange={(height) => void}
  
  // Discovery
  selectedCategory={string}
  selectedSort={SortOption}
  onCategorySelect={(cat) => void}
  onSortChange={(sort) => void}
  
  // Callbacks
  onOfferClick={(offer, idx) => void}
  onMapHighlight={(offerId) => void}
  onMapCenter={(location) => void}
/>
```

---

## 🎨 Visual Hierarchy

```
UnifiedDiscoverSheet (z-50)
├── Backdrop (z-40, opacity 0-0.4)
├── Drag Handle (12px x 1.5px, gray-300)
├── Header (48px h, border-bottom)
│   ├── Back Button (partner mode only)
│   ├── Title ("Discover" | "Partner Offers")
│   └── Close Button (X)
├── Content (flex-1, overflow-hidden)
│   ├── DISCOVER MODE
│   │   ├── Search Bar (40px h, rounded-full)
│   │   ├── Sort Pills (horizontal scroll)
│   │   ├── Category Chips (48px circles)
│   │   └── Offer Sections (2-col grid)
│   └── PARTNER MODE
│       ├── Partner Header
│       ├── Info Row (rating, distance, time)
│       ├── Carousel (swipeable)
│       ├── Pagination Dots
│       └── "See all" Button
└── Safe Area Spacer (24px)
```

---

## 🎭 State Machine

```
States: collapsed | mid | full
Modes:  discover | partner

User Actions:
[Star Button] → open=true, mode=discover, height=collapsed
[Map Pin]     → open=true, mode=partner, height=mid
[Swipe Up]    → height++
[Swipe Down]  → height-- (or close)
[Back Button] → mode=discover
[Close X]     → open=false
```

---

## 🎨 Color Palette

```css
/* Primary */
--orange-gradient: linear-gradient(to right, #FF8A00, #FF6B00);
--orange-500: #FF8A00;
--orange-600: #FF6B00;

/* Backgrounds */
--bg-white: #FFFFFF;
--bg-gray-50: #F9FAFB;
--bg-gray-100: #F3F4F6;

/* Text */
--text-gray-900: #111827;
--text-gray-600: #6B7280;
--text-gray-400: #9CA3AF;

/* Borders */
--border-gray-100: #F3F4F6;
--border-gray-200: #E5E7EB;
```

---

## 📐 Spacing Scale (8px grid)

```
xs:  4px  | gap-1
sm:  8px  | gap-2
md:  16px | gap-4
lg:  24px | gap-6
xl:  32px | gap-8
2xl: 48px | gap-12
```

---

## 🎬 Animation Config

```tsx
// Sheet Height Transition
transition: {
  type: 'spring',
  damping: 30,
  stiffness: 300,
  mass: 0.8,
}

// Backdrop Fade
transition: {
  duration: 0.3,
  ease: 'easeOut',
}

// Card Hover
transition: {
  duration: 0.2,
  ease: 'easeOut',
}

// Carousel Swipe
transition: {
  type: 'spring',
  damping: 30,
  stiffness: 300,
}
```

---

## 🔍 Sort Options

```tsx
type SortOption = 
  | 'recommended'  // ⭐ Default
  | 'nearest'      // 📍 Distance ASC
  | 'cheapest'     // 💸 Price ASC
  | 'expiring'     // ⏳ End time ASC
  | 'newest';      // 🆕 Created DESC
```

---

## 🏷️ Category List

```tsx
const CATEGORIES = [
  'RESTAURANT',   // 🍕
  'FAST_FOOD',    // 🍔
  'BAKERY',       // 🥐
  'DESSERT',      // 🍰
  'CAFE',         // ☕
  'DRINKS',       // 🥤
  'GROCERY',      // 🛒
  'MINIMARKET',   // 🏪
  'PHARMACY',     // 💊
];
```

---

## 📏 Offer Card Specs

### Compact Card (Discover Mode)

```
Size:       ~160px x 200px
Aspect:     4:3 (image)
Columns:    2
Gap:        8px
Title:      12px bold, 2-line clamp
Partner:    10px gray, 1-line clamp
Price:      14px orange (current) + 10px gray (original)
Badges:     Time (tr), Discount (bl), Distance (tl)
```

### Large Card (Partner Mode)

```
Size:       90vw x auto
Aspect:     16:9 (image)
Columns:    1
Gap:        —
Title:      16px bold
Description: 14px gray, 2-line clamp
Price:      24px orange (current) + 14px gray (original)
Button:     48px h, full-width, orange gradient
```

---

## 🧩 Offer Sections (Discover Mode)

```tsx
const SECTIONS = [
  { id: 'trending', title: 'Trending Right Now', emoji: '🔥' },
  { id: 'closing', title: 'Closing Soon', emoji: '⏰' },
  { id: 'cheap', title: 'Under 5 GEL', emoji: '💸' },
  { id: 'fresh', title: 'Freshly Baked Today', emoji: '🥐' },
  { id: 'all', title: 'All Offers', emoji: '📍' },
];
```

**Logic:**
- Trending: Top 6 offers
- Closing Soon: Expires in < 2 hours
- Under 5 GEL: `price <= 5`
- Freshly Baked: BAKERY category + created today
- All: Complete filtered list

---

## 🎯 Map Integration

### Highlight Pin on Scroll

```tsx
useEffect(() => {
  if (highlightedOfferId && markers[highlightedOfferId]) {
    const marker = markers[highlightedOfferId];
    
    // Bounce animation
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 700);
    
    // Scale up
    const icon = marker.getIcon();
    marker.setIcon({ ...icon, scale: 1.3 });
    setTimeout(() => marker.setIcon(icon), 2000);
  }
}, [highlightedOfferId, markers]);
```

### Center Map on Offer

```tsx
onMapCenter={(location) => {
  if (googleMap) {
    googleMap.panTo(location);
    googleMap.setZoom(15);
  }
}}
```

---

## 🚀 Usage Examples

**Note:** Add these to your `IndexRedesigned.tsx` component.

### Open in Discover Mode

```tsx
<FloatingStarButton
  onOpenExplore={() => {
    setDiscoverSheetOpen(true);
    setSheetMode('discover');
    setSelectedPartnerId(null);
  }}
/>
```

### Open in Partner Mode

```tsx
const handleMarkerClick = (offer: Offer) => {
  setSelectedPartnerId(offer.partner_id);
  setSheetMode('partner');
  setDiscoverSheetOpen(true);
};
```

### Switch Modes

```tsx
// Partner → Discover
setSheetMode('discover');
setSelectedPartnerId(null);

// Discover → Partner
setSheetMode('partner');
setSelectedPartnerId(partnerId);
```

---

## 📱 Responsive Breakpoints

```
iPhone SE:    375px x 667px  (collapsed: 100px, mid: 334px, full: 567px)
iPhone 14:    393px x 852px  (collapsed: 128px, mid: 426px, full: 724px)
iPhone 14 Pro Max: 430px x 932px (collapsed: 140px, mid: 466px, full: 792px)
```

**Heights (vh):**
- Collapsed: 15vh (~100-140px)
- Mid:       50vh (~334-466px)
- Full:      85vh (~567-792px)

---

## 🔧 Common Patterns

### Debounced Search

```tsx
const [searchQuery, setSearchQuery] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

### Filter Offers

```tsx
const filteredOffers = useMemo(() => {
  return offers.filter(offer => {
    // Search
    if (search && !offer.title.toLowerCase().includes(search)) {
      return false;
    }
    
    // Category
    if (category && offer.partner?.business_type !== category) {
      return false;
    }
    
    return true;
  });
}, [offers, search, category]);
```

### Sort Offers

```tsx
const sortedOffers = useMemo(() => {
  const sorted = [...filteredOffers];
  
  switch (sortOption) {
    case 'nearest':
      return sorted.sort((a, b) => distance(a) - distance(b));
    case 'cheapest':
      return sorted.sort((a, b) => a.price - b.price);
    case 'expiring':
      return sorted.sort((a, b) => a.endTime - b.endTime);
    default:
      return sorted;
  }
}, [filteredOffers, sortOption]);
```

---

## 🐛 Debug Checklist

```bash
# Check state
console.log('Sheet open:', discoverSheetOpen);
console.log('Sheet mode:', sheetMode);
console.log('Partner ID:', selectedPartnerId);

# Check data
console.log('Offers:', offers.length);
console.log('Filtered:', filteredOffers.length);
console.log('User location:', userLocation);

# Check callbacks
console.log('onOfferClick:', typeof onOfferClick);
console.log('onMapHighlight:', typeof onMapHighlight);
console.log('onMapCenter:', typeof onMapCenter);
```

---

## ⚡ Performance Tips

1. **Memoize expensive calculations**
   ```tsx
   const filteredOffers = useMemo(() => {...}, [offers, filters]);
   ```

2. **Virtualize long lists (>50 items)**
   ```tsx
   import { Virtuoso } from 'react-virtuoso';
   ```

3. **Lazy load images**
   ```tsx
   <img loading="lazy" decoding="async" />
   ```

4. **Debounce scroll events**
   ```tsx
   const handleScroll = debounce(fn, 100);
   ```

5. **Use React.memo for cards**
   ```tsx
   export const OfferCard = React.memo(({ offer }) => {...});
   ```

---

## 📊 Z-Index Layers

```
100: Reservation Modal
90:  Navigation Top Bar (when navigating)
50:  UnifiedDiscoverSheet
40:  Sheet Backdrop
30:  FloatingStarButton
20:  FloatingBottomNav
10:  Map Overlay Controls
0:   Map Base
```

---

## 🎨 Tailwind Classes

### Common Patterns

```tsx
// Orange gradient button
className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30"

// Rounded pill
className="rounded-full px-3 py-1.5"

// 2-column grid
className="grid grid-cols-2 gap-2"

// Horizontal scroll (no scrollbar)
className="flex gap-2 overflow-x-auto scrollbar-hide"

// Backdrop blur
className="backdrop-blur-xl bg-white/95"

// Text clamp (2 lines)
className="line-clamp-2"

// Safe area padding
className="pb-safe"
```

---

## 📚 TypeScript Types

```tsx
import {
  UnifiedDiscoverSheetProps,
  SheetHeight,
  ContentMode,
  SortOption,
  OfferCluster,
} from '@/components/discover/types';
```

---

## 🔗 Related Files

```
src/components/discover/
├── UnifiedDiscoverSheet.tsx       (378 lines)
├── DiscoverModeContent.tsx        (398 lines)
├── PartnerModeContent.tsx         (267 lines)
├── PartnerOfferCard.tsx           (167 lines)
└── types.ts                       (45 lines)

src/components/explore/
└── OfferCard.tsx                  (reused)

docs/
├── UNIFIED_DISCOVER_SHEET_SPEC.md (full spec)
└── UNIFIED_DISCOVER_SHEET_INTEGRATION.md (this guide)
```

---

**Version:** 1.0  
**Last Updated:** December 1, 2025  
**Total LOC:** ~1,255 lines

**Print this page and keep it handy! 📎**
