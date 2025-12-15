# 🎯 SMARTPICK UNIFIED BOTTOM-SHEET ARCHITECTURE
**Production-Ready Design System**

---

## 🧠 SYSTEM OVERVIEW

### Current Problems Being Fixed:
- ❌ Multiple competing sheets (Discover, Carousel, OfferBottomSheet)
- ❌ Two star buttons causing confusion
- ❌ Sheet overlaps bottom navigation
- ❌ Inconsistent transitions (Map → Discover → Offer)
- ❌ Scroll conflicts (map scroll + sheet scroll)
- ❌ Map pins opening wrong sheet

### NEW Architecture:
✅ **ONE MegaSheet** with 3 modes
✅ **ONE star button** with clear purpose
✅ **Fixed bottom nav** (never covered)
✅ **Smooth transitions** between all states
✅ **No scroll conflicts** (controlled scroll boundaries)
✅ **Map pins** → Always open Carousel mode

---

## 📐 UX ARCHITECTURE

### Flow Diagram:
```
MAP (Idle State)
  │
  ├─→ [Tap Star Button] → DISCOVER MODE (MegaSheet)
  │     │
  │     ├─→ [Tap Offer] → CAROUSEL MODE (same sheet transitions)
  │     │
  │     └─→ [Search/Filter] → Updated grid (stays in Discover)
  │
  ├─→ [Tap Map Pin] → CAROUSEL MODE (Partner's offers)
  │     │
  │     ├─→ [Swipe Left/Right] → Next/Prev offer (horizontal)
  │     │
  │     └─→ [Tap Reserve] → RESERVATION MODE (same sheet)
  │           │
  │           └─→ [Confirm] → QR MODE (mini sheet at bottom)
  │                 │
  │                 └─→ [Active] → TRACKING BAR (persistent)
  │
  └─→ [Long Press Star] → ACTIVE RESERVATION (if exists)
```

---

## 🎨 WIREFRAMES

### 1. MAP VIEW (Default State)
```
┌─────────────────────────┐
│   [🌍 MAP BACKGROUND]   │
│                         │
│  📍 📍   📍   📍       │
│     📍      📍         │
│         📍             │
│    📍        📍  📍    │
│                         │
│                         │
│                         │
│                   ☀️    │  ← Optional: Weather widget
│                         │
└─────────────────────────┘
┌─────────────────────────┐
│ 🏠  ❤️  [⭐]  👤  ☰  │  ← Bottom Nav (Always visible)
└─────────────────────────┘
          ↑
      Glowing Star
   (Opens Discover)
```

### 2. DISCOVER MODE - Collapsed (20vh)
```
┌─────────────────────────┐
│   [🌍 MAP DIMMED 60%]   │
│                         │
│                         │
└─────────────────────────┘
┌─────────────────────────┐ ← Sheet starts here
│  ═══ (Drag Handle)      │
│                         │
│  🔥 Discover Deals      │  ← Title
│  34 deals • Updated     │  ← Count
│                         │
│  🔍 [Search...]         │  ← Compact search
│                         │
│  [⭐Recommended] [📍Near]│  ← Filters (scroll →)
│                         │
│  ┌──────┐ ┌──────┐     │  ← Preview 2 cards
│  │ 🍕  │ │ 🥐  │     │
│  │ $4  │ │ $3  │     │
│  └──────┘ └──────┘     │
└─────────────────────────┘
│ 🏠  ❤️  [⭐]  👤  ☰  │
└─────────────────────────┘
```

### 3. DISCOVER MODE - Mid (50vh)
```
┌─────────────────────────┐
│   [🌍 MAP DIMMED 70%]   │
└─────────────────────────┘
┌─────────────────────────┐
│  ═══                    │
│  🔥 Discover Deals   [✕]│
│  34 deals • Updated     │
│  🔍 [Search deals...]   │
│  [⭐Rec] [📍Near] [💸]  │
│  [🍕All][🥐Bakery]...   │
│  ─────────────────────  │
│  ┌──────┐ ┌──────┐     │
│  │ 🍕  │ │ 🥐  │     │ ↕ Scrollable
│  │Pizza│ │Bread│     │   Grid
│  │ $4  │ │ $3  │     │
│  └──────┘ └──────┘     │
│  ┌──────┐ ┌──────┐     │
│  │ ☕   │ │ 🍰  │     │
│  └──────┘ └──────┘     │
└─────────────────────────┘
│ 🏠  ❤️  [⭐]  👤  ☰  │
└─────────────────────────┘
```

