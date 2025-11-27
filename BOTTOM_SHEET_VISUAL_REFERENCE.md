# SmartPick Bottom Sheet - Visual Reference

## 📱 Complete UI Structure (ASCII Mockup)

```
┌─────────────────────────────────────────┐
│                                         │
│         BACKGROUND (DIMMED)             │ ← Overlay: opacity 0.3-0.6
│                                         │   Tap to close/collapse
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ ─────  (Drag Handle)              │  │ ← 10px wide, gray-300
│  ├───────────────────────────────────┤  │
│  │  ←  Product Name Here  →  ✕      │  │ ← Sticky Header (48px)
│  ├───────────────────────────────────┤  │   Blurred when expanded
│  │                                   │  │
│  │   [FULL-WIDTH IMAGE]              │  │ ← 180px (collapsed)
│  │    180-220px height               │  │   220px (expanded)
│  │                                   │  │   Gradient overlay
│  │    (Gradient overlay at bottom)  │  │
│  ├───────────────────────────────────┤  │
│  │                                   │  │
│  │  Product Title       ⏰ 2h 30m   │  │ ← 18px semibold
│  │  Ready for pickup. Limited.      │  │   Time badge (green)
│  │                                   │  │
│  │  ─── COLLAPSED STATE (45%) ───   │  │
│  │  Shows: Image + Title + Badge    │  │
│  │  Hidden: All details below       │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │  🪙 Your Balance: 210 Pts   │ │  │ ← Small pill
│  │  └─────────────────────────────┘ │  │
│  │                                   │  │
│  │  PICKUP PRICE TODAY               │  │ ← 12px uppercase
│  │  4.00 GEL                         │  │ ← 30px bold green
│  │  Original Price: ~10.00 GEL~     │  │   14px line-through
│  │                                   │  │
│  │  ╔═════════════════════════════╗ │  │
│  │  ║  ✨ Reservation Cost        ║ │  │ ← MAIN BLOCK
│  │  ║                             ║ │  │   Orange gradient
│  │  ║         5                   ║ │  │   48px bold
│  │  ║                             ║ │  │   Visually dominant
│  │  ║       Points                ║ │  │
│  │  ║  ─────────────────────────  ║ │  │
│  │  ║  Reserving costs points.   ║ │  │
│  │  ║  Payment at pickup.        ║ │  │
│  │  ╚═════════════════════════════╝ │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐ │  │
│  │  │   [ - ]    5    [ + ]       │ │  │ ← Quantity (44×44px)
│  │  │         MAX 10              │ │  │   Integrated MAX
│  │  └─────────────────────────────┘ │  │
│  │                                   │  │
│  │  ┌───────────────────────────┐   │  │
│  │  │ 🪙 Reserve This Deal      │   │  │ ← CTA Button (52px)
│  │  └───────────────────────────┘   │  │   Orange #F97316
│  │  Reservation held for 1 hour     │  │
│  │                                   │  │
│  │        ^ Swipe up for details    │  │ ← Prompt (collapsed)
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎬 State Transitions

### Collapsed State (45vh)
```
┌─────────────────┐
│  ─────          │ ← Handle
│  ← Title →  ✕  │ ← Header
│                 │
│  [Image 180px]  │ ← Image
│                 │
│  Product Title  │ ← Title visible
│  ⏰ Time badge  │
│                 │
│  ^ Swipe up     │ ← Prompt
└─────────────────┘
     ↓ Swipe up
```

### Expanded State (92vh)
```
┌─────────────────┐
│  ─────          │ ← Handle
│  ← Title →  ✕  │ ← Sticky header (blurred)
│                 │
│  [Image 220px]  │ ← Image (taller)
│                 │
│  Product Title  │
│  Description    │
│                 │
│  🪙 Balance     │ ← Balance pill
│                 │
│  Pickup Price   │
│  4.00 GEL       │
│                 │
│ ╔═════════════╗ │ ← Reservation cost
│ ║ 5 Points    ║ │   (PROMINENT)
│ ╚═════════════╝ │
│                 │
│ [ Quantity ]    │
│                 │
│ [ Reserve Btn ] │
│                 │
└─────────────────┘
```

---

## 🎨 Component Breakdown

### Header Section (48px height)
```
┌─────────────────────────────────────┐
│  [ ← ]   Product Name   [ → ]  [✕] │
│   36px      (fade in)     36px  36px│
└─────────────────────────────────────┘
Background: transparent → rgba(255,255,255,0.98)
Blur: none → 10px
Border bottom: transparent → gray-100
```

### Image Section (180-220px)
```
┌─────────────────────────────────────┐
│                                     │
│      [Full-Width Product Image]    │
│                                     │
│      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓     │ ← Gradient
└─────────────────────────────────────┘
Height: 180px (collapsed) → 220px (expanded)
Gradient: from-black/60 via-black/20 to-transparent
```

### Title Section
```
┌─────────────────────────────────────┐
│  Delicious Fresh Pizza    ⏰ 2h 30m│
│  18px semibold           green pill │
│                                     │
│  Ready for pickup. Limited stock.   │
│  13px gray text                     │
└─────────────────────────────────────┘
```

### Balance Pill (Small)
```
┌─────────────────────────────────────┐
│  🪙 Your Balance: 210 Points        │
│  inline-flex, rounded-full, white   │
└─────────────────────────────────────┘
Height: auto, Shadow: sm
```

### Pickup Price (Clean Text)
```
PICKUP PRICE TODAY          ← 12px uppercase gray
4.00 GEL                    ← 30px bold green
Original Price: ~10.00 GEL~ ← 14px line-through
```

### Reservation Cost (HERO ELEMENT)
```
╔═══════════════════════════════════╗
║    ✨ Reservation Cost            ║ 16px semibold
║                                   ║
║              5                    ║ 48px BOLD orange
║                                   ║
║            Points                 ║ 18px orange
║  ───────────────────────────────  ║ divider
║  Reserving costs points.         ║ 13px
║  Payment is completed at pickup. ║ 13px (bold)
╚═══════════════════════════════════╝

