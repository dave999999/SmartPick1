# 🎯 SmartPick Offers Sheet - Visual Structure Reference

## Complete Layout Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                  OFFERS SHEET                       │
│  (Bottom Sheet Modal - 90vh height)                 │
│  bg: #FAFAFA, rounded-t-[28px]                      │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ HEADER (bg-white, px-4, pt-safe+16)           │ │
│  │                                               │ │
│  │  Discover Deals                               │ │
│  │  (28px, semibold, #1A1A1A, -0.5px)            │ │
│  │                                               │ │
│  │  📍 Egusi soup                                 │ │
│  │  (13px, regular, #8E8E8E)                     │ │
│  │                                               │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │ 🔍 Enter dish name... ............ 🎙   │ │ │
│  │  │ Search Bar (h-11, rounded-xl)            │ │ │
│  │  │ bg-[#F5F5F5], focus:bg-white             │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ CATEGORY ROW (bg-white, pb-5)                 │ │
│  │                                               │ │
│  │  ⟨ 🍔 ═ 🍕 ═ 🍰 ═ 🥤 ═ 🍲 ═ 🥗 ═ 🍨 ═ 🥙 ⟩   │ │
│  │    │   │   │   │   │   │   │   │             │ │
│  │   Meals Sides Snacks Drinks ...              │ │
│  │   (80×72 pills, 12px gap)                    │ │
│  │                                               │ │
│  │   Selected: bg-[#FF6B35], text-white         │ │
│  │   Unselected: bg-[#F5F5F5], text-[#6B6B6B]   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ CONTENT AREA (px-4, pt-6, pb-24)              │ │
│  │ bg-[#FAFAFA]                                  │ │
│  │                                               │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │ TODAY'S SPECIAL OFFER                    │ │ │
│  │  │ (18px, semibold) .... SEE FULL MENU >    │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  │                                               │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │ FEATURED CARD (bg-white, rounded-2xl)    │ │ │
│  │  │ shadow: 0 2px 8px rgba(0,0,0,0.06)       │ │ │
│  │  │                                          │ │ │
│  │  │  ┌──────┐  Yummies Special Burger       │ │ │
│  │  │  │      │  Now                           │ │ │
│  │  │  │ 140× │  ₦1,800  [15% off]            │ │ │
│  │  │  │ 140px│  ₦2,000                         │ │ │
│  │  │  │      │                                │ │ │
│  │  │  └──────┘  [Add to Cart]                 │ │ │
│  │  │             (full-width orange btn)      │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  │                                               │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │ POPULAR NOW                              │ │ │
│  │  │ (18px, semibold) .... SEE FULL MENU >    │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  │                                               │ │
│  │  ⟨─────────────────────────────────────────⟩  │ │
│  │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │ │
│  │   │      │ │      │ │      │ │      │       │ │
│  │   │ 110× │ │ 110× │ │ 110× │ │ 110× │ ...   │ │
│  │   │ 110  │ │ 110  │ │ 110  │ │ 110  │       │ │
│  │   │      │ │      │ │      │ │      │       │ │
│  │   │ Beef │ │Spicy │ │Veg   │ │Ice   │       │ │
│  │   │Salad │ │Nood  │ │Soup  │ │Cream │       │ │
│  │   │₦1,200│ │₦1,500│ │₦900  │ │₦500  │       │ │
│  │   └──────┘ └──────┘ └──────┘ └──────┘       │ │
│  │   (Horizontal scroll with snap points)       │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Component Measurements

### Sheet Container
- **Height**: 90vh
- **Border Radius**: 28px (top only)
- **Background**: #FAFAFA
- **Padding**: None (children handle spacing)

### Header Section
- **Padding**: 16px (horizontal), pt-safe+16 (top)
- **Background**: white
- **Title**: 28px / 600 / -0.5px / #1A1A1A
- **Location**: 13px / 400 / #8E8E8E
- **Search Height**: 44px
- **Search Radius**: 12px (xl)

### Category Pills
- **Pill Size**: 80w × 72h
- **Gap**: 12px between pills
- **Padding**: 4px horizontal scroll container
- **Icon Size**: 24px (w-6 h-6)
- **Text Size**: 11px / 500
- **Border Radius**: 16px (2xl)

### Featured Card
- **Container**: Full width - 32px (16px padding each side)
- **Padding**: 16px (4 units)
- **Border Radius**: 16px (2xl)
- **Shadow**: 0 2px 8px rgba(0,0,0,0.06)
- **Image**: 140 × 140px, rounded-xl (12px)
- **Gap**: 16px between image and details
- **Button Height**: 36px
- **Button Radius**: 8px (lg)

### Popular Cards
- **Card Width**: 110px (fixed)
- **Card Height**: ~160px (auto from content)
- **Image**: 110 × 110px (square)
- **Gap**: 12px between cards
- **Padding**: 12px inside card
- **Border Radius**: 16px (2xl)
- **Shadow**: 0 2px 8px rgba(0,0,0,0.06)

## Color Palette - Complete Reference

```css
/* Primary Colors */
--sp-orange-primary:    #FF6B35;
--sp-orange-hover:      #FF8555;
--sp-orange-pressed:    #E55A2B;
--sp-orange-soft:       #FFF4F0;

/* Neutrals */
--sp-black:             #1A1A1A;  /* Headers */
--sp-gray-dark:         #4A4A4A;  /* Body text */
--sp-gray-medium:       #6B6B6B;  /* Inactive category text */
--sp-gray-light:        #8E8E8E;  /* Captions, location */
--sp-gray-border:       #E8E8E8;  /* Search border */
--sp-gray-bg:           #F5F5F5;  /* Search bg, category pills */
--sp-gray-page:         #FAFAFA;  /* Page background */
--sp-white:             #FFFFFF;  /* Cards, header */

/* Semantic */
--sp-discount-green:    #34C759;
--sp-error-red:         #FF3B30;

/* Shadows */
--sp-shadow-card:       0 2px 8px rgba(0,0,0,0.06);
--sp-shadow-card-hover: 0 4px 16px rgba(0,0,0,0.1);
--sp-shadow-orange:     0 2px 8px rgba(255,107,53,0.3);
```

## Typography - Complete Scale

```typescript
{
  // Headers
  h1: '28px / 600 / -0.5px / 34px',  // Discover Deals
  h2: '18px / 600 / -0.2px / 24px',  // Section titles
  
  // Cards
  cardTitle: '16px / 600 / 0px / 20px',    // Featured card title
  cardSmall: '13px / 600 / 0px / 16px',    // Popular card title
  
  // Body
  body: '15px / 400 / 0px / 20px',         // Search placeholder
  caption: '13px / 400 / 0px / 16px',      // Location, "Now"
  small: '11px / 500 / 0px / 14px',        // Category labels
  
  // Prices
  priceLarge: '20px / 600 / 0px / 24px',   // Featured price
  priceSmall: '15px / 600 / 0px / 20px',   // Popular price
  priceOld: '13px / 400 / 0px / 16px',     // Strikethrough
  
  // Buttons
  button: '14px / 500 / 0px / 18px',       // Add to Cart
  link: '13px / 500 / 0px / 16px',         // SEE FULL MENU
}
```

## Spacing System - 4-Point Grid

```
2   →   4px    (.5 unit)
4   →   8px    (1 unit)   - Tiny gaps
6   →   12px   (1.5 units) - Card gaps, pill gaps
8   →   16px   (2 units)   - Standard padding
10  →   20px   (2.5 units) - Section spacing
12  →   24px   (3 units)   - Large section gaps
16  →   32px   (4 units)   - Major sections
20  →   40px   (5 units)   - Page padding
```

## Animation Timings

```javascript
{
  instant:    '150ms',  // Button press feedback
  quick:      '200ms',  // Category switch
  smooth:     '300ms',  // Sheet open/close
  bounce:     '400ms',  // Heart animation
  scroll:     '600ms',  // Smooth scroll behavior
  
  easing: {
    spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
    ease:     'cubic-bezier(0.4, 0, 0.2, 1)',
    smooth:   'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  }
}
```

## Interaction States

### Category Pill
```css
/* Unselected */
bg: #F5F5F5
text: #6B6B6B
icon: #6B6B6B
shadow: none

/* Selected */
bg: #FF6B35
text: #FFFFFF
icon: #FFFFFF
shadow: 0 2px 8px rgba(255,107,53,0.3)

/* Active (pressed) */
transform: scale(0.95)
transition: 200ms spring
```

### Featured Card
```css
/* Idle */
transform: scale(1)
shadow: 0 2px 8px rgba(0,0,0,0.06)

/* Active (pressed) */
transform: scale(0.98)
transition: 200ms ease
```

### Add to Cart Button
```css
/* Idle */
bg: #FF6B35
transform: scale(1)

/* Hover (desktop) */
bg: #FF8555
transform: scale(1.02)

/* Active (pressed) */
bg: #E55A2B
transform: scale(0.98)
```

### Favorite Heart
```css
/* Unfavorited */
fill: transparent
stroke: #8E8E8E
transform: scale(1)

/* Favorited */
fill: #FF6B35
stroke: #FF6B35
transform: scale(1.2) → scale(1)
transition: 400ms bounce
```

## Responsive Breakpoints

```css
/* Extra Small - iPhone SE */
@media (max-width: 374px) {
  --card-gap: 8px;
  --pill-width: 72px;
  --featured-image: 120px;
}

/* Small - iPhone 12/13/14 */
@media (min-width: 375px) {
  --card-gap: 12px;
  --pill-width: 80px;
  --featured-image: 140px;
}

/* Medium - iPhone Pro Max */
@media (min-width: 428px) {
  --card-gap: 16px;
  --pill-width: 88px;
  --featured-image: 160px;
}
```

## Safe Area Support (iOS)

```css
/* Top safe area (notch) */
.pt-safe {
  padding-top: max(1rem, env(safe-area-inset-top));
}

/* Bottom safe area (home indicator) */
.pb-safe {
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
}

/* Full safe area */
.h-screen-safe {
  height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
}
```

---

## Quick Copy-Paste Snippets

### Orange Button
```tsx
<button className="px-6 py-3 bg-[#FF6B35] hover:bg-[#FF8555] active:bg-[#E55A2B] 
                   text-white text-[15px] font-semibold rounded-full 
                   shadow-lg transition-all active:scale-95">
  Button Text
</button>
```

### Search Bar
```tsx
<div className="relative flex items-center h-11 bg-[#F5F5F5] rounded-xl 
                border border-[#E8E8E8] focus-within:border-[#FF6B35] focus-within:bg-white">
  <Search className="absolute left-3 w-4 h-4 text-[#8E8E8E]" />
  <input 
    type="text"
    placeholder="Enter a dish name..."
    className="flex-1 px-10 text-[15px] bg-transparent outline-none 
               placeholder:text-[#8E8E8E]"
  />
  <Mic className="absolute right-3 w-4 h-4 text-[#8E8E8E]" />
</div>
```

### Category Pill (Selected)
```tsx
<button className="w-20 h-[72px] rounded-2xl bg-[#FF6B35] 
                   shadow-[0_2px_8px_rgba(255,107,53,0.3)]
                   flex flex-col items-center justify-center gap-1.5
                   active:scale-95 transition-all">
  <Icon className="w-6 h-6 text-white" />
  <span className="text-[11px] font-medium text-white">Label</span>
</button>
```

### Card Shadow
```css
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
```

### Orange Shadow
```css
box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
```

---

*Reference guide for pixel-perfect implementation • December 4, 2025*