### 4. DISCOVER MODE - Full (calc(100vh - 80px))
```
┌─────────────────────────┐
│  ═══                    │
│  🔥 Discover Deals   [✕]│
│  34 deals • Updated     │
│  🔍 [Search deals...]   │
│  [⭐Rec] [📍Near] [💸]  │
│  [🍕All][🥐Bakery]...   │
│  ─────────────────────  │
│  ┌──────┐ ┌──────┐     │
│  │ 🍕  │ │ 🥐  │     │
│  │Pizza│ │Bread│     │
│  │ $4  │ │ $3  │     │ ↕ Full
│  └──────┘ └──────┘     │   Scrollable
│  ┌──────┐ ┌──────┐     │   Grid
│  │ ☕   │ │ 🍰  │     │
│  │Coffee│ │Cake │     │
│  │ $2  │ │ $5  │     │
│  └──────┘ └──────┘     │
│  ┌──────┐ ┌──────┐     │
│  │ 🥤  │ │ 🍔  │     │
│  └──────┘ └──────┘     │
└─────────────────────────┘
│ 🏠  ❤️  [⭐]  👤  ☰  │
└─────────────────────────┘
```

### 5. CAROUSEL MODE - Partner Offers (60vh)
```
┌─────────────────────────┐
│   [🌍 MAP DIMMED 70%]   │
└─────────────────────────┘
┌─────────────────────────┐
│  ═══              [←] [✕]│
│  🍕 Pizza Place         │
│  📍 Tbilisi • 0.3km     │
│  ─────────────────────  │
│  ◄ ┌────────────────┐ ► │  ← Swipeable
│    │                │   │     Horizontal
│    │   [🍕 IMAGE]   │   │     Carousel
│    │                │   │
│    │  Margherita    │   │
│    │  Pizza         │   │
│    │  10₾ → 4₾      │   │
│    │  Save 60%      │   │
│    │                │   │
│    │  📦 5 left     │   │
│    │  ⏰ Until 8PM  │   │
│    │                │   │
│    │ [Reserve Now]  │   │
│    └────────────────┘   │
│  ●  ○  ○  (2 more)     │  ← Dots indicator
└─────────────────────────┘
│ 🏠  ❤️  [⭐]  👤  ☰  │
└─────────────────────────┘
```

### 6. RESERVATION MODE - Compact (40vh)
```
┌─────────────────────────┐
│   [🌍 MAP DIMMED 80%]   │
│                         │
└─────────────────────────┘
┌─────────────────────────┐
│  ═══              [←] [✕]│
│  ✨ Reserve This Deal   │
│  ─────────────────────  │
│  ┌────┐  Margherita    │
│  │ 🍕 │  Pizza         │
│  │    │  4₾  (was 10₾) │
│  └────┘                 │
│  ─────────────────────  │
│  💰 You'll pay:         │
│     4₾ + 8 SmartPoints │
│  🎯 Your balance: 120pts│
│  ─────────────────────  │
│  📦 Quantity:   [1] ▼  │
│  ⏰ Pickup: 6-8 PM     │
│  📍 123 Rustaveli Ave  │
│  ─────────────────────  │
│  [Confirm Reservation] │  ← Big CTA
└─────────────────────────┘
│ 🏠  ❤️  [⭐]  👤  ☰  │
└─────────────────────────┘
```

### 7. QR MODE - Mini Sheet (25vh)
```
┌─────────────────────────┐
│   [🌍 MAP WITH ROUTE]   │
│                         │
│      → → → → → →       │
│         📍 (Partner)    │
└─────────────────────────┘
┌─────────────────────────┐
│  ═══                    │
│  ✅ Reserved!           │
│  🍕 Margherita Pizza    │
│  ─────────────────────  │
│  ┌─────────────┐       │
│  │             │       │
│  │  [QR CODE]  │       │
│  │             │       │
│  └─────────────┘       │
│  Show this at pickup   │
│  Expires: 7:45 PM      │
└─────────────────────────┘
│ 🏠  ❤️  [⭐]  👤  ☰  │
└─────────────────────────┘
```

### 8. ACTIVE TRACKING BAR - Persistent (10vh)
```
┌─────────────────────────┐
│   [🌍 MAP WITH ROUTE]   │
│                         │
│      → → → → → →       │
│         📍 You          │
│            ↓ 0.3km     │
│         📍 Destination  │
└─────────────────────────┘
┌─────────────────────────┐
│  🚶 2 min away • 0.3km  │  ← Tap to expand
│  Pizza Place • Exp 8PM  │
└─────────────────────────┘
│ 🏠  ❤️  [⭐]  👤  ☰  │
└─────────────────────────┘
```

---

## 🎨 HIGH-FIDELITY UI SPECS

