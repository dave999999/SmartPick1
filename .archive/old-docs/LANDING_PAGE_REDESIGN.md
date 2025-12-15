# 🎨 SmartPick Landing Page Redesign
## Modern, Map-First, Mobile-Optimized UI/UX

**Date:** 2025-11-12
**Designer:** Claude Code
**Goal:** Transform SmartPick into a modern delivery app with map-first design
**Reference Style:** Wolt / TooGoodToGo / Uber Eats hybrid

---

## 📐 WIREFRAME - Mobile-First Layout

```
┌─────────────────────────────────────┐
│  ┌─┐  SmartPick    🔍 👤 ☰         │ ← Sticky Navbar (48px)
│  └─┘  Tagline      Profile Menu     │
├─────────────────────────────────────┤
│ All 🍽️ ☕ 🍰 🛍️ 🍕 🥗 ...    │ ← Category Tabs (Horizontal Scroll)
├─────────────────────────────────────┤
│                                     │
│         ╔═══════════════════╗       │
│         ║                   ║       │
│         ║   INTERACTIVE     ║       │ ← Map (70% screen height)
│         ║       MAP         ║       │   Full-width, with markers
│         ║                   ║       │
│         ║   📍 📍 📍        ║       │
│         ║ 📍     📍     📍  ║       │
│         ║   📍 📍 📍        ║       │
│         ╚═══════════════════╝       │
│                                     │
│  ┌────────┐  🧭 Near Me             │ ← Floating Buttons
│  │ Tap to │                         │   (Bottom-right)
│  │Activate│   📍 My Location        │
│  └────────┘                         │
├─────────────────────────────────────┤
│ 🔥 Hot Deals Around You            │ ← Section Title
├─────────────────────────────────────┤
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ →         │ ← Horizontal Scroll Cards
│ │ 🍕│ │ ☕│ │ 🍰│ │ 🥗│           │   Wolt-style minimal design
│ │$15│ │$8 │ │$12│ │$10│           │
│ └───┘ └───┘ └───┘ └───┘           │
├─────────────────────────────────────┤
│ All Offers (24)                    │ ← All Offers Grid
├─────────────────────────────────────┤
│ ┌──────┐ ┌──────┐                 │ ← 2-column grid (mobile)
│ │ Img  │ │ Img  │                 │   3-column (tablet)
│ │Title │ │Title │                 │   4-column (desktop)
│ │$15 ₾│ │$10 ₾│                 │
│ └──────┘ └──────┘                 │
│ ┌──────┐ ┌──────┐                 │
│ │ Img  │ │ Img  │                 │
│ └──────┘ └──────┘                 │
└─────────────────────────────────────┘
```

### Desktop Layout (>1024px)
```
┌──────────────────────────────────────────────────────────┐
│ 🔷 SmartPick    All 🍽️ ☕ 🍰 🛍️...     🔍 EN/KA 👤 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│              ╔═══════════════════════╗                   │
│              ║   INTERACTIVE MAP     ║                   │
│              ║                       ║                   │
│              ║   📍    📍    📍      ║                   │
│              ║      📍    📍    📍   ║                   │
│              ║   📍    📍    📍      ║                   │
│              ╚═══════════════════════╝                   │
│                                           🧭 📍          │
├──────────────────────────────────────────────────────────┤
│  🔥 Hot Deals  →                                        │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│  │    │ │    │ │    │ │    │ │    │ │    │           │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘           │
├──────────────────────────────────────────────────────────┤
│  All Offers (24)                                        │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐                              │
│  │   │ │   │ │   │ │   │                              │
│  └───┘ └───┘ └───┘ └───┘                              │
└──────────────────────────────────────────────────────────┘
```

---

## 🏗️ COMPONENT TREE