Background: linear-gradient orange-50 → orange-100/50
Border: 1px solid orange-200/50
Radius: 16px (rounded-2xl)
Shadow: 0 4px 6px rgba(0,0,0,0.07)
Padding: 24px (p-6)
```

### Quantity Selector
```
┌───────────────────────────────────┐
│   [ - ]        5        [ + ]     │
│   44px       36px       44px      │
│           MAX 10                  │
│        10px uppercase             │
└───────────────────────────────────┘

Background: white
Border: gray-100
Radius: 12px (rounded-xl)
Shadow: sm
Buttons: rounded-full, gray-50
```

### Reserve Button
```
┌───────────────────────────────────┐
│   🪙  Reserve This Deal           │
│   52px height, orange, full-width │
└───────────────────────────────────┘
Reservation held for 1 hour  ← 12px gray

Background: #F97316
Hover: #EA580C
Active: #DC2626
Radius: 12px (rounded-xl)
Shadow: md → lg on hover
```

---

## 🎯 Visual Hierarchy Map

```
Priority Level    Component                 Size/Weight
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1 (Highest)      Reservation Cost Block    48px, gradient, shadow-md
1 (Highest)      Reserve Button            52px, orange, shadow-lg
2 (High)         Pickup Price              30px, green
2 (High)         Product Image             180-220px, full-width
3 (Medium)       Product Title             18px semibold
3 (Medium)       Quantity Selector         36px number, white card
4 (Low)          Balance Pill              13px, small pill
4 (Low)          Time Badge                12px, green/orange pill
5 (Subtle)       Description               13px gray
5 (Subtle)       Footer Text               12px light gray
```

---

## 🎨 Color Usage Map

```
Component                   Background       Text          Border/Shadow
─────────────────────────────────────────────────────────────────────────
Sheet                      #FFFFFF          -             shadow-2xl
Overlay                    rgba(0,0,0,0.3)  -             -
Header (expanded)          rgba(255,255,255,0.98) -      gray-100
Image                      gradient         -             -
Title                      transparent      #111827       -
Time Badge (normal)        #DCFCE7          #15803D       -
Time Badge (expiring)      #FED7AA          #C2410C       -
Balance Pill               #FFFFFF          #111827       gray-100
Pickup Price               transparent      #059669       -
Reservation Cost           orange-50→100/50 #F97316       orange-200/50
Quantity Selector          #FFFFFF          #111827       gray-100
Quantity Buttons           #F9FAFB          #374151       gray-200
Reserve Button             #F97316          #FFFFFF       shadow-md
Alerts                     orange-50        #EA580C       orange-200
```

---

## 📏 Spacing System

```
Vertical Spacing (px-5 = 20px horizontal)
───────────────────────────────────────
Drag Handle    → 2px top padding
Header         → 3px vertical (py-3)
Image          → No padding (full-width)
Title Section  → 4px top (pt-4), 2.5px bottom
Content Gap    → 4 units (space-y-4 = 16px)
Button         → 3px top (pt-3), 2.5px vertical
Bottom         → 6px bottom (pb-6)