### Design Tokens:
```javascript
const DESIGN_TOKENS = {
  // Colors
  colors: {
    primary: '#FF8A00',      // Cosmic Orange
    primaryDark: '#FF6B00',
    primaryLight: '#FFB366',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    border: '#E5E7EB',
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
      muted: '#9CA3AF',
    },
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  
  // Spacing (8px grid)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  
  // Border Radius
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.07)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.15)',
  },
  
  // Typography
  typography: {
    h1: { size: '24px', weight: 700, line: 1.2 },
    h2: { size: '20px', weight: 600, line: 1.3 },
    h3: { size: '16px', weight: 600, line: 1.4 },
    body: { size: '14px', weight: 400, line: 1.5 },
    small: { size: '12px', weight: 400, line: 1.4 },
    tiny: { size: '10px', weight: 500, line: 1.3 },
  },
  
  // Sheet Heights
  sheetHeights: {
    collapsed: '20vh',
    mid: '50vh',
    full: 'calc(100vh - 80px)',
    carousel: '60vh',
    reservation: '40vh',
    qr: '25vh',
    tracking: '10vh',
  },
};
```

---

## ⚡ ANIMATION SYSTEM (Framer Motion)

### Spring Physics:
```javascript
const SPRING_CONFIGS = {
  // Sheet transitions
  sheet: {
    type: 'spring',
    stiffness: 400,
    damping: 40,
    mass: 0.8,
  },
  
  // Carousel swipe
  carousel: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  
  // Quick snaps
  snap: {
    type: 'spring',
    stiffness: 500,
    damping: 35,
  },
  
  // Smooth fades
  fade: {
    duration: 0.3,
    ease: 'easeInOut',
  },
};
```

### Gesture Detection:
```javascript
const GESTURE_THRESHOLDS = {
  // Velocity (px/s)
  velocityUp: -500,
  velocityDown: 500,
  
  // Offset (px)
  offsetUp: -100,
  offsetDown: 100,
  
  // Horizontal swipe
  swipeLeft: -50,
  swipeRight: 50,
  
  // Tap vs drag
  dragThreshold: 5, // px
};
```

---

## 🧩 COMPONENT ARCHITECTURE

```
App
├── MapScreen
│   ├── MapLibre (map tiles)
│   ├── MapMarkers
│   │   └── OfferPin (tap → open carousel)
│   └── UserLocationPin
│
├── MegaBottomSheet ⭐ NEW UNIFIED SYSTEM
│   ├── SheetContainer
│   │   ├── DragHandle
│   │   └── Backdrop (blur + dim)
│   │
│   ├── DiscoverMode
│   │   ├── Header (title + count)
│   │   ├── SearchBar (compact)
│   │   ├── FilterPills (horizontal scroll)
│   │   ├── CategoryPills (horizontal scroll)
│   │   └── OfferGrid (2 columns)
│   │       └── OfferCard
│   │
│   ├── CarouselMode
│   │   ├── PartnerHeader (name + location + back)
│   │   ├── HorizontalCarousel
│   │   │   └── OfferCardLarge (swipeable)
│   │   ├── DotsIndicator
│   │   └── ReserveButton
│   │
│   ├── ReservationMode
│   │   ├── OfferSummary
│   │   ├── SmartPointsSection
│   │   ├── QuantitySelector
│   │   ├── PickupDetails
│   │   └── ConfirmButton
│   │
│   └── QRMode
│       ├── SuccessMessage
│       ├── QRCodeDisplay
│       ├── ExpiryTimer
│       └── DirectionsButton
│
├── ActiveTrackingBar (persistent mini-sheet)
│   ├── DistanceIndicator
│   ├── ETAIndicator
│   └── ExpandButton
│
└── FloatingBottomNav (always visible)
    ├── HomeButton
    ├── FavoritesButton
    ├── StarButton (⭐ main CTA)
    ├── ProfileButton
    └── MenuButton
```

---

## 🔄 STATE MACHINE

### States:
```typescript
type AppState = 
  | 'map_idle'                    // Default: Just map
  | 'discover_collapsed'          // Star tapped, 20vh
  | 'discover_mid'                // Swiped up, 50vh
  | 'discover_full'               // Swiped up again, full
  | 'carousel_partner'            // Map pin tapped or offer tapped
  | 'carousel_offer'              // Viewing specific offer in carousel
  | 'reservation_confirm'         // Reserve tapped
  | 'reservation_processing'      // API call
  | 'qr_active'                   // Reservation confirmed
  | 'tracking_active';            // User heading to pickup
```