```
Index.tsx
├── NavBar (NEW - sticky, floating)
│   ├── Logo + Mini Tagline
│   ├── CategoryTabs (center)
│   └── RightActions
│       ├── Search Icon → FilterDrawer
│       ├── Language EN/KA
│       └── Profile/Menu
│
├── MapSection (70vh on mobile, 60vh on desktop)
│   ├── MapView (leaflet)
│   │   ├── Custom Markers (circular, modern)
│   │   └── Clusters
│   ├── MapOverlay (until activated)
│   │   └── "Double tap to activate map"
│   └── FloatingControls
│       ├── Near Me Button
│       └── My Location Button
│
├── HotDeals (NEW - horizontal scroll)
│   ├── Section Title "🔥 Hot Deals Around You"
│   └── HorizontalScrollCards
│       └── OfferCardMini (Wolt-style)
│
├── OffersGrid
│   ├── Section Title "All Offers (N)"
│   └── Grid (responsive 2/3/4 columns)
│       └── OfferCard (clean, minimal)
│
├── FilterDrawer (NEW - slide-in from right)
│   ├── Search Input
│   ├── Sort Dropdown
│   ├── Category Multi-select
│   ├── Price Range Slider
│   └── Distance Filter (if location enabled)
│
├── ReservationModal (existing)
└── AuthDialog (existing)
```

---

## 🎨 DESIGN TOKENS

### Colors
```css
/* Primary */
--primary-green: #00C896
--primary-green-light: #00E6A8
--primary-green-dark: #009B77
--primary-green-neon: #00FFBB

/* Background */
--bg-dark: #0F172A       /* slate-900 */
--bg-card: #1E293B       /* slate-800 */
--bg-light: #F8FAFC      /* slate-50 */
--bg-white: #FFFFFF

/* Text */
--text-primary: #0F172A
--text-secondary: #64748B  /* slate-500 */
--text-light: #94A3B8      /* slate-400 */
--text-white: #FFFFFF

/* Accent */
--accent-orange: #FF6F61
--accent-red: #EF4444
--accent-blue: #3B82F6

/* Borders */
--border-light: #E2E8F0    /* slate-200 */
--border-subtle: #F1F5F9   /* slate-100 */
```

### Typography
```css
/* Font Family */
font-family: 'Inter', 'Poppins', system-ui, sans-serif

/* Sizes */
--text-xs: 0.75rem     /* 12px */
--text-sm: 0.875rem    /* 14px */
--text-base: 1rem      /* 16px */
--text-lg: 1.125rem    /* 18px */
--text-xl: 1.25rem     /* 20px */
--text-2xl: 1.5rem     /* 24px */
--text-3xl: 1.875rem   /* 30px */
--text-4xl: 2.25rem    /* 36px */

/* Weights */
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
--font-extrabold: 800
```

### Spacing
```css
--spacing-xs: 0.25rem   /* 4px */
--spacing-sm: 0.5rem    /* 8px */
--spacing-md: 1rem      /* 16px */
--spacing-lg: 1.5rem    /* 24px */
--spacing-xl: 2rem      /* 32px */
--spacing-2xl: 3rem     /* 48px */
```

