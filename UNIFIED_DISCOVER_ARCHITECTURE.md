# 🏗️ Component Architecture — Visual Reference

**Understanding the structure of UnifiedDiscoverSheet**

---

## 📊 Component Tree

```
App
└── IndexRedesigned
    ├── GoogleMapProvider
    │   └── SmartPickGoogleMap
    │       └── Map Markers (pins)
    │
    ├── FloatingBottomNav (z-20)
    │   ├── Home
    │   ├── Favorites
    │   ├── Reserve (center)
    │   ├── Profile
    │   └── Menu
    │
    ├── FloatingStarButton (z-30)
    │   ├── Star Icon
    │   └── Sort Menu (conditional)
    │
    ├── UnifiedDiscoverSheet (z-50) ← NEW
    │   ├── SheetBackdrop (z-40)
    │   ├── DragHandle
    │   ├── SheetHeader
    │   │   ├── BackButton (partner mode)
    │   │   ├── Title
    │   │   └── CloseButton
    │   │
    │   └── SheetBody (mode-dependent)
    │       │
    │       ├── [DISCOVER MODE]
    │       │   └── DiscoverModeContent
    │       │       ├── SearchBar
    │       │       │   ├── SearchIcon
    │       │       │   ├── Input
    │       │       │   ├── ClearButton
    │       │       │   └── FilterButton
    │       │       │
    │       │       ├── SortPillsRow
    │       │       │   ├── RecommendedPill ⭐
    │       │       │   ├── NearestPill 📍
    │       │       │   ├── CheapestPill 💸
    │       │       │   ├── ExpiringPill ⏳
    │       │       │   └── NewestPill 🆕
    │       │       │
    │       │       ├── CategoryChipsRow
    │       │       │   ├── AllChip ⭐
    │       │       │   ├── RestaurantChip 🍕
    │       │       │   ├── BakeryChip 🥐
    │       │       │   ├── DessertChip 🍰
    │       │       │   └── ... (9 total)
    │       │       │
    │       │       ├── ScrollableContent
    │       │       │   ├── EmptyState (if no offers)
    │       │       │   │   ├── Emoji
    │       │       │   │   ├── Message
    │       │       │   │   ├── ClearButton
    │       │       │   │   └── FallbackOffers
    │       │       │   │
    │       │       │   ├── OfferCluster (Trending)
    │       │       │   │   ├── ClusterHeader
    │       │       │   │   └── OfferGrid (2-col)
    │       │       │   │       ├── OfferCard
    │       │       │   │       └── OfferCard
    │       │       │   │
    │       │       │   ├── OfferCluster (Closing Soon)
    │       │       │   ├── OfferCluster (Under 5 GEL)
    │       │       │   ├── OfferCluster (Freshly Baked)
    │       │       │   │
    │       │       │   └── AllOffersSection
    │       │       │       └── OfferGrid (2-col)
    │       │       │           └── OfferCard (repeat)
    │       │       │
    │       │       └── SafeAreaSpacer
    │       │
    │       └── [PARTNER MODE]
    │           └── PartnerModeContent
    │               ├── PartnerHeader
    │               │   ├── PartnerName
    │               │   ├── Location
    │               │   └── Tagline
    │               │
    │               ├── PartnerInfoRow
    │               │   ├── Rating ⭐
    │               │   ├── Distance 📍
    │               │   ├── WalkingTime 🚶
    │               │   └── ViewOnMapButton
    │               │
    │               ├── CarouselContainer
    │               │   └── AnimatePresence
    │               │       └── PartnerOfferCard (current)
    │               │           ├── Image (16:9)
    │               │           ├── Badges
    │               │           │   ├── TimeBadge
    │               │           │   ├── DiscountBadge
    │               │           │   └── DistanceBadge
    │               │           ├── Title
    │               │           ├── Description
    │               │           ├── PriceRow
    │               │           ├── PickupTime
    │               │           └── ReserveButton
    │               │
    │               ├── PaginationDots
    │               │   ├── Dot (active)
    │               │   ├── Dot
    │               │   └── Dot
    │               │
    │               ├── OfferCounter
    │               ├── SeeAllButton (if > 3)
    │               └── SwipeHint
    │
    ├── ReservationModalNew (z-100)
    │   └── (opens when offer card clicked)
    │
    └── FloatingReservationCard (z-90)
        └── (appears after reservation)
```