### Transitions:
```typescript
const transitions = {
  map_idle: {
    TAP_STAR: 'discover_collapsed',
    TAP_PIN: 'carousel_partner',
    LONG_PRESS_STAR: 'tracking_active', // if has active reservation
  },
  
  discover_collapsed: {
    SWIPE_UP: 'discover_mid',
    SWIPE_DOWN: 'map_idle',
    TAP_OFFER: 'carousel_offer',
  },
  
  discover_mid: {
    SWIPE_UP: 'discover_full',
    SWIPE_DOWN: 'discover_collapsed',
    TAP_OFFER: 'carousel_offer',
    TAP_CLOSE: 'map_idle',
  },
  
  discover_full: {
    SWIPE_DOWN: 'discover_mid',
    TAP_OFFER: 'carousel_offer',
    TAP_CLOSE: 'map_idle',
  },
  
  carousel_partner: {
    SWIPE_LEFT: 'carousel_partner', // next offer
    SWIPE_RIGHT: 'carousel_partner', // prev offer
    TAP_RESERVE: 'reservation_confirm',
    TAP_BACK: 'discover_mid',
    TAP_CLOSE: 'map_idle',
  },
  
  carousel_offer: {
    TAP_RESERVE: 'reservation_confirm',
    TAP_BACK: 'discover_mid',
    TAP_CLOSE: 'map_idle',
  },
  
  reservation_confirm: {
    TAP_CONFIRM: 'reservation_processing',
    TAP_BACK: 'carousel_offer',
    TAP_CLOSE: 'map_idle',
  },
  
  reservation_processing: {
    SUCCESS: 'qr_active',
    ERROR: 'reservation_confirm',
  },
  
  qr_active: {
    TAP_DIRECTIONS: 'tracking_active',
    TAP_CLOSE: 'map_idle',
    TIMER_EXPIRE: 'map_idle',
  },
  
  tracking_active: {
    TAP_EXPAND: 'qr_active',
    ARRIVED: 'qr_active',
    TAP_CLOSE: 'map_idle',
  },
};
```

---

## 📝 UX MICROCOPY

### Discover Mode:
- Header: "🔥 Discover Deals"
- Subheader: "{count} deals found • auto-updated"
- Search: "Search deals, places, items..."
- Empty: "🔍 No deals found\nTry adjusting your filters"
- Loading: "🔄 Finding fresh deals..."

### Carousel Mode:
- Header: "{partner_name}"
- Location: "📍 {city} • {distance}km away"
- Discount: "Save {percent}%"
- Quantity: "📦 {count} left"
- Timing: "⏰ Pickup {start} - {end}"

### Reservation Mode:
- Header: "✨ Reserve This Deal"
- Price: "💰 You'll pay: {price}₾ + {points} SmartPoints"
- Balance: "🎯 Your balance: {balance} points"
- Pickup: "⏰ Pickup between {start} - {end}"
- Location: "📍 {address}"
- CTA: "Confirm Reservation"

### Success Messages:
- Reserved: "✅ Reserved! Your deal is waiting"
- QR: "Show this QR code at pickup"
- Expires: "Expires: {time}"
- Distance: "🚶 {minutes} min away • {km}km"

### Error Messages:
- No offers: "No offers available right now"
- Out of stock: "This deal just sold out 😢"
- Network: "Can't connect. Check your internet."
- Location: "Enable location for better results"

---

## 🚀 IMPLEMENTATION STRATEGY

### Phase 1: Remove Old System
```bash
# Delete conflicting components
- FloatingStarButton (duplicate)
- NewDiscoverSheet
- UnifiedDiscoverSheet (old version)
- OfferBottomSheet (replaced)
```

### Phase 2: Create New MegaSheet
```bash
# New components
+ MegaBottomSheet.tsx       (main controller)
+ DiscoverMode.tsx           (grid view)
+ CarouselMode.tsx           (horizontal swipe)
+ ReservationMode.tsx        (compact confirm)
+ QRMode.tsx                 (minimal QR display)
+ ActiveTrackingBar.tsx      (persistent mini-bar)
```

### Phase 3: Update Navigation
```bash
# Modify
~ FloatingBottomNav.tsx     (keep only one star)
~ IndexRedesigned.tsx       (integrate MegaSheet)
~ Map interactions          (pins → carousel)
```

### Phase 4: Test All Flows
- Star button → Discover → Offer → Reserve → QR
- Map pin → Carousel → Reserve
- Long press star → Active tracking
- Swipe gestures in all modes
- Search/filter in discover
- Horizontal swipe in carousel

---

## 📱 PLATFORM SPECIFICS

### iOS:
- Safe area insets for bottom nav
- Rubber-band scroll in discover mode
- Haptic feedback on reserve confirm
- Smooth 60fps animations

### Android:
- Navigation bar detection
- Material ripple effects
- Back button handling
- Different scroll physics

### PWA:
- Standalone mode detection
- Install prompt integration
- Offline mode handling
- Cache QR codes

---

This is the complete master plan. Ready to implement?