### Shadows
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow-md: 0 4px 6px rgba(0,0,0,0.07)
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1)
--shadow-xl: 0 20px 25px rgba(0,0,0,0.15)
--shadow-2xl: 0 25px 50px rgba(0,0,0,0.25)
```

### Border Radius
```css
--radius-sm: 0.375rem   /* 6px */
--radius-md: 0.5rem     /* 8px */
--radius-lg: 0.75rem    /* 12px */
--radius-xl: 1rem       /* 16px */
--radius-2xl: 1.5rem    /* 24px */
--radius-full: 9999px
```

---

## 📱 MOBILE MOCKUP (iPhone 14 Pro - 390x844)

```
┌──────────────────────────────────────┐
│ ⚫⚫⚫                    🔋📶 9:41 │ ← Status Bar
├──────────────────────────────────────┤
│ ╔════╗ SmartPick           🔍 👤 ☰│ ← NavBar
│ ║ 🔷 ║ Smart choice         EN  │ ← 48px sticky
│ ╚════╝ every day                  │
├──────────────────────────────────────┤
│ All  🍽️  ☕  🍰  🛍️  🍕  🥗  🍔→│ ← Category Pills
│                                    │ ← 56px scrollable
├──────────────────────────────────────┤
│┌────────────────────────────────────┐│
││                                    ││
││        ┌────────────────┐          ││
││        │  Double tap to │          ││
││        │  activate map  │          ││
││        └────────────────┘          ││
││                                    ││
││    📍        📍        📍          ││
││         📍        📍               ││ ← Map 70vh
││    📍        📍        📍          ││ ← (590px)
││         📍        📍               ││
││    📍        📍        📍          ││
││                                    ││
││                      ┌──────────┐  ││
││                      │ 🧭 Near  │  ││
││                      │   Me     │  ││
││                      ├──────────┤  ││
││                      │ 📍 My    │  ││
││                      │ Location │  ││
││                      └──────────┘  ││
│└────────────────────────────────────┘│
├──────────────────────────────────────┤
│ 🔥 Hot Deals Around You             │
├──────────────────────────────────────┤
│┌─────┐┌─────┐┌─────┐┌─────┐       →│
││[IMG]││[IMG]││[IMG]││[IMG]│         │
││Pizza││Coffee│Cake │Salad│         │
││$15₾ ││$8₾  ││$12₾ ││$10₾│         │
││5 lft││2 lft││8 lft││3 lft│         │
│└─────┘└─────┘└─────┘└─────┘         │
├──────────────────────────────────────┤
│ All Offers (24)                     │
│ ⚪⚪⚪ 📶 Newest ▼                   │
├──────────────────────────────────────┤
│┌────────────┐┌────────────┐         │
││  [IMAGE]   ││  [IMAGE]   │         │
││  Coffee    ││  Bakery    │         │
││  Arabica   ││  Sweet     │         │
││  $8 ₾      ││  $12 ₾     │         │
││  ⏰ 2h left││  ⏰ 5h left│         │
││  📍 500m   ││  📍 1.2km  │         │
│└────────────┘└────────────┘         │
│┌────────────┐┌────────────┐         │
││  [IMAGE]   ││  [IMAGE]   │         │
││  Pizza     ││  Sandwich  │         │
││  Margherita││  Club      │         │
││  $15 ₾     ││  $10 ₾     │         │
││  ⏰ 1h left││  ⏰ 4h left│         │
││  📍 300m   ││  📍 800m   │         │
│└────────────┘└────────────┘         │
└──────────────────────────────────────┘
```

---

## 🖱️ INTERACTIONS & ANIMATIONS

### 1. Map Activation
```
State: Locked (default)
- Map is visible but not interactive
- Semi-transparent overlay with "Double tap to activate"
- Scroll passes through to page scroll
- Prevents accidental map interaction

State: Activated (after double-tap)
- Overlay fades out (300ms)
- Map becomes fully interactive
- Zoom/pan enabled
- Full opacity
```

### 2. Category Tabs
```
- Horizontal scroll with momentum
- Active tab: underline animation (slide-in 200ms)
- Inactive tabs: 60% opacity
- Smooth scroll to selected
- Sticky to top after scrolling
```

### 3. Near Me Button
```
Idle:
- White background, shadow-md
- Pulse animation (subtle, 2s)

Active:
- Primary green background
- Ripple effect
- Map re-centers to user location
- Zoom level 13
```

### 4. Hot Deals Cards
```
- Horizontal scroll (momentum)
- Snap to card edges
- Cards: scale(1.02) on hover
- Shadow: md → lg transition
- Click: navigate with fade transition
```

### 5. Filter Drawer
```
Enter: slide-in from right (300ms)
Exit: slide-out to right (250ms)
Backdrop: fade-in/out (200ms)
Content: stagger animation (children)
```

### 6. Offer Cards Grid
```
Hover (desktop):
- Scale: 1 → 1.02 (200ms)
- Shadow: md → xl (200ms)
- Border: subtle → primary-green-light