---

## 🎨 Visual Layout (Discover Mode, Full)

```
┌─────────────────────────────────────────┐
│ ══════════════════════                  │ ← DragHandle (z-51)
├─────────────────────────────────────────┤
│ Discover                        [X]     │ ← SheetHeader (48px)
├─────────────────────────────────────────┤
│ 🔍 Search deals, places...      [≡]    │ ← SearchBar (40px, sticky)
├─────────────────────────────────────────┤
│ ⭐ Recommended 📍 Nearest 💸 Cheapest   │ ← SortPills (horizontal scroll)
├─────────────────────────────────────────┤
│ ⭐  🍕  🥐  🍰  ☕  🥤  🛒  🏪       │ ← CategoryChips (48px circles)
│ All  Restaurant  Bakery  Dessert  Café  │
├─────────────────────────────────────────┤
│ ┌─ ScrollableContent ─────────────────┐ │
│ │                                      │ │
│ │ 🔥 Trending Right Now                │ │ ← ClusterHeader
│ │ ┌──────────┐  ┌──────────┐          │ │
│ │ │ [Image]  │  │ [Image]  │          │ │ ← OfferCard (2-col grid)
│ │ │ 22h 30m  │  │ 1h 15m   │          │ │
│ │ │ -42%     │  │ -35%     │          │ │
│ │ │──────────│  │──────────│          │ │
│ │ │Croissant │  │Pizza Sli │          │ │
│ │ │Bella's ⭐│  │Joe's   ⭐│          │ │
│ │ │₾4.50 ₾8  │  │₾3.20 ₾5  │          │ │
│ │ │3 left    │  │5 left    │          │ │
│ │ └──────────┘  └──────────┘          │ │
│ │                                      │ │
│ │ ⏰ Closing Soon                      │ │
│ │ ┌──────────┐  ┌──────────┐          │ │
│ │ │ ...      │  │ ...      │          │ │
│ │ └──────────┘  └──────────┘          │ │
│ │                                      │ │
│ │ 💸 Under 5 GEL                       │ │
│ │ ┌──────────┐  ┌──────────┐          │ │
│ │ │ ...      │  │ ...      │          │ │
│ │ └──────────┘  └──────────┘          │ │
│ │                                      │ │
│ │ (scrollable, more content below)     │ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                           │
│ ─────────────── SafeArea ───────────────  │ ← 24px spacer
└─────────────────────────────────────────┘

[Behind sheet, dimmed 40%]
┌─────────────────────────────────────────┐
│ MAP WITH PINS                            │ ← z-0
│ (partially visible, blurred)             │
└─────────────────────────────────────────┘

[Below sheet]
┌─────────────────────────────────────────┐
│ [Home] [♥] [★] [Profile] [Menu]         │ ← FloatingBottomNav (z-20)
└─────────────────────────────────────────┘
```

---

## 🎨 Visual Layout (Partner Mode, Full)