Touch Targets
─────────────
Minimum: 44×44px (iOS/Android standard)
- Navigation arrows: 36×36px (acceptable for secondary)
- Close button: 36×36px (acceptable for secondary)
- Quantity buttons: 44×44px ✓
- Reserve button height: 52px ✓
```

---

## 🎬 Animation Sequences

### Opening Bottom Sheet
```
Time   Element              Action
─────────────────────────────────────
0ms    Background overlay   Fade in (0 → 0.3)
0ms    Sheet               Slide up (100% → 0)
300ms  Animation complete  Spring settles
```

### Expanding Sheet
```
Time   Element              Action
─────────────────────────────────────
0ms    Sheet height        Animate (45vh → 92vh)
0ms    Background opacity  Fade (0.3 → 0.6)
0ms    Header background   Fade in + blur
100ms  Title in header     Fade in + slide down
100ms  Content sections    Fade in (cascade)
300ms  Animation complete  Spring settles
```

### Navigating Left/Right
```
Time   Element              Action
─────────────────────────────────────
0ms    Current content     Fade out + slide
0ms    New content         Fade in + slide from side
200ms  Animation complete  Smooth transition
```

### Collapsing Sheet
```
Time   Element              Action
─────────────────────────────────────
0ms    Content             Fade out immediately
0ms    Sheet height        Animate (92vh → 45vh)
0ms    Background opacity  Fade (0.6 → 0.3)
0ms    Header background   Fade out
300ms  Animation complete  Spring settles
```

---

## 📱 Responsive Breakpoints

### Mobile Portrait (< 640px)
```
Sheet Width:     100%
Sheet Height:    45vh / 92vh
Image Height:    180px / 220px
Padding:         px-5 (20px)
Font Scale:      1x
```

### Mobile Landscape (640-768px)
```
Sheet Width:     100%
Sheet Height:    40vh / 85vh (shorter)
Image Height:    160px / 180px (shorter)
Padding:         px-5 (20px)
Font Scale:      0.95x
```

### Tablet (768-1024px)
```
Sheet Width:     100%
Sheet Height:    45vh / 90vh
Image Height:    180px / 220px
Padding:         px-6 (24px)
Font Scale:      1x
```

### Desktop (> 1024px)
```
Sheet Width:     448px (max-w-md, centered)
Sheet Height:    600px / 800px (fixed)
Image Height:    200px / 240px
Padding:         px-6 (24px)
Font Scale:      1.05x
```

---

## 🎭 Interaction States

### Drag Handle
```
Default:   bg-gray-300, w-10, h-1
Active:    Scale up slightly (1.1x)
```

### Navigation Arrows
```
Default:   bg-white, shadow-sm, border-gray-200
Hover:     shadow-md
Active:    scale-95
Disabled:  invisible (not just dimmed)
```

### Close Button
```
Default:   bg-white, shadow-sm, border-gray-200
Hover:     shadow-md, bg-gray-50
Active:    scale-95
```

### Reserve Button
```
Default:   bg-orange-500, shadow-md
Hover:     bg-orange-600, shadow-lg
Active:    bg-red-600, scale-98
Disabled:  opacity-50, cursor-not-allowed
Loading:   Spinner animation
```

### Quantity Buttons
```
Default:   bg-gray-50, border-gray-200
Hover:     bg-gray-100
Active:    scale-95
Disabled:  opacity-40
```

---

## ✅ Quality Checklist

### Visual Polish
- [x] No pixel gaps or misalignments
- [x] Consistent border radius (12-16px)
- [x] Proper shadow hierarchy (sm → md → lg)
- [x] Smooth color transitions
- [x] Clean typography scale
- [x] Proper white space balance

### Interaction Polish
- [x] Smooth 60fps animations
- [x] Responsive touch gestures
- [x] Clear hover/active states
- [x] No accidental interactions
- [x] Proper disabled states
- [x] Loading states

### Content Polish
- [x] Clear visual hierarchy
- [x] Readable text sizes
- [x] Sufficient color contrast
- [x] No content clipping
- [x] Proper text truncation
- [x] Fallback content

### Mobile Polish
- [x] Safe area respected
- [x] Keyboard handling
- [x] Landscape support
- [x] Pull-to-refresh doesn't conflict
- [x] No horizontal scroll

---

## 🎨 Figma-Style Component Specs

```
Component: OfferBottomSheet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frame
├─ Width: 100vw (mobile) / 448px (desktop)
├─ Height: 45vh (collapsed) / 92vh (expanded)
├─ Background: #FFFFFF
├─ Border Radius: 20px 20px 0 0 (top corners only)
├─ Shadow: 0 -4px 20px rgba(0,0,0,0.15)
└─ Position: Fixed bottom

Drag Handle
├─ Width: 40px
├─ Height: 4px
├─ Background: #D1D5DB
├─ Border Radius: 2px
└─ Margin: 8px auto 4px

Header (Sticky)
├─ Height: 48px
├─ Background: rgba(255,255,255,0.98)
├─ Backdrop Filter: blur(10px)
├─ Border Bottom: 1px solid rgba(0,0,0,0.06)
├─ Padding: 12px 16px
└─ Display: Flex (space-between)

Image
├─ Width: 100%
├─ Height: 180px → 220px (responsive)
├─ Object Fit: Cover
└─ Gradient: linear-gradient(to top, rgba(0,0,0,0.6), transparent)

Content
├─ Padding: 20px (px-5)
├─ Gap: 16px (space-y-4)
└─ Overflow: Auto (scroll)

Reservation Cost Card
├─ Background: linear-gradient(135deg, #FFF7ED 0%, rgba(255,237,213,0.5) 100%)
├─ Border: 1px solid rgba(251,146,60,0.5)
├─ Border Radius: 16px
├─ Padding: 24px
├─ Shadow: 0 4px 6px rgba(0,0,0,0.07)
├─ Text Align: Center
└─ Display: Flex column
```

---

**Visual Reference Version:** 1.0  
**Last Updated:** November 27, 2025  
**Design Tool:** ASCII Art + CSS Specs  
**Framework:** React + Tailwind CSS + Framer Motion
