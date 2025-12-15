# 📐 OfferSheet Spacing & Design Tokens - Quick Reference

## 🎨 Exact Measurements (Banana Style)

### Category Icons
```
Size: h-16 w-16 (64px × 64px)
Rounded: rounded-2xl (16px)
Gap: gap-3 (12px between icons)
Padding: px-4 (16px left/right)
Margin: mt-3 mb-3 (12px top/bottom)
Label: text-xs (12px), below icon, gap-2 (8px)
```

### Search Bar
```
Height: h-12 (48px)
Rounded: rounded-xl (12px)
Padding: pl-12 pr-4 (icon space left)
Margin: px-4 mb-4 (16px padding, 16px bottom)
Background: bg-gray-50 (unfocused)
Focus Ring: ring-2 ring-orange-400
```

### Flash Deal Card
```
Container: rounded-2xl (16px)
Shadow: 0 4px 20px rgba(0,0,0,0.06)
Gradient: from-amber-100 to-yellow-50
Padding: p-4 (16px all sides)
Layout: flex-row gap-4

Text Section:
  Title: text-base font-bold (16px)
  Subtitle: text-sm (14px)
  Price: text-2xl font-bold (24px)
  Old Price: text-sm line-through
  Product: text-sm (14px)

Image:
  Size: h-20 w-20 (80px × 80px)
  Rounded: rounded-xl (12px)
  Shadow: shadow-md
```

### Best Seller Cards
```
Width: w-[170px] (fixed)
Rounded: rounded-xl (12px)
Shadow: 0 4px 16px rgba(0,0,0,0.04)
Gap: gap-3 (12px between cards)

Image:
  Height: h-28 (112px)
  Object-fit: cover

Content:
  Padding: p-3 (12px)
  Title: text-sm font-semibold (14px)
  Price: text-base font-bold (16px)
  Icons: w-3.5 h-3.5 (14px)
  
Badge:
  Position: top-2 left-2
  Rounded: rounded-full
  Padding: px-2.5 py-1
  Text: text-xs font-bold
```

### Fresh Card (Gradient)
```
Container: rounded-2xl (16px)
Gradient: from-green-50 to-teal-50
Padding: p-4 (16px)
Layout: flex gap-4

Image:
  Size: h-14 w-14 (56px × 56px)
  Rounded: rounded-xl (12px)

Content:
  Title: text-sm font-semibold (14px)
  Price: text-base font-bold (16px)
  Badge: text-xs (12px)
```

### Grid Cards (All Offers)
```
Container: rounded-xl (12px)
Shadow: 0 4px 16px rgba(0,0,0,0.04)
Grid: grid-cols-2 gap-3 (12px gap)

Image:
  Height: h-24 (96px)
  Object-fit: cover

Content:
  Padding: p-3 (12px)
  Title: text-sm font-semibold, 2-line clamp
  Title Min Height: min-h-[2.5rem] (40px)
  Price: text-base font-bold (16px)
  Icons: w-3.5 h-3.5 (14px)
```

---

## 🎯 Spacing Rhythm System

### Vertical Spacing (Margins)
```
mb-6 (24px) - Between major sections
mb-4 (16px) - Between subsections
mb-2 (8px)  - Between elements
mb-1 (4px)  - Between tight elements
```

### Horizontal Spacing (Gaps)
```
gap-4 (16px) - Large elements
gap-3 (12px) - Cards in horizontal lists
gap-2 (8px)  - Medium elements
gap-1 (4px)  - Tight inline elements
```

### Padding Scale
```
p-4 (16px)   - Standard card padding
p-3 (12px)   - Compact card padding
p-2 (8px)    - Tight padding
px-4 (16px)  - Horizontal page padding
py-3 (12px)  - Vertical section padding
```

---

## 🌈 Color Tokens

### Category Backgrounds (Pastel)
```css
bg-orange-50   #fff7ed  /* Bakery */
bg-blue-50     #eff6ff  /* Dairy */
bg-amber-50    #fffbeb  /* Bread */
bg-yellow-50   #fefce8  /* Meals */
bg-green-50    #f0fdf4  /* Vegetables */
bg-red-50      #fef2f2  /* Meat */
bg-pink-50     #fdf2f8  /* Desserts */
bg-cyan-50     #ecfeff  /* Drinks */
bg-teal-50     #f0fdfa  /* Fish */
bg-lime-50     #f7fee7  /* Grocery */
bg-purple-50   #faf5ff  /* Alcohol */
```

