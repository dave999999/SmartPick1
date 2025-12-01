# 🌟 Unified Discover & Partner Sheet — Complete Specification

**SmartPick App — Premium Mobile Discovery Experience**

Date: December 1, 2025  
Version: 2.0  
Author: Design & Engineering Team

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [High-Level UX Requirements](#high-level-ux-requirements)
3. [Component Architecture](#component-architecture)
4. [State Machine Design](#state-machine-design)
5. [Discover Mode Content Spec](#discover-mode-content-spec)
6. [Partner Mode Content Spec](#partner-mode-content-spec)
7. [Wireframes (All States)](#wireframes-all-states)
8. [High-Fidelity UI Specifications](#high-fidelity-ui-specifications)
9. [Animation Specifications](#animation-specifications)
10. [UX Writing & Copy](#ux-writing--copy)
11. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

### The User Experience

**When a user opens SmartPick**, they see a beautiful map with partner pins. At the bottom is a floating navigation bar with a central star button.

**When they tap the star button**, a sleek bottom sheet slides up from the bottom of the screen — this is the **Discover Sheet**. It starts at a comfortable "peek" height showing trending offers at a glance.

**The user can:**
- Swipe up to see mid-height or full-screen view
- Search for deals using the search bar
- Sort by: Recommended, Nearest, Cheapest, Expiring Soon, or Newly Added
- Filter by categories: Restaurant, Bakery, Café, Grocery, etc.
- Browse sectioned offer lists: "Trending Right Now", "Closing Soon", "Under 5 GEL", "Freshly Baked Today"
- Tap any offer card to open the detailed reservation modal

**When the user taps a partner pin on the map**, the bottom sheet transforms into **Partner Mode** — showing only that partner's offers in a beautiful horizontal carousel. They can swipe through the partner's deals, see distance/walking time, and quickly reserve.

**The entire experience** feels fluid, premium, and intuitive — like Uber Eats meets Google Maps meets Too Good To Go.

---

## High-Level UX Requirements

### A. One Unified Bottom Sheet Component

- **Single container** that handles both Discover Mode and Partner Mode
- Same drag handle, header structure, and animation system
- Only inner content changes based on mode

### B. Three Sheet Heights

1. **Collapsed (Peek)** — ~15-20vh
   - Shows a single row of offers or partner name
   - User can tap to expand or swipe up
   
2. **Mid-Height** — ~50vh
   - Shows search bar, filters, first 6-8 offers
   - Primary browsing mode
   
3. **Full-Screen** — ~85-90vh
   - All content visible, scrollable list
   - Close button in header

### C. Two Content Modes

**Mode 1: DISCOVER MODE**
- Triggered by: star button press (no partner selected)
- Content: Global offers, search, sort, categories, sectioned lists

**Mode 2: PARTNER MODE**
- Triggered by: map pin tap OR selecting partner from list
- Content: Partner-specific carousel, partner info, distance/ETA

### D. Integration Points

- **FloatingStarButton** — Opens sheet in Discover Mode
- **Map Pins** — Opens sheet in Partner Mode (pass partnerId)
- **FloatingBottomNav** — Stays visible, sheet appears above it
- **ReservationModal** — Opens when user taps an offer card

---

## Component Architecture

### Component Tree

```
UnifiedDiscoverSheet (main container)
├── SheetBackdrop (dark overlay, only in full-screen)
├── SheetHandle (drag indicator)
├── SheetHeader
│   ├── ModeToggle (if needed)
│   └── CloseButton
├── SheetBody (switches between modes)
│   ├── DiscoverModeContent (default)
│   │   ├── DiscoverSearchBar
│   │   ├── DiscoverSortPills
│   │   ├── DiscoverCategoryChips
│   │   └── DiscoverSectionList
│   │       └── OfferCard (2-column grid)
│   └── PartnerModeContent (when partner selected)
│       ├── PartnerHeader
│       ├── PartnerInfoRow
│       └── PartnerOfferCarousel
│           └── PartnerOfferCard (larger, swipeable)
└── BottomSafeAreaSpacer
```

### External Dependencies

- **MapView** — Highlights pins when cards scroll into view
- **FloatingStarButton** — Triggers `onOpenDiscover()`
- **FloatingBottomNav** — z-index coordination
- **ReservationModal** — Opens on offer card click

### File Structure

```
src/components/discover/
├── UnifiedDiscoverSheet.tsx (main)
├── DiscoverModeContent.tsx
├── PartnerModeContent.tsx
├── DiscoverSearchBar.tsx
├── DiscoverSortPills.tsx
├── DiscoverCategoryChips.tsx
├── DiscoverSectionList.tsx
├── DiscoverSection.tsx
├── OfferCard.tsx (compact, 2-col)
├── PartnerOfferCard.tsx (large, carousel)
├── PartnerHeader.tsx
├── PartnerInfoRow.tsx
├── EmptyState.tsx
└── types.ts
```

---

## State Machine Design

### States

```typescript
type SheetHeight = 'collapsed' | 'mid' | 'full';
type ContentMode = 'discover' | 'partner';

interface SheetState {
  height: SheetHeight;
  mode: ContentMode;
  partnerId: string | null;
  isOpen: boolean;
}
```

### Events & Transitions

| Current State | Event | Next State | Side Effects |
|---------------|-------|------------|--------------|
| `closed` | `OPEN_DISCOVER` | `collapsed, discover` | Fetch offers, animate in |
| `collapsed` | `DRAG_UP` | `mid` | Expand height |
| `mid` | `DRAG_UP` | `full` | Expand to full, dim map |
| `full` | `DRAG_DOWN` | `mid` | Shrink height |
| `mid` | `DRAG_DOWN` | `collapsed` | Shrink to peek |
| `collapsed` | `DRAG_DOWN` | `closed` | Close sheet |
| `any` | `CLOSE_SHEET` | `closed` | Reset state |
| `any` | `OPEN_PARTNER(id)` | `mid, partner` | Fetch partner offers |
| `partner` | `CLOSE_PARTNER` | `mid, discover` | Return to discover |
| `discover` | `APPLY_FILTERS` | `discover` | Re-filter offers |
| `discover` | `CLEAR_FILTERS` | `discover` | Reset filters |
| `discover` | `SEARCH_QUERY` | `discover` | Debounce, filter |

### State Machine Diagram (Text)

```
[CLOSED]
  ↓ (tap star button)
[COLLAPSED, DISCOVER]
  ↓ (swipe up)
[MID, DISCOVER]
  ↓ (swipe up)
[FULL, DISCOVER]
  ↓ (swipe down)
[MID, DISCOVER]
  ↓ (tap map pin)
[MID, PARTNER]
  ↓ (swipe up)
[FULL, PARTNER]
  ↓ (tap back)
[MID, DISCOVER]
```

---

## Discover Mode Content Spec

### Layout (Full-Screen, Top to Bottom)

```
┌─────────────────────────────────────┐
│  ═════ (drag handle)                │ ← 8px from top
├─────────────────────────────────────┤
│  Discover              [X]          │ ← Header row
├─────────────────────────────────────┤
│  🔍 Search deals, places...  [≡]   │ ← Search bar
├─────────────────────────────────────┤
│  ⭐ Recommended  📍 Nearest  💸... │ ← Sort pills (horizontal scroll)
├─────────────────────────────────────┤
│  ⭐ All  🍕 Restaurant  🍞 Bakery  │ ← Category chips
├─────────────────────────────────────┤
│  🔥 Trending Right Now              │ ← Section header
│  ┌────────┐ ┌────────┐              │
│  │ Offer1 │ │ Offer2 │              │ ← 2-col grid
│  └────────┘ └────────┘              │
│  ┌────────┐ ┌────────┐              │
│  │ Offer3 │ │ Offer4 │              │
│  └────────┘ └────────┘              │
├─────────────────────────────────────┤
│  ⏰ Closing Soon                     │
│  ┌────────┐ ┌────────┐              │
│  │ Offer5 │ │ Offer6 │              │
│  └────────┘ └────────┘              │
├─────────────────────────────────────┤
│  💸 Under 5 GEL                      │
│  ...                                 │
└─────────────────────────────────────┘
```

### 1. Header Row

- **Left:** "Discover" (bold, 18px)
- **Right:** Close (X) button (gray, tappable)
- **Height:** 48px
- **Border:** 1px border-bottom, gray-100

### 2. Search Bar (Sticky)

- **Input:**
  - Full-width rounded pill (999px radius)
  - Left icon: 🔍 (gray-400)
  - Placeholder: "Search deals, places, items…"
  - Height: 40px
  - Border: 1px gray-200, focus: orange-400
  
- **Filter Button:**
  - Right side, icon button (sliders icon)
  - Opens filter drawer/modal
  - Active state: orange background

- **Behavior:**
  - Debounce 300ms
  - Show autocomplete suggestions (optional)
  - Clear button (X) appears when typing

### 3. Sort Pills Row

Horizontal scrollable row, snap-scroll:

- **Pills:**
  - Recommended ⭐ (default active)
  - Nearest 📍
  - Cheapest 💸
  - Expiring Soon ⏳
  - Newly Added 🆕

- **Active pill:**
  - Background: `bg-gradient-to-r from-[#FF8A00] to-[#FF6B00]`
  - Text: white, bold
  - Shadow: `shadow-md shadow-orange-500/30`

- **Inactive pill:**
  - Background: gray-100
  - Text: gray-700
  - Hover: gray-200

- **Spacing:** 8px gap, 12px padding horizontal

### 4. Category Chips Row

Horizontal scrollable, snap-scroll:

- **Chips:**
  - All ⭐
  - Restaurant 🍕
  - Fast Food 🍔
  - Bakery 🥐
  - Dessert 🍰
  - Café ☕
  - Drinks 🥤
  - Grocery 🛒
  - Mini-market 🏪

- **Active chip:**
  - Orange pill background
  - Bold text
  - Scale 1.05

- **Design:**
  - 48px x 48px icon circle
  - 10px label below
  - 56px min-width

### 5. Sectioned Offer List

Each section:

- **Header:**
  - Emoji + Title (14px bold)
  - Example: "🔥 Trending Right Now"
  - Spacing: 16px margin-top

- **Grid:**
  - 2 columns
  - 8px gap
  - OfferCard component

**Sections (in order):**

1. **🔥 Trending Right Now** (top 6 offers)
2. **⏰ Closing Soon** (expires in < 2 hours)
3. **💸 Under 5 GEL** (price <= 5)
4. **🥐 Freshly Baked Today** (bakery, created today)
5. **⭐ Highly Rated Near You** (if ratings available)
6. **📍 All Offers** (complete list)

### 6. Offer Card (Compact, 2-Column)

**Layout:**
```
┌─────────────────┐
│ [   Image   ]   │ ← 4:3 aspect ratio
│  22h 30m  -42%  │ ← Badges (top overlay)
├─────────────────┤
│ Offer Title     │ ← Bold, 12px
│ Partner Name ⭐ │ ← Gray, 10px + rating
│ ₾5.00  ₾8.50    │ ← Price (orange + strikethrough)
│ 3 left          │ ← Stock (gray, 10px)
└─────────────────┘
```

**Content:**
- **Image:** Top, gradient overlay
- **Time badge:** Top-right, white pill (or red if < 5 min)
- **Discount badge:** Bottom-left, orange pill `-X%`
- **Distance badge:** Top-left, `📍 0.5 km` (if location known)
- **Title:** Bold, 2-line clamp
- **Partner:** Gray, 1-line clamp + rating star
- **Price:** Current (orange) + original (strikethrough)
- **Stock:** "X left" (gray)

### 7. Empty State

When no offers match filters:

```
    🙈
No offers match your filters

Try clearing filters or browsing what's nearby!

[Clear Filters]

─── Trending Near You ───
(fallback offers)
```

- **Emoji:** 48px size
- **Title:** 16px bold
- **Description:** 14px gray
- **Button:** Orange gradient, rounded-full
- **Fallback:** Show 4 trending offers

---

## Partner Mode Content Spec

### Layout (Full-Screen)

```
┌─────────────────────────────────────┐
│  ═════ (drag handle)                │
├─────────────────────────────────────┤
│  ← Bella's Bakery          [X]      │ ← Header
│  Saburtalo • Great picks here ✨    │
├─────────────────────────────────────┤
│  ⭐ 4.8 (240) • 0.4 km • 5 min     │ ← Info row
│  [View on map →]                    │
├─────────────────────────────────────┤
│  ┌─────────────────────────┐        │
│  │   Partner Offer Card 1  │        │ ← Carousel (swipeable)
│  │   [Large, full-width]   │        │
│  └─────────────────────────┘        │
│                                     │
│  • • • (pagination dots)            │
│                                     │
│  [See all 5 offers from this partner]│
└─────────────────────────────────────┘
```

### 1. Partner Header

- **Back button:** Left arrow (← returns to Discover Mode)
- **Partner name:** Bold, 18px
- **Area/District:** Gray, 14px
- **Tagline:** "Great picks here ✨" (playful, 12px gray)
- **Close button:** Right side (X)

### 2. Partner Info Row

- **Rating:** ⭐ 4.8 (240 reviews)
- **Distance:** 0.4 km
- **Walking time:** 5 min
- **"View on map" button:** Recenter map on partner

**Layout:** Horizontal, icon + text, 12px gray

### 3. Partner Offer Carousel

- **Cards:** Large, full-width (90% viewport width)
- **Swipeable:** Horizontal drag, snap-to-center
- **Pagination dots:** Bottom, orange active dot
- **Card design:**
  - Larger image (16:9 aspect)
  - Same badges (time, discount, distance)
  - Larger text (16px title, 14px partner)
  - "Reserve Now" button at bottom

**Behavior:**
- Swiping changes selected offer
- Map pin highlights current offer's location
- Tap card to open reservation modal

### 4. "See All Offers" Button

If partner has > 3 offers:
- Button: "See all 5 offers from this partner"
- Opens full list in Discover Mode with partner filter applied

---

## Wireframes (All States)

### 1. Discover Mode — Collapsed (Peek)

```
┌───────────────────────────────────┐
│ MAP WITH PINS (visible behind)    │
│                                   │
│ ┌─────────────────────────────┐ │
│ │  ═════                       │ │
│ │  ⭐ Explore Offers (24) →    │ │ ← Peek bar
│ │  ┌────────┐ ┌────────┐      │ │
│ │  │ Offer1 │ │ Offer2 │      │ │ ← First 2 offers visible
│ │  └────────┘ └────────┘      │ │
│ └─────────────────────────────┘ │
│                                   │
│ [Home] [♥] [★] [Profile] [Menu]  │ ← FloatingBottomNav
└───────────────────────────────────┘
```

**Height:** ~15vh  
**User action:** Tap anywhere on sheet → expands to mid

---

### 2. Discover Mode — Mid-Height

```
┌───────────────────────────────────┐
│ MAP (partially visible)           │
│ ┌─────────────────────────────┐ │
│ │  ═════                       │ │
│ │  Discover              [X]   │ │
│ │  🔍 Search...         [≡]    │ │
│ │  ⭐ Recommended  📍 Nearest  │ │
│ │  ⭐ All  🍕 Restaurant  🍞...│ │
│ │  🔥 Trending Right Now       │ │
│ │  ┌────────┐ ┌────────┐      │ │
│ │  │ Offer1 │ │ Offer2 │      │ │
│ │  └────────┘ └────────┘      │ │
│ │  ┌────────┐ ┌────────┐      │ │
│ │  │ Offer3 │ │ Offer4 │      │ │
│ │  └────────┘ └────────┘      │ │
│ └─────────────────────────────┘ │
│ [Home] [♥] [★] [Profile] [Menu]  │
└───────────────────────────────────┘
```

**Height:** ~50vh  
**User action:** Swipe up → full-screen, swipe down → collapsed

---

### 3. Discover Mode — Full-Screen

```
┌───────────────────────────────────┐
│  ═════                             │
│  Discover              [X]         │
│  🔍 Search deals...    [≡]        │
│  ⭐ Recommended  📍 Nearest  💸... │
│  ⭐ All  🍕 Restaurant  🍞 Bakery  │
│  🔥 Trending Right Now             │
│  ┌────────┐ ┌────────┐            │
│  │ Offer1 │ │ Offer2 │            │
│  └────────┘ └────────┘            │
│  ┌────────┐ ┌────────┐            │
│  │ Offer3 │ │ Offer4 │            │
│  └────────┘ └────────┘            │
│  ⏰ Closing Soon                   │
│  ┌────────┐ ┌────────┐            │
│  │ Offer5 │ │ Offer6 │            │
│  └────────┘ └────────┘            │
│  💸 Under 5 GEL                    │
│  ...                               │
│  (scrollable content)              │
│                                    │
└───────────────────────────────────┘
```

**Height:** ~85vh  
**Backdrop:** Dark overlay (40% opacity) on map  
**User action:** Swipe down → mid-height

---

### 4. Partner Mode — Mid-Height

```
┌───────────────────────────────────┐
│ MAP (partner pin highlighted)     │
│ ┌─────────────────────────────┐ │
│ │  ═════                       │ │
│ │  ← Bella's Bakery      [X]   │ │
│ │  Saburtalo • Great picks ✨  │ │
│ │  ⭐ 4.8 • 0.4 km • 5 min     │ │
│ │  [View on map →]             │ │
│ │  ┌───────────────────────┐  │ │
│ │  │   Partner Offer Card  │  │ │ ← First offer visible
│ │  │   [Large, full-width] │  │ │
│ │  └───────────────────────┘  │ │
│ │  • • ○ (dots)                │ │
│ └─────────────────────────────┘ │
│ [Home] [♥] [★] [Profile] [Menu]  │
└───────────────────────────────────┘
```

**Height:** ~50vh  
**Map:** Centered on partner pin, pin bounces

---

### 5. Partner Mode — Full-Screen (Carousel)

```
┌───────────────────────────────────┐
│  ═════                             │
│  ← Bella's Bakery          [X]     │
│  Saburtalo • Great picks here ✨   │
│  ⭐ 4.8 (240) • 0.4 km • 5 min    │
│  [View on map →]                   │
│                                    │
│  ┌─────────────────────────────┐  │
│  │                             │  │
│  │   Partner Offer Card 1      │  │
│  │   [Large image]             │  │
│  │   Croissant Bundle          │  │
│  │   ₾4.50 (was ₾8.00)         │  │
│  │   [Reserve Now]             │  │
│  │                             │  │
│  └─────────────────────────────┘  │
│  • • • (3 dots)                    │
│                                    │
│  [See all 5 offers from this...]  │
│                                    │
│  (swipe left/right for more)       │
└───────────────────────────────────┘
```

**Height:** ~85vh  
**Interaction:** Swipe left/right to navigate offers

---

### 6. Empty State (Discover Mode)

```
┌───────────────────────────────────┐
│  Discover              [X]         │
│  🔍 pizza              [≡]        │
│  ⭐ Recommended  📍 Nearest  💸... │
│  ⭐ All  🍕 Restaurant  🍞 Bakery  │
│                                    │
│           🙈                        │
│                                    │
│    No offers match your filters    │
│                                    │
│ Try clearing filters or browsing   │
│       what's nearby!               │
│                                    │
│      [Clear Filters]               │
│                                    │
│  ─── Trending Near You ───         │
│  ┌────────┐ ┌────────┐            │
│  │ Offer1 │ │ Offer2 │            │
│  └────────┘ └────────┘            │
└───────────────────────────────────┘
```

**Condition:** Search/filter returns 0 results  
**Fallback:** Show 4 trending offers

---

### 7. Reservation Modal Open (Over Sheet)

```
┌───────────────────────────────────┐
│ ┌─────────────────────────────┐ │
│ │ Reserve: Croissant Bundle   │ │ ← Modal (z-index 100)
│ │                             │ │
│ │ Pickup: Today 18:00-19:00   │ │
│ │ Price: ₾4.50 + 50 points    │ │
│ │                             │ │
│ │ [Cancel] [Confirm Reserve]  │ │
│ └─────────────────────────────┘ │
│                                   │
│ (sheet visible behind, blurred)   │
└───────────────────────────────────┘
```

**Interaction:** Sheet stays open but dims/blurs  
**On confirm:** Sheet closes, FloatingReservationCard appears

---

## High-Fidelity UI Specifications

### Visual Design Principles

- **Modern Minimalism:** Clean, uncluttered, generous whitespace
- **Cosmic Orange Accent:** `#FF8A00` → `#FF6B00` gradient
- **Soft Shadows:** Multiple layers for depth
- **Rounded Everything:** 12px - 24px border radius
- **Premium Typography:** SF Pro (iOS), Roboto (Android)

### Color Palette

```css
/* Primary */
--cosmic-orange-start: #FF8A00;
--cosmic-orange-end: #FF6B00;

/* Backgrounds */
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary: #F3F4F6;

/* Text */
--text-primary: #111827;
--text-secondary: #6B7280;
--text-tertiary: #9CA3AF;

/* Borders */
--border-light: #E5E7EB;
--border-medium: #D1D5DB;

/* Status Colors */
--success: #10B981;
--warning: #F59E0B;
--danger: #EF4444;
```

### Typography Scale

```css
/* Headers */
h1: 24px, bold, -0.5px letter-spacing
h2: 18px, bold, -0.3px
h3: 16px, bold, -0.2px

/* Body */
body: 14px, regular, 1.5 line-height
small: 12px, regular
tiny: 10px, medium
```

### Spacing System (8px grid)

```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
```

### Shadow System

```css
/* Card Shadow */
.shadow-card {
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06);
}

/* Sheet Shadow */
.shadow-sheet {
  box-shadow:
    0 -4px 6px -1px rgba(0, 0, 0, 0.1),
    0 -2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Elevated Shadow */
.shadow-elevated {
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Orange Glow */
.shadow-orange-glow {
  box-shadow: 0 8px 24px rgba(255, 107, 0, 0.3);
}
```

### Border Radius Scale

```css
--radius-sm: 8px;   /* Pills, badges */
--radius-md: 12px;  /* Cards */
--radius-lg: 16px;  /* Modals */
--radius-xl: 24px;  /* Sheet top */
--radius-full: 999px; /* Rounded pills */
```

---

### Discover Mode — Full-Screen UI Mockup

**Device:** iPhone 14 Pro (393 x 852)

```
┌─────────────────────────────────────┐
│ ═════                     8px top   │ ← Drag handle (gray-300, 36px x 4px)
│                                     │
│ Discover              [X]           │ ← Header (48px h, white bg, border-bottom)
│ 18px bold             gray-600      │
│                                     │
│ 🔍 Search deals...    [≡]          │ ← Search (40px h, rounded-full, border gray-200)
│ 14px placeholder      filter btn    │   Active filter: orange-50 bg
│                                     │
│ ⭐ Recommended 📍 Nearest 💸 Che..  │ ← Sort Pills (horizontal, snap-scroll)
│ orange gradient | gray-100          │   12px text, 8px gap
│                                     │
│ ⭐  🍕  🍞  🍰  ☕  🥤  🛒  🏪    │ ← Category Chips (48px circles)
│ All  Restaurant  Bakery  Dessert    │   10px labels, orange active
│                                     │
│ 🔥 Trending Right Now               │ ← Section Header (14px bold, 16px mt)
│                                     │
│ ┌──────────┐  ┌──────────┐         │ ← Offer Cards (2-col, 8px gap)
│ │[Image]   │  │[Image]   │         │   Aspect 4:3, rounded-xl
│ │22h 30m   │  │1h 15m    │         │   Time badge: white pill (tr)
│ │-42%      │  │-35%      │         │   Discount badge: orange pill (bl)
│ │─────────│  │─────────│         │
│ │Croissant │  │Pizza Sl.│         │   Title: 12px bold, 2-line clamp
│ │Bella's  ⭐│  │Joe's   ⭐│         │   Partner: 10px gray + rating
│ │₾4.50 ₾8  │  │₾3.20 ₾5 │         │   Price: orange + strikethrough
│ │3 left    │  │5 left    │         │   Stock: 10px gray
│ └──────────┘  └──────────┘         │
│ ┌──────────┐  ┌──────────┐         │
│ │[Image]   │  │[Image]   │         │
│ │5h 00m    │  │12h 30m   │         │
│ │...       │  │...       │         │
│ └──────────┘  └──────────┘         │
│                                     │
│ ⏰ Closing Soon                     │
│ ┌──────────┐  ┌──────────┐         │
│ │...       │  │...       │         │
│ └──────────┘  └──────────┘         │
│                                     │
│ 💸 Under 5 GEL                      │
│ ...                                 │
│                                     │
│ (scrollable, infinite)              │
│                                     │
│ ────── 96px bottom safe ──────      │
└─────────────────────────────────────┘
```

**Spacing:**
- Search bar: 12px horizontal padding
- Sort pills: 12px top, 12px horizontal
- Category chips: 16px top, 12px horizontal
- Section headers: 24px top, 12px horizontal
- Offer grid: 12px horizontal padding, 8px gap

**Colors:**
- Background: white (#FFFFFF)
- Header border: gray-100 (#F3F4F6)
- Drag handle: gray-300 (#D1D5DB)
- Section titles: gray-900 (#111827)
- Active pill: orange gradient (#FF8A00 → #FF6B00)

---

### Partner Mode — Full-Screen UI Mockup

```
┌─────────────────────────────────────┐
│ ═════                     8px top   │
│                                     │
│ ← Bella's Bakery          [X]       │ ← Header (← back btn, partner name)
│ gray-600 | 18px bold | gray-600     │
│ Saburtalo • Great picks here ✨     │ ← Subtitle (12px gray-500)
│                                     │
│ ⭐ 4.8 (240) • 0.4 km • 5 min      │ ← Info Row (12px gray-600)
│ [View on map →]                     │   Link button (orange text)
│                                     │
│ ┌───────────────────────────────┐  │ ← Partner Offer Card (full-width)
│ │                               │  │   90% viewport width
│ │   [Large Image 16:9]          │  │   Aspect 16:9, rounded-2xl
│ │   22h 30m         -42%        │  │   Badges: same as Discover
│ │                               │  │
│ │───────────────────────────────│  │
│ │   Croissant Bundle            │  │   16px bold title
│ │   Fresh croissants, pain...   │  │   14px gray description (2-line)
│ │                               │  │
│ │   ₾4.50        was ₾8.00      │  │   18px orange + 14px strikethrough
│ │   3 left                      │  │   12px gray stock
│ │                               │  │
│ │   [Reserve Now]               │  │   Orange gradient button (full-width)
│ │                               │  │
│ └───────────────────────────────┘  │
│                                     │
│ ● ○ ○                               │ ← Pagination dots (orange active)
│                                     │
│ [See all 5 offers from this part...]│ ← Link button (14px, gray-700)
│                                     │
│                                     │
│ (swipe left/right for more offers)  │
│                                     │
└─────────────────────────────────────┘
```

**Partner Offer Card:**
- Width: 90vw (centered)
- Padding: 16px
- Border radius: 16px
- Shadow: elevated (multi-layer)
- Background: white
- Gap between elements: 12px

**Reserve Button:**
- Height: 48px
- Background: orange gradient
- Text: white, 16px bold
- Border radius: 12px
- Shadow: orange glow on hover

---

## Animation Specifications

### Framer Motion Configuration

#### 1. Sheet Height Transitions

```tsx
const sheetVariants = {
  collapsed: {
    height: '15vh',
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
    },
  },
  mid: {
    height: '50vh',
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
    },
  },
  full: {
    height: '85vh',
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 250,
    },
  },
};
```

#### 2. Backdrop Overlay

```tsx
const backdropVariants = {
  hidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  visible: {
    opacity: 0.4,
    pointerEvents: 'auto',
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};
```

#### 3. Card Hover/Tap

```tsx
const cardVariants = {
  hover: {
    scale: 1.03,
    y: -4,
    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  tap: {
    scale: 0.97,
    transition: {
      duration: 0.1,
      ease: 'easeIn',
    },
  },
};
```

#### 4. Sheet Entrance (Initial Open)

```tsx
const sheetEntranceVariants = {
  hidden: {
    y: '100%',
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
      mass: 0.8,
    },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
};
```

#### 5. Drag Handle Pulse

```tsx
const dragHandleVariants = {
  idle: {
    scale: 1,
    opacity: 0.5,
  },
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
```

#### 6. Carousel Swipe (Partner Mode)

```tsx
const carouselVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  }),
};
```

#### 7. Map Pin Highlight (Synced with Card Scroll)

```tsx
// In MapView component
const highlightPin = (offerId: string) => {
  const marker = markers[offerId];
  if (marker) {
    // Bounce animation
    marker.setAnimation(google.maps.Animation.BOUNCE);
    
    // Stop after 1 second
    setTimeout(() => {
      marker.setAnimation(null);
    }, 1000);
    
    // Increase size
    marker.setIcon({
      ...marker.getIcon(),
      scale: 1.3,
    });
  }
};
```

### Animation Timing Guidelines

| Action | Duration | Easing | Notes |
|--------|----------|--------|-------|
| Sheet expand | 400ms | Spring (damping 30) | Feels snappy |
| Sheet collapse | 300ms | Spring (damping 25) | Slightly faster down |
| Card tap | 100ms | EaseIn | Instant feedback |
| Card hover | 200ms | EaseOut | Smooth lift |
| Carousel swipe | 350ms | Spring | Natural momentum |
| Backdrop fade | 300ms | EaseOut | Subtle transition |
| Search input debounce | 300ms | — | Prevents over-fetching |
| Pin bounce | 700ms | Bounce | Attention-grabbing |

---

## UX Writing & Copy

### Discover Mode

**Header:**
- Title: "Discover"
- Subtitle (collapsed): "Explore Offers (24)"

**Search:**
- Placeholder: "Search deals, places, items…"
- No results: "No matches found"
- Autocomplete: "Recent: [Pizza, Bakery, Coffee]"

**Sort Pills:**
- Recommended ⭐
- Nearest 📍
- Cheapest 💸
- Expiring Soon ⏳
- Newly Added 🆕

**Categories:**
- All ⭐
- Restaurant 🍕
- Fast Food 🍔
- Bakery 🥐
- Dessert 🍰
- Café ☕
- Drinks 🥤
- Grocery 🛒
- Mini-market 🏪
- Pharmacy 💊

**Section Headers:**
- 🔥 Trending Right Now
- ⏰ Closing Soon
- 💸 Under 5 GEL
- 🥐 Freshly Baked Today
- ⭐ Highly Rated Near You
- 📍 All Offers

**Empty State:**
- Emoji: 🙈
- Title: "No offers match your filters"
- Description: "Try clearing filters or browsing what's nearby!"
- Button: "Clear Filters"
- Fallback Header: "─── Trending Near You ───"

**Microcopy:**
- "Scroll to see more offers"
- "Tap a card to see details"
- "Pull down to refresh"
- "X offers found"
- "Updated 2 min ago"

---

### Partner Mode

**Header:**
- Back button: "←" (no text)
- Partner name: "Bella's Bakery"
- Subtitle: "Saburtalo • Great picks here ✨"

**Info Row:**
- Rating: "⭐ 4.8 (240 reviews)"
- Distance: "0.4 km"
- Walking time: "5 min walk"
- Button: "View on map →"

**Carousel:**
- Pagination: "• • ○" (dots)
- Stock: "3 left" or "Only 1 left!" (urgent)
- Button: "Reserve Now"

**Footer:**
- "See all 5 offers from this partner"

**Empty State:**
- Emoji: 😢
- Title: "No active offers"
- Description: "This partner has no offers right now. Check back later!"
- Button: "Browse Other Offers"

**Microcopy:**
- "Swipe to see more"
- "Offer X of Y"
- "Reserved 12 times today"
- "Pickup: Today 18:00-19:00"

---

### General Tone Guidelines

- **Friendly:** Use contractions (we'll, you'll, let's)
- **Encouraging:** Positive language ("Great choice!", "You saved ₾5!")
- **Simple:** Short sentences, clear actions
- **Playful but professional:** Emojis where appropriate, not excessive
- **Bilingual-ready:** Keep strings short for easy translation (English ↔ Georgian)

---

## Implementation Roadmap

### Phase 1: Core Sheet Component (Week 1)

- [ ] Create `UnifiedDiscoverSheet.tsx` with drag system
- [ ] Implement 3 height states (collapsed, mid, full)
- [ ] Add backdrop overlay
- [ ] Build drag handle with pulse animation
- [ ] Test drag physics on iOS/Android

### Phase 2: Discover Mode (Week 2)

- [ ] Build `DiscoverModeContent.tsx`
- [ ] Implement search bar with debounce
- [ ] Create sort pills component
- [ ] Create category chips component
- [ ] Build sectioned offer list logic
- [ ] Integrate offer cards
- [ ] Add empty state component

### Phase 3: Partner Mode (Week 3)

- [ ] Build `PartnerModeContent.tsx`
- [ ] Create partner header component
- [ ] Create partner info row
- [ ] Build partner offer carousel
- [ ] Implement swipe navigation
- [ ] Add pagination dots
- [ ] Integrate with map pin highlighting

### Phase 4: State Management (Week 4)

- [ ] Implement state machine
- [ ] Add mode switching logic
- [ ] Connect to data fetching (offers, partners)
- [ ] Add filter/sort/search logic
- [ ] Implement URL state sync (optional)
- [ ] Add localStorage for preferences

### Phase 5: Animations & Polish (Week 5)

- [ ] Add all Framer Motion variants
- [ ] Implement map sync (highlight pins on scroll)
- [ ] Add skeleton loaders
- [ ] Optimize scroll performance
- [ ] Add haptic feedback (iOS)
- [ ] Test on multiple devices

### Phase 6: Integration & Testing (Week 6)

- [ ] Integrate with existing `IndexRedesigned.tsx` (your main homepage)
- [ ] Connect to `FloatingStarButton`
- [ ] Connect to `FloatingBottomNav`
- [ ] Connect to `ReservationModal`
- [ ] Remove old `ExploreSheet` (or keep as fallback)
- [ ] E2E testing
- [ ] Performance profiling
- [ ] Accessibility audit

---

## Success Metrics

**User Engagement:**
- Average session time: +30%
- Offers viewed per session: +50%
- Search usage: +40%

**Conversion:**
- Click-through rate (offer card → reservation): +25%
- Reservation completion rate: +15%

**Technical:**
- First interaction time: < 100ms
- Scroll performance: 60 FPS
- Sheet animation: < 400ms
- Bundle size increase: < 50kb

---

## Appendix

### Related Documentation
- [EXPLORE_SHEET_DESIGN_REFERENCE.md](./EXPLORE_SHEET_DESIGN_REFERENCE.md)
- [FLOATING_BOTTOM_NAV_GUIDE.md](./FLOATING_BOTTOM_NAV_GUIDE.md)
- [POST_RESERVATION_COMPLETE.md](./POST_RESERVATION_COMPLETE.md)

### Design References
- Uber Eats (bottom sheet, search)
- Google Maps (explore, place sheet)
- Too Good To Go (offer browsing)
- Airbnb (listing cards, filters)
- Apple Wallet (card stack, animations)

### Technical Stack
- React 18
- TypeScript
- Framer Motion
- Tailwind CSS
- Google Maps API
- Supabase (data)

---

**Document Version:** 2.0  
**Last Updated:** December 1, 2025  
**Status:** Ready for Implementation

**Questions?** Contact: engineering@smartpick.ge