```
┌─────────────────────────────────────────┐
│ ══════════════════════                  │ ← DragHandle (z-51)
├─────────────────────────────────────────┤
│ ← Bella's Bakery                  [X]   │ ← SheetHeader (48px)
│ Saburtalo • Great picks here ✨         │   with back button
├─────────────────────────────────────────┤
│ ⭐ 4.8 (240) • 0.4 km • 5 min           │ ← PartnerInfoRow
│ [View on map →]                         │
├─────────────────────────────────────────┤
│ ┌─ CarouselContainer ────────────────┐  │
│ │                                     │  │
│ │ ┌───────────────────────────────┐  │  │
│ │ │                               │  │  │
│ │ │   [Large Image 16:9]          │  │  │ ← PartnerOfferCard
│ │ │   22h 30m         -42%        │  │  │
│ │ │                               │  │  │
│ │ │───────────────────────────────│  │  │
│ │ │   Croissant Bundle            │  │  │
│ │ │   Fresh croissants, pain...   │  │  │
│ │ │                               │  │  │
│ │ │   ₾4.50        was ₾8.00      │  │  │
│ │ │   3 left                      │  │  │
│ │ │                               │  │  │
│ │ │   [Reserve Now]               │  │  │ ← Orange gradient button
│ │ │                               │  │  │
│ │ └───────────────────────────────┘  │  │
│ │                                     │  │
│ │ ● ○ ○                               │  │ ← PaginationDots
│ │                                     │  │
│ │ Offer 1 of 3                        │  │ ← OfferCounter
│ │                                     │  │
│ │ [See all 5 offers from this...]    │  │ ← SeeAllButton (if > 3)
│ │                                     │  │
│ └─────────────────────────────────────┘  │
│                                           │
│ ← Swipe to browse →                      │ ← SwipeHint
│                                           │
│ ─────────────── SafeArea ───────────────  │
└─────────────────────────────────────────┘

[Behind sheet, dimmed 40%]
┌─────────────────────────────────────────┐
│ MAP WITH PARTNER PIN HIGHLIGHTED         │ ← z-0
│ (pin bouncing, centered)                 │
└─────────────────────────────────────────┘
```

---

## 📏 Component Dimensions

### Discover Mode

| Component | Height | Width | Notes |
|-----------|--------|-------|-------|
| DragHandle | 4px | 48px | Gray, rounded |
| SheetHeader | 48px | 100% | Title + close |
| SearchBar | 40px | calc(100% - 24px) | With filter button |
| SortPill | 32px | auto | Rounded-full |
| CategoryChip | 48px (circle) | 56px | Icon + label |
| OfferCard | ~200px | ~48% | 2-col grid |
| ClusterHeader | 28px | 100% | Emoji + title |

### Partner Mode

| Component | Height | Width | Notes |
|-----------|--------|-------|-------|
| PartnerHeader | 64px | 100% | Name + tagline |
| InfoRow | 48px | 100% | Rating, distance |
| PartnerOfferCard | ~480px | 90vw | Large, full-width |
| ReserveButton | 48px | 100% | Orange gradient |
| PaginationDots | 12px | auto | Active: 32px x 8px |

---

## 🎭 State Flow Diagram

```
┌─────────────────────────────────────────┐
│ USER OPENS APP                          │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ MAP VIEW                                │
│ - Map renders                           │
│ - Pins displayed                        │
│ - Star button visible                   │
│ - Sheet closed (open: false)            │
└─────────────────────────────────────────┘
                   ↓
         ┌─────────┴─────────┐
         ↓                   ↓
    [TAP STAR]          [TAP PIN]
         ↓                   ↓
┌────────────────┐   ┌──────────────────┐
│ DISCOVER MODE  │   │ PARTNER MODE     │
│ - open: true   │   │ - open: true     │
│ - mode: disc.  │   │ - mode: partner  │
│ - height: coll.│   │ - height: mid    │
│ - partnerId: —│   │ - partnerId: set │
└────────────────┘   └──────────────────┘
         ↓                   ↓
    [SWIPE UP]          [SWIPE UP]
         ↓                   ↓
┌────────────────┐   ┌──────────────────┐
│ height: mid    │   │ height: full     │
└────────────────┘   └──────────────────┘
         ↓                   ↓
    [SWIPE UP]        [SWIPE CARDS]
         ↓                   ↓
┌────────────────┐   ┌──────────────────┐
│ height: full   │   │ navigate offers  │
└────────────────┘   └──────────────────┘
         ↓                   ↓
   [SEARCH/FILTER]      [TAP RESERVE]
         ↓                   ↓
┌────────────────┐   ┌──────────────────┐
│ offers filter  │   │ RESERVATION      │
│ re-render      │   │ MODAL OPENS      │
└────────────────┘   └──────────────────┘
         ↓                   ↓
   [TAP OFFER]        [CONFIRM]
         ↓                   ↓
┌────────────────┐   ┌──────────────────┐
│ RESERVATION    │   │ SUCCESS!         │
│ MODAL OPENS    │   │ Sheet closes     │
└────────────────┘   │ FloatingCard     │
         ↓           └──────────────────┘
   [CONFIRM]
         ↓
┌────────────────────────────────────────┐
│ RESERVATION COMPLETE                   │
│ - Sheet closes                         │
│ - FloatingReservationCard appears      │
│ - User can navigate to partner         │
└────────────────────────────────────────┘
```