Click:
- Scale: 1.02 → 0.98 (100ms)
- Then navigate with fade
```

---

## 🎯 SCROLL BEHAVIOR

### Navbar Behavior
```
Scroll Position 0-50px:
- Full height (56px)
- Opaque background
- Full logo + tagline

Scroll Position 50px+:
- Compact height (48px)
- Slightly transparent bg (95%)
- Mini logo only (tagline hidden)
- Backdrop blur effect
```

### Category Tabs
```
Scroll Position 0-100px:
- Below navbar
- Static position

Scroll Position 100px+:
- Sticky to top
- Below navbar
- Slight shadow
- Backdrop blur
```

### Map Container
```
- Fixed height: 70vh (mobile), 60vh (desktop)
- Never scrolls over other content
- Contained within viewport
- Locked scroll until activated
```

### Hot Deals Section
```
- Sticky section title (on scroll)
- Horizontal scroll (touch/wheel)
- Snap scroll on mobile
- Momentum scrolling
```

---

## 📦 ICON PACK

### Lucide React Icons Used
```typescript
// Navigation
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react'

// Map & Location
import { MapPin, Navigation, Compass, Locate } from 'lucide-react'

// UI Elements
import { Search, SlidersHorizontal, Filter } from 'lucide-react'

// Categories
import { Coffee, UtensilsCrossed, ShoppingBag, Cake,
         Pizza, Salad, Soup, IceCream } from 'lucide-react'

// Time & Status
import { Clock, TimerReset, AlertCircle, CheckCircle } from 'lucide-react'

// User Actions
import { User, LogIn, LogOut, Heart, Star } from 'lucide-react'

// Misc
import { Flame, TrendingUp, Zap, Sparkles } from 'lucide-react'
```

### Custom Category Icons Mapping
```javascript
const categoryIcons = {
  'COFFEE': '☕',
  'RESTAURANT': '🍽️',
  'BAKERY': '🍰',
  'SHOP': '🛍️',
  'PIZZA': '🍕',
  'SALAD': '🥗',
  'BURGER': '🍔',
  'DESSERT': '🍨',
  'DRINKS': '🥤',
  'DEFAULT': '🍴'
}
```

---

## 🗺️ MAP MARKER REDESIGN

### Modern Circular Marker Style

```html
<div class="marker-container">
  <div class="marker-pulse"></div> <!-- Animated pulse ring -->
  <div class="marker-pin">
    <div class="marker-icon">
      {categoryIcon}
    </div>
    <div class="marker-price">
      ${price}
    </div>
  </div>
</div>
```

### Marker Styles
```css
.marker-pin {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #00C896, #009B77);
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  box-shadow: 0 4px 12px rgba(0,200,150,0.4);
  position: relative;
  animation: bounce 2s infinite;
}

.marker-icon {
  transform: rotate(45deg);
  font-size: 20px;
  position: absolute;
  top: 8px;
  left: 8px;
}

.marker-pulse {
  position: absolute;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(0,200,150,0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 0; }
}

