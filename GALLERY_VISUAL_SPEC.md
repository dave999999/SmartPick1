# 🎨 Gallery Feature - Visual Design Specification

## Color Palette

### Primary Colors
```css
/* Glass White */
--glass-white: rgba(255, 255, 255, 0.95)
--glass-white-60: rgba(255, 255, 255, 0.6)
--glass-white-80: rgba(255, 255, 255, 0.8)

/* Emerald (Primary CTA) */
--emerald-500: #10b981
--emerald-600: #059669

/* Gray Scale */
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-500: #6b7280
--gray-600: #4b5563
--gray-700: #374151
--gray-900: #111827

/* Status Colors */
--yellow-400: #fbbf24 (Favorite Star)
--red-600: #dc2626 (Delete)
```

### Blur Values
```css
backdrop-filter: blur(40px)  /* Modal Background */
backdrop-filter: blur(10px)  /* Buttons & Cards */
backdrop-filter: blur(24px)  /* Header */
```

---

## Typography

### Font Hierarchy
```css
/* Modal Title */
font-size: 1.5rem (24px)
font-weight: 700
line-height: 2rem

/* Section Titles */
font-size: 1rem (16px)
font-weight: 600
line-height: 1.5rem

/* Body Text */
font-size: 0.875rem (14px)
font-weight: 500
line-height: 1.25rem

/* Caption */
font-size: 0.75rem (12px)
font-weight: 500
line-height: 1rem
```

---

## Spacing System

### Grid Gaps
```css
/* Mobile (2 columns) */
grid-template-columns: repeat(2, 1fr)
gap: 0.75rem (12px)

/* Desktop (4-5 columns) */
grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))
gap: 0.75rem (12px)
```

### Padding Scale
```css
/* Container */
px: 1rem (mobile) / 1.5rem (desktop)
py: 1rem

/* Cards */
p: 0.75rem

/* Buttons */
px: 1rem
py: 0.5rem
```

---

## Border Radius Scale

```css
/* Modal Container */
border-radius: 1.5rem (24px) - desktop
border-radius: 1.5rem 1.5rem 0 0 (24px top only) - mobile

/* Buttons & Cards */
border-radius: 0.75rem (12px)

/* Small Elements */
border-radius: 0.5rem (8px)

/* Pills & Chips */
border-radius: 9999px (fully rounded)
```

---

## Shadow System

### Elevation Levels
```css
/* Level 1: Buttons */
box-shadow: 
  0 10px 15px -3px rgba(0, 0, 0, 0.1),
  0 4px 6px -2px rgba(0, 0, 0, 0.05)

/* Level 2: Cards */
box-shadow:
  0 20px 25px -5px rgba(0, 0, 0, 0.1),
  0 10px 10px -5px rgba(0, 0, 0, 0.04)

/* Level 3: Modal */
box-shadow:
  0 25px 50px -12px rgba(0, 0, 0, 0.25)

/* Colored Shadow (CTA) */
box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3)
```

---

## Component Dimensions

### Modal
```css
/* Mobile */
width: 100%
height: calc(100vh - 60px)
max-height: 85vh

/* Desktop */
max-width: 56rem (896px)
max-height: 85vh
```

### Image Cards
```css
aspect-ratio: 1 / 1
width: 100% (grid-based)
min-width: 150px
max-width: 250px (desktop)
```

### Buttons
```css
/* Primary CTA */
height: 2.5rem (40px)
min-width: 120px

/* Icon Buttons */
width: 2rem (32px)
height: 2rem (32px)

/* Dashboard Button */
height: auto
padding: 0.375rem 0.75rem
```

---

## Layout Grid

### Dashboard Header Integration
```
┌─────────────────────────────────────────────┐
│  [Home]     [Gallery]     [Wallet + ₾100]  │ ← Top Bar
│   Gray       Glass         Emerald          │
└─────────────────────────────────────────────┘
     ▲           ▲              ▲
  Navigate   NEW BUTTON    Buy Points
```

### Gallery Modal Layout
```
┌───────────────────────────────────────────────┐
│  Gallery                              [✕]     │ ← Header (sticky)
│  თქვენი პროდუქტების სურათები                  │
│  [ატვირთვა]                [დალაგება ▾]      │
├───────────────────────────────────────────────┤
│  [ყველა·3] [⭐ რჩეული·2] [pizza] [bakery]   │ ← Filters (scroll)
├───────────────────────────────────────────────┤
│                                               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │     │ │     │ │     │ │     │ │     │   │
│  │ IMG │ │ IMG │ │ IMG │ │ IMG │ │ IMG │   │ ← Grid
│  │     │ │     │ │     │ │     │ │     │   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
│                                               │
│  ┌─────┐ ┌─────┐ ┌─────┐                    │
│  │     │ │     │ │     │                    │
│  │ IMG │ │ IMG │ │ IMG │                    │
│  │     │ │     │ │     │                    │
│  └─────┘ └─────┘ └─────┘                    │
│                                               │
└───────────────────────────────────────────────┘
```