---

## 🔄 Data Flow

```
IndexRedesigned (parent)
│
├─ State
│  ├─ offers: Offer[]
│  ├─ user: User | null
│  ├─ userLocation: [lat, lng]
│  ├─ discoverSheetOpen: boolean
│  ├─ sheetMode: 'discover' | 'partner'
│  ├─ selectedPartnerId: string | null
│  ├─ selectedCategory: string
│  ├─ selectedSort: SortOption
│  ├─ highlightedOfferId: string | null
│  └─ selectedOffer: Offer | null
│
└─ UnifiedDiscoverSheet (child)
   │
   ├─ Props (input from parent)
   │  ├─ offers
   │  ├─ user
   │  ├─ userLocation
   │  ├─ open
   │  ├─ mode
   │  ├─ partnerId
   │  ├─ selectedCategory
   │  └─ selectedSort
   │
   ├─ Events (output to parent)
   │  ├─ onClose() → setDiscoverSheetOpen(false)
   │  ├─ onModeChange(mode) → setSheetMode(mode)
   │  ├─ onOfferClick(offer) → setSelectedOffer(offer)
   │  ├─ onMapHighlight(id) → setHighlightedOfferId(id)
   │  ├─ onMapCenter(loc) → googleMap.panTo(loc)
   │  ├─ onCategorySelect(cat) → setSelectedCategory(cat)
   │  └─ onSortChange(sort) → setSelectedSort(sort)
   │
   └─ Internal State
      ├─ sheetHeight: 'collapsed' | 'mid' | 'full'
      ├─ searchQuery: string
      └─ (mode content handles rest)
```

---

## 🎨 Z-Index Hierarchy

```
100: ReservationModal (top-most)
 90: FloatingReservationCard (post-reservation)
 50: UnifiedDiscoverSheet (main sheet)
 40: SheetBackdrop (dimming overlay)
 30: FloatingStarButton (discovery trigger)
 20: FloatingBottomNav (navigation bar)
 10: Map Controls (zoom, location, etc.)
  0: Map (base layer)
```

**Rule:** Higher z-index = rendered on top

---

## 🎬 Animation Timeline

### Opening Sheet (Discover Mode)

```
0ms    → User taps star button
         - onOpenExplore() called
         - setDiscoverSheetOpen(true)
         - setSheetHeight('collapsed')

50ms   → Sheet begins entering
         - Initial: y=100%, opacity=0
         - Animate: y=0, opacity=1

350ms  → Sheet fully visible (collapsed)
         - Spring animation settles
         - Drag handle starts pulsing (2s loop)

[User swipes up]

400ms  → Sheet expands to mid
         - Height: 15vh → 50vh
         - Backdrop: opacity 0 → 0.2

750ms  → Mid-height animation complete
         - Content is interactive
```

### Switching to Partner Mode

```
0ms    → User taps map pin
         - setSelectedPartnerId(partner.id)
         - setSheetMode('partner')
         - setSheetHeight('mid')

50ms   → Mode transition begins
         - Discover content: x=0 → x=-20, opacity=1 → 0
         - Partner content: x=20 → x=0, opacity=0 → 1

350ms  → Partner mode active
         - Carousel card visible
         - Pagination dots rendered
```

### Carousel Swipe

```
0ms    → User swipes left
         - onDragEnd() detects swipe direction
         - setDirection(-1)
         - setCurrentIndex(index + 1)

50ms   → Card exit animation
         - Current card: x=0 → x=-300, opacity=1 → 0

100ms  → Next card enters
         - Next card: x=300 → x=0, opacity=0 → 1

450ms  → Animation complete
         - New card centered
         - Map pin highlights (bounce)
```