### Brand Colors
```css
orange-500     #f97316  /* Primary accent */
orange-600     #ea580c  /* Hover state */
orange-400     #fb923c  /* Focus ring */
```

### Text Colors
```css
gray-900       #111827  /* Primary text */
gray-700       #374151  /* Secondary text */
gray-600       #4b5563  /* Tertiary text */
gray-500       #6b7280  /* Subtle text */
gray-400       #9ca3af  /* Placeholder text */
```

### Gradients
```css
/* Flash Deal */
from-amber-100 to-yellow-50

/* Fresh Card */
from-green-50 to-teal-50

/* Image Backgrounds */
from-orange-50 to-yellow-50
from-gray-50 to-gray-100
```

---

## 🎭 Shadow Tokens

### Soft Shadows (Key to banana aesthetic)
```css
/* Primary card shadow */
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);

/* Hero card shadow (Flash Deal) */
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);

/* Small element shadow */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

/* Sheet shadow */
box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);
```

### Tailwind Classes
```tsx
shadow-sm                                    // Subtle
shadow-[0_4px_16px_rgba(0,0,0,0.04)]       // Standard
shadow-[0_4px_20px_rgba(0,0,0,0.06)]       // Hero
```

---

## 🔤 Typography Scale

### Font Sizes
```
text-2xl  24px  Flash Deal price
text-xl   20px  (unused)
text-lg   18px  Section headers
text-base 16px  Card prices, body text
text-sm   14px  Card titles, labels
text-xs   12px  Badges, timestamps, icons
```

### Font Weights
```
font-bold      700  Prices, section headers
font-semibold  600  Card titles, names
font-medium    500  Category labels
font-normal    400  Body text
```

---

## 📏 Border Radius Scale

```
rounded-full   9999px  Badges, pills
rounded-2xl    16px    Large cards, Flash Deal
rounded-xl     12px    Medium cards, icons
rounded-lg     8px     Small elements, badges
rounded-md     6px     Tiny elements
```

---

## 🎬 Animation Specs

### Sheet Entrance
```tsx
duration: 0.3s (300ms)
easing: easeOut
transform: translateY(100% → 0)
opacity: 0 → 1
```

### Card Tap
```tsx
scale: 1 → 0.97
duration: instant (no transition)
```

### Stagger Animation
```tsx
// Best Sellers
delay: idx * 0.05  (50ms per card)

// Grid Cards
delay: idx * 0.02  (20ms per card)
```

### Backdrop Fade
```tsx
duration: 0.3s
opacity: 0 → 0.2
easing: easeOut
```

---

## 📱 Responsive Breakpoints

### Sheet Height
```
Mobile: 90vh (90% of viewport)
Max Height: calc(100vh - 68px)  // 68px = bottom nav
```

### Content Width
```
Max Width: 480px (centered)
Min Width: 360px (supported)
```

### Grid Layout
```
All Screens: 2 columns (grid-cols-2)
Gap: 12px (gap-3)
Card Min Width: 150px
```

### Horizontal Scroll
```
Category Icons: Shows ~5 icons
Best Sellers: Shows 2.2 cards (encourages scroll)
```

---

## 🎨 Component Quick Copy

### Section Header
```tsx
<h2 className="px-4 text-lg font-semibold text-gray-900 mb-2">
  Section Title
</h2>
```

### Category Icon
```tsx
<div className="h-16 w-16 rounded-2xl bg-orange-50 flex items-center justify-center">
  <span className="text-3xl">🥐</span>
</div>
<span className="text-xs font-medium text-gray-700">Bakery</span>
```

### Search Input
```tsx
<input
  className="w-full h-12 pl-12 pr-4 bg-gray-50 rounded-xl 
             text-sm text-gray-900 placeholder:text-gray-400 
             focus:outline-none focus:ring-2 focus:ring-orange-400 
             focus:bg-white transition-all"
  placeholder="Search offers..."
/>
```