@keyframes bounce {
  0%, 100% { transform: rotate(-45deg) translateY(0); }
  50% { transform: rotate(-45deg) translateY(-8px); }
}
```

### Marker States
```javascript
// Default
background: linear-gradient(135deg, #00C896, #009B77)

// Hovered
background: linear-gradient(135deg, #00FFBB, #00E6A8)
transform: scale(1.15)

// Selected
background: linear-gradient(135deg, #FF6F61, #FF8A7A)
box-shadow: 0 6px 20px rgba(255,111,97,0.6)
z-index: 1000

// Expiring Soon (<1h)
background: linear-gradient(135deg, #FF6F61, #F59E0B)
animation: urgent-pulse 1s infinite
```

---

## 🔥 HOT DEALS CARD DESIGN

### Wolt-Style Minimal Card
```html
<div class="hot-deal-card">
  <div class="card-image">
    <img src="..." alt="..." />
    <div class="card-badge">⚡ Hot</div>
  </div>
  <div class="card-content">
    <h4 class="card-title">{title}</h4>
    <p class="card-subtitle">{partner}</p>
    <div class="card-footer">
      <span class="card-price">{price} ₾</span>
      <span class="card-quantity">{quantity} left</span>
    </div>
  </div>
</div>
```

### Card Dimensions
```
Mobile: 140px × 180px
Desktop: 180px × 220px

Spacing: 12px gap
Border radius: 16px
Shadow: 0 2px 8px rgba(0,0,0,0.08)
Hover shadow: 0 8px 16px rgba(0,0,0,0.12)
```

---

## 📊 RESPONSIVE BREAKPOINTS

```css
/* Mobile First */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md - tablet */ }
@media (min-width: 1024px) { /* lg - desktop */ }
@media (min-width: 1280px) { /* xl - wide desktop */ }
```

### Layout Changes
```
Mobile (<640px):
- Navbar: hamburger menu
- Categories: horizontal scroll
- Map: 70vh
- Hot Deals: 2 cards visible
- Offers Grid: 1 column

Tablet (640-1023px):
- Navbar: compact links
- Categories: horizontal scroll
- Map: 65vh
- Hot Deals: 3-4 cards visible
- Offers Grid: 2 columns

Desktop (1024px+):
- Navbar: full horizontal layout
- Categories: all visible (if fit)
- Map: 60vh
- Hot Deals: 5-6 cards visible
- Offers Grid: 3-4 columns
```

---

## ✅ WHAT WAS REMOVED

### Old Hero Section (REMOVED)
- ❌ "Discover Amazing Deals" title
- ❌ Reserve/Pickup neon boxes
- ❌ Search bar on top
- ❌ Sort dropdown on top
- ❌ Extra UI blocks above map
- ❌ Large padding sections

### Old Header (MODIFIED)
- ❌ Full desktop navigation in header
- ❌ Large logo (56px) → Mini logo (40px)
- ❌ Static positioning → Sticky
- ❌ Dark background → Semi-transparent

### Old Layout (CHANGED)
- ❌ Map at bottom → Map first (70%)
- ❌ Offers first → Hot deals + Offers below map
- ❌ Search/filters visible → Drawer
- ❌ Category bar below hero → Below navbar

---

## 🎨 GLASSMORPHISM EFFECTS

### NavBar
```css
background: rgba(15, 23, 42, 0.85);
backdrop-filter: blur(12px);
border-bottom: 1px solid rgba(255,255,255,0.1);
```

### Floating Buttons
```css
background: rgba(255, 255, 255, 0.95);
backdrop-filter: blur(8px);
box-shadow: 0 4px 12px rgba(0,0,0,0.1);
border: 1px solid rgba(255,255,255,0.2);
```

### Filter Drawer
```css
background: rgba(255, 255, 255, 0.98);
backdrop-filter: blur(20px);
```

---

## 📝 IMPLEMENTATION CHECKLIST

### Phase 1: Core Components
- [x] Create NavBar component
- [x] Create CategoryTabs component
- [x] Create FilterDrawer component
- [x] Create HotDeals component
- [x] Update MapView styling
- [x] Create MapActivationOverlay

### Phase 2: Styling & Animations
- [ ] Implement marker redesign
- [ ] Add scroll animations
- [ ] Add hover effects
- [ ] Implement transitions
- [ ] Add loading states

### Phase 3: Interactions
- [ ] Map activation logic
- [ ] Category tab scroll
- [ ] Filter drawer open/close
- [ ] Near me functionality
- [ ] Responsive behavior

### Phase 4: Polish
- [ ] Performance optimization
- [ ] Accessibility (a11y)
- [ ] Touch gestures (mobile)
- [ ] Browser compatibility
- [ ] Final testing

---

**Status:** Ready for implementation
**Estimated Effort:** 6-8 hours
**Priority:** High
**Testing Required:** Yes (mobile + desktop)