---

## 🧩 Reusable Components

### From `@/components/explore/`

- **OfferCard.tsx** — Compact 2-col cards (4:3 images)
- **FloatingStarButton.tsx** — Star button with sort menu

### From `@/components/ui/`

- **Button.tsx** — Shadcn button component
- **Input.tsx** — Shadcn input component

### From `@/lib/`

- **categories.ts** — Category icons, labels, list
- **maps/distance.ts** — calculateDistance, formatDistance
- **types.ts** — Offer, User, Partner types

---

## 📦 Dependencies

```json
{
  "framer-motion": "^10.x",
  "lucide-react": "^0.x",
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "@googlemaps/js-api-loader": "^1.x",
  "tailwindcss": "^3.x"
}
```

---

## 🔍 Props Reference

### UnifiedDiscoverSheet

```tsx
interface UnifiedDiscoverSheetProps {
  // Required
  offers: Offer[];
  user: User | null;
  userLocation: [number, number] | null;
  open: boolean;
  onClose: () => void;
  onOfferClick: (offer: Offer, index: number) => void;
  
  // Optional (mode control)
  mode?: 'discover' | 'partner';
  partnerId?: string | null;
  onModeChange?: (mode: ContentMode) => void;
  onHeightChange?: (height: SheetHeight) => void;
  
  // Optional (discovery)
  selectedCategory?: string;
  selectedSort?: SortOption;
  onCategorySelect?: (category: string) => void;
  onSortChange?: (sort: SortOption) => void;
  
  // Optional (map)
  onMapHighlight?: (offerId: string | null) => void;
  onMapCenter?: (location: { lat: number; lng: number }) => void;
}
```

---

## 🎯 Event Handlers Summary

| Event | Trigger | Action |
|-------|---------|--------|
| `onOpenExplore` | Star button tap | Opens sheet in discover mode |
| `onClose` | Close (X) tap | Closes sheet |
| `onOfferClick` | Offer card tap | Opens reservation modal |
| `onMapHighlight` | Card scroll | Highlights map pin |
| `onMapCenter` | Card in view | Centers map on offer |
| `onCategorySelect` | Category chip tap | Filters offers |
| `onSortChange` | Sort pill tap | Reorders offers |
| `onModeChange` | Mode switch | Updates parent mode |
| `onHeightChange` | Drag/swipe | Updates parent height |

---

## 🎨 CSS Classes Reference

### Tailwind Utilities

```css
/* Cosmic Orange Gradient */
.bg-gradient-to-r.from-orange-500.to-orange-600

/* Rounded Pills */
.rounded-full

/* Grid Layouts */
.grid.grid-cols-2.gap-2

/* Flex Layouts */
.flex.items-center.gap-2

/* Shadows */
.shadow-md.shadow-orange-500/30

/* Scrollable (no scrollbar) */
.overflow-x-auto.scrollbar-hide

/* Text Clamp */
.line-clamp-2

/* Safe Area */
.pb-safe
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile First (default) */
@media (min-width: 375px) { ... }

/* iPhone 14 */
@media (min-width: 393px) { ... }

/* iPhone Pro Max */
@media (min-width: 430px) { ... }

/* Small Tablets */
@media (min-width: 768px) { ... }

/* Large Tablets */
@media (min-width: 1024px) { ... }
```

**Note:** Current implementation is mobile-only. Tablet/desktop support can be added in Phase 2.

---

## 🎬 Summary

This visual reference provides:

✅ Complete component tree structure  
✅ Visual layout diagrams  
✅ Dimension specifications  
✅ State flow diagrams  
✅ Data flow patterns  
✅ Z-index hierarchy  
✅ Animation timelines  
✅ Props & event reference  

**Use this as a quick lookup when building or debugging the sheet! 📎**

---

**Version:** 1.0  
**Last Updated:** December 1, 2025  
**For:** SmartPick Development Team