### Flash Deal Container
```tsx
<div className="rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] 
                bg-gradient-to-b from-amber-100 to-yellow-50 p-4 
                flex flex-row items-center gap-4">
  {/* Content */}
</div>
```

### Best Seller Card
```tsx
<div className="w-[170px] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] 
                overflow-hidden bg-white">
  <div className="h-28 bg-gradient-to-br from-orange-50 to-yellow-50">
    <img className="w-full h-full object-cover" />
  </div>
  <div className="p-3">
    {/* Content */}
  </div>
</div>
```

### Grid Card
```tsx
<div className="rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] 
                overflow-hidden bg-white">
  <div className="h-24 bg-gradient-to-br from-gray-50 to-gray-100">
    <img className="w-full h-full object-cover" />
  </div>
  <div className="p-3">
    {/* Content */}
  </div>
</div>
```

### Discount Badge
```tsx
<div className="absolute top-2 left-2 bg-orange-500 text-white 
                text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
  -40%
</div>
```

---

## ✅ Design Checklist

Use this when implementing:

- [ ] Category icons are exactly `h-16 w-16` (not 60px or 72px)
- [ ] Search bar is exactly `h-12` (not h-10 or h-14)
- [ ] Flash Deal image is exactly `h-20 w-20` (80px × 80px)
- [ ] Best Seller cards are exactly `w-[170px]` (not 160px or 180px)
- [ ] Best Seller images are exactly `h-28` (112px height)
- [ ] Grid card images are exactly `h-24` (96px height)
- [ ] All cards use soft shadow: `0 4px 16px rgba(0,0,0,0.04)`
- [ ] Flash Deal uses hero shadow: `0 4px 20px rgba(0,0,0,0.06)`
- [ ] Animation is exactly `300ms ease-out` (not spring)
- [ ] Sheet max height is `calc(100vh - 68px)` (bottom nav clearance)
- [ ] Content has `pb-24` at bottom (96px safe area)
- [ ] Horizontal lists use `gap-3` (12px)
- [ ] Grid uses `gap-3` (12px, not 8px or 16px)
- [ ] Section headers are `text-lg font-semibold` (18px)
- [ ] Card titles are `text-sm font-semibold` (14px)
- [ ] Prices are `text-base font-bold` (16px) or `text-2xl` (Flash Deal)
- [ ] All rounded corners use `xl` or `2xl` (12px or 16px)
- [ ] Category labels are below icons (not inside)
- [ ] Flash Deal has gradient background (not split sections)
- [ ] All badges are `rounded-full` (not rounded-lg)
- [ ] Distance/time icons are `w-3.5 h-3.5` (14px)

---

## 🎯 Visual Comparison

### Before vs After

| Element | Before | After (Banana Style) |
|---------|--------|---------------------|
| Category Size | 60px | **64px (h-16 w-16)** |
| Search Height | 40px | **48px (h-12)** |
| Flash Deal Image | 80px | **80px (h-20 w-20)** ✓ |
| Best Seller Width | 160px | **170px** |
| Best Seller Image | 110px | **112px (h-28)** |
| Grid Image | 90px | **96px (h-24)** |
| Shadow | `shadow-md` | **`0 4px 16px rgba(0,0,0,0.04)`** |
| Animation | Spring (lag) | **Tween 300ms ease-out** |
| Spacing | Mixed | **Strict 8pt grid** |

---

## 📦 Export for Designers

If working with Figma/Sketch:

```
Font Family: Inter
Font Weights: 400 (Regular), 500 (Medium), 600 (Semi-bold), 700 (Bold)

Spacing Scale: 4, 8, 12, 16, 24, 32, 48, 64
Corner Radius: 8, 12, 16, 24, 9999
Shadow Blur: 8, 12, 16, 20
Shadow Opacity: 4%, 6%, 8%

Grid System: 8pt base
Columns: 2 (mobile), 12 (desktop)
Gutter: 12px
Margin: 16px

Color System: Tailwind CSS default
Primary: Orange 500 (#f97316)
```

---

**Last Updated**: December 2, 2025  
**Component**: `src/components/discover/OffersSheet.tsx`  
**Status**: ✅ Production Ready