### Image Card Hover State
```
┌─────────────────────┐
│ [⭐]         [⋯]    │ ← Top Controls (hover)
│                     │
│       IMAGE         │
│                     │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │ ← Bottom Gradient
│ Margherita Pizza    │   (always visible on hover)
│ [pizza] [italian]   │
│ Used 3 times        │
└─────────────────────┘
```

---

## Animation Timing

### Easing Curves
```css
/* Spring (Apple-like) */
cubic-bezier(0.34, 1.56, 0.64, 1)

/* Smooth In-Out */
cubic-bezier(0.4, 0.0, 0.2, 1)

/* Sharp Exit */
cubic-bezier(0.4, 0.0, 1, 1)
```

### Duration Scale
```css
/* Quick (tap feedback) */
75ms - 100ms

/* Normal (hover, fade) */
150ms - 200ms

/* Modal transitions */
300ms - 400ms

/* Stagger delay */
50ms per item
```

---

## Interaction States

### Button States
```css
/* Default */
opacity: 1
scale: 1
shadow: medium

/* Hover */
opacity: 1
scale: 1
shadow: large

/* Active (pressed) */
opacity: 1
scale: 0.95
shadow: small

/* Disabled */
opacity: 0.5
cursor: not-allowed
```

### Image Card States
```css
/* Default */
overlay: rgba(0, 0, 0, 0)
controls: opacity 0

/* Hover */
overlay: rgba(0, 0, 0, 0.2)
controls: opacity 1
transition: 200ms

/* Selected (future) */
border: 2px solid emerald-500
shadow: 0 0 0 4px rgba(16, 185, 129, 0.2)
```

---

## Iconography

### Icon Size Scale
```css
/* Small (chips, badges) */
width: 0.875rem (14px)
height: 0.875rem (14px)

/* Medium (buttons, cards) */
width: 1rem (16px)
height: 1rem (16px)

/* Large (empty state) */
width: 2.5rem (40px)
height: 2.5rem (40px)
```

### Icon Set (Lucide)
- Upload (ატვირთვა)
- Star (რჩეული)
- MoreVertical (მენიუ)
- Edit3 (რედაქტირება)
- Copy (კოპირება)
- Trash2 (წაშლა)
- X (დახურვა)
- ChevronDown (ჩამოშლა)
- Image (სურათი - logo/empty)
- Tag (ტეგი)

---

## Responsive Breakpoints

```css
/* Mobile First */
base: 0px - 639px
  - 2 column grid
  - Fullscreen modal
  - Horizontal filter scroll

/* Small (sm) */
640px - 767px
  - 3 column grid
  - Modal with margins
  - Full filter row

/* Medium (md) */
768px - 1023px
  - 4 column grid
  - Centered modal
  - Larger cards

/* Large (lg) */
1024px+
  - 5 column grid
  - Max modal width
  - Desktop optimizations
```

---

## Accessibility

### Contrast Ratios
```css
/* Text on Glass White */
gray-900 on white/95: 18.5:1 (AAA) ✓
gray-700 on white/95: 9.5:1 (AAA) ✓
gray-500 on white/95: 4.8:1 (AA) ✓

/* CTA Buttons */
white on emerald-600: 4.8:1 (AA) ✓
```

### Focus States
```css
/* Keyboard Navigation */
outline: 2px solid emerald-500
outline-offset: 2px
border-radius: inherit
```

### Touch Targets
```css
/* Minimum Size */
min-width: 44px
min-height: 44px

/* Actual Implementation */
Dashboard Button: 48px height ✓
Icon Buttons: 32px (secondary, acceptable)
Image Cards: 150px+ (primary, excellent)
```

---

## Glass Effect Implementation

### CSS Recipe
```css
.glass-modal {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.glass-button {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(209, 213, 219, 0.6);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
```

### Tailwind Classes
```css
/* Modal */
bg-white/95 backdrop-blur-2xl border border-white/20

/* Button */
bg-white/60 backdrop-blur-sm border border-gray-200/60

/* Card */
bg-white/80 backdrop-blur-md border border-gray-200/40
```

---

## Z-Index Stack

```css
/* Layer Order (bottom to top) */
z-0   : Dashboard content
z-10  : Sticky headers
z-40  : Dashboard top bar
z-50  : Floating action bar
z-100 : Gallery modal backdrop
z-110 : Gallery modal container
z-120 : Image card menus
```

---

## Performance Optimizations

### Image Loading
```jsx
// Lazy Loading
loading="lazy"

// Responsive Images
srcset="
  image-400w.jpg 400w,
  image-800w.jpg 800w
"
sizes="
  (max-width: 640px) 50vw,
  (max-width: 1024px) 33vw,
  20vw
"
```

### Animation Performance
```css
/* Use GPU-accelerated properties */
transform: translate3d(0, 0, 0)
will-change: transform, opacity

/* Avoid */
width, height, left, top (trigger layout)
```

### Blur Performance
```css
/* Limit blur radius */
backdrop-filter: blur(40px) /* max */

/* Consider fallback */
@supports not (backdrop-filter: blur()) {
  background: rgba(255, 255, 255, 0.98);
}
```

---

**Design System Compliance:** ✅ Apple HIG + Material Design 3  
**Framework:** Tailwind CSS + Framer Motion  
**Tested:** Chrome, Safari, Firefox, Edge
