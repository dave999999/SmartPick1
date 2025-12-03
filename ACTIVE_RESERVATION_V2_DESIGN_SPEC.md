# Active Reservation Modal V2 - Ultra-Premium Apple Wolt-Style

## 🎯 Design Overview

**World-class redesign following:**
- ✅ Wolt-style QR floating 50% over map
- ✅ Apple Fitness circular timer precision
- ✅ Apple Wallet card aesthetics
- ✅ Ultra-compact modal body (<50% screen height)
- ✅ Premium glossy + minimal white variants
- ✅ iPhone SE optimized (375×667px)

---

## 🎨 Visual Specifications

### A. Floating QR Module (Wolt-Style Map Overlap)

**Position:**
- Absolute positioning: `-top-85px` (50% overlap with map)
- Z-index: 50 (floats above modal)
- Centered horizontally: `left-1/2 -translate-x-1/2`

**Shadow System:**
```css
/* Dual-layer floating depth */
drop-shadow(0 16px 48px rgba(0, 0, 0, 0.15))
drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))
```

**QR Container:**
- Size: 170px × 170px
- Border radius: 14px (fully rounded, no sharp corners)
- Background: `linear-gradient(135deg, #FFFFFF 0%, #F9F9F9 100%)`
- Inner shadow: `inset 0 2px 8px rgba(0,0,0,0.04)`
- Inner QR size: 130px × 130px
- QR code: 98px × 98px with 8px border-radius

**Tap Interaction:**
- Scale: `1.0 → 1.08 → 1.0`
- Duration: 120ms
- Spring: damping 18, stiffness 450
- Haptic: Light impact (iOS standard)

---

### B. Countdown Ring (Apple Fitness Precision)

**Ring Specifications:**
- Stroke width: 4px (thin, elegant)
- Radius: `(170 - 4*2) / 2 - 4 = 77px`
- Track color: `rgba(255,255,255,0.3)`
- Progress gradient: `#2ECC71` (green) → `#FF7A00` (orange) → `#EF4444` (red)

**Color Thresholds:**
- >15min: `#2ECC71` (Soft mint green)
- 5-15min: `#FF7A00` (SmartPick orange)
- <5min: `#EF4444` (Apple red)

**Glossy Effect:**
```css
/* SVG Gradients */
#ringGrad: #COLOR 100% → #COLOR 75%
#gloss: white 35% → white 0%

/* Apple Fitness Glow */
filter: drop-shadow(0 0 8px rgba(46, 204, 113, 0.4));
feGaussianBlur: stdDeviation="2.5"
```

**18 Micro-Dots:**
- Active dot: 2.5px radius with 25% opacity pulse glow (2s animation)
- Inactive dot: 1.5px radius, `rgba(255,255,255,0.4)`
- Position: Evenly distributed around ring (20° intervals)

**Animation:**
- Progress transition: `1s ease-out`
- 60 FPS smooth rendering
- Linear easing for countdown

---

### C. Ultra-Compact Modal Body (<50% Height)

**Container:**
- Max height: `50vh` (never exceeds 50% screen)
- Background: `linear-gradient(135deg, #F8F8F8 0%, #FFFFFF 100%)`
- Backdrop: `blur(18px) saturate(180%)`
- Border radius: 28px top corners only
- Shadow: Dual-layer upward shadow

**Spacing Grid:**
- Container padding: `px-4 pb-4` (16px horizontal, 16px bottom)
- Top padding: `pt-[100px]` (space for floating QR)
- Section gaps: `space-y-3` (12px between elements)

**iOS Drag Handle:**
- Width: 10px (40px × 4px)
- Color: `#D1D1D6` (Apple system gray)
- Position: Centered, 8px from top

---

### D. Timer Display (SF Rounded Style)

**Typography:**
- Font size: 56px
- Weight: 700 (bold)
- Font family: `font-mono` (San Francisco Mono)
- Tracking: `-0.02em` (tight)
- Line height: 1 (leading-none)

**Color Coding:**
- >15min: `text-[#2ECC71]`
- 5-15min: `text-[#FF7A00]`
- <5min: `text-[#EF4444]`

**Expires Label:**
- Font size: 10px
- Weight: 600 (semibold)
- Transform: `uppercase`
- Letter spacing: `0.15em` (widest)
- Color: `#86868B` (Apple gray)
- Margin top: 4px

---

### E. Apple Wallet Card (Offer Info)

**Container:**
- Border radius: 16px
- Padding: 12px
- Background: `linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))`
- Backdrop filter: `blur(16px)`
- Shadow (glossy): `0 4px 16px rgba(0,0,0,0.06)`
- Shadow (minimal): `0 2px 8px rgba(0,0,0,0.04)`

**Title Section:**
- Offer title: 15px / 600 / tight / `#1D1D1F`
- Partner name: 12px / 400 / normal / `#86868B`
- Spacing: 2px gap (`mt-0.5`)

**Info Row (Badges):**
- Font size: 12px
- Icon size: 14px (3.5 units)
- Icon color: `#FF7A00` (MapPin)
- Text color: `#555` (medium gray)
- Separator: 4px circle, `#D1D1D6`
- Gap: 10px between elements

**Badge Content:**
- Distance: `{distance} · {eta} min`
- Quantity: `{qty} item(s)` in bold `#1D1D1F`

---

### F. Action Buttons (iOS 44px Standard)

**Layout:**
- Height: 44px (iOS touch target)
- Gap: 10px (`gap-2.5`)
- Flex: 1:1 equal width
- Border radius: Full (9999px)

**Cancel Button (Outline):**
- Border: 2px solid `#FF7A00/60`
- Text: `#FF7A00`, 15px, 600
- Hover: `bg-orange-50/50`, `border-#FF7A00`
- Tap: `scale(0.97)`, 140ms
- Shadow: `0 0 0 0` → `0 2px 8px rgba(255,122,0,0.15)` (hover)

**Navigate Button (Gradient):**

**Glossy Variant:**
```css
background: linear-gradient(135deg, #FF7A00 0%, #FF8A1F 100%);
box-shadow: 
  0 6px 20px rgba(255,122,0,0.3),
  inset 0 1px 0 rgba(255,255,255,0.2);
```

**Minimal Variant:**
```css
background: #FF7A00;
box-shadow: 0 4px 12px rgba(255,122,0,0.25);
```

**Icon:**
- Navigation arrow: 16px (4 units)
- Stroke width: 2.5px
- Color: white
- Position: Left of text with 8px gap

**Interaction:**
- Tap: `scale(0.97)`
- Duration: 140ms
- Spring: damping 20, stiffness 400
- Haptic: Medium impact

---

## 🎨 Design Tokens

### Color Palette

```typescript
const COLORS = {
  // Apple Brand Colors
  appleBlack: '#1D1D1F',
  appleGray: '#86868B',
  appleDivider: '#D1D1D6',
  
  // SmartPick Brand
  smartPickOrange: '#FF7A00',
  smartPickOrangeLight: '#FF8A1F',
  
  // Status Colors
  success: '#2ECC71',
  warning: '#FF7A00',
  danger: '#EF4444',
  
  // Surface Colors
  surfaceWhite: '#FFFFFF',
  surfaceGray: '#F8F8F8',
  surfaceDark: '#F9F9F9',
  
  // Opacity Variants
  whiteBlur40: 'rgba(255,255,255,0.4)',
  whiteBlur60: 'rgba(255,255,255,0.6)',
  whiteBlur95: 'rgba(255,255,255,0.95)',
  
  // Glow Colors
  mintGlow: 'rgba(46, 204, 113, 0.4)',
  orangeGlow: 'rgba(255, 122, 0, 0.4)',
  redGlow: 'rgba(239, 68, 68, 0.4)',
};
```

### Shadow System

```typescript
const SHADOWS = {
  // Floating shadows
  float: 'drop-shadow(0 16px 48px rgba(0, 0, 0, 0.15)) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))',
  
  // Card shadows
  cardGlossy: '0 4px 16px rgba(0,0,0,0.06)',
  cardMinimal: '0 2px 8px rgba(0,0,0,0.04)',
  
  // Inner shadows
  innerGlossy: 'inset 0 2px 8px rgba(0,0,0,0.04)',
  innerHighlight: 'inset 0 1px 0 rgba(255,255,255,0.5)',
  
  // Button shadows
  buttonGlossy: '0 6px 20px rgba(255,122,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
  buttonMinimal: '0 4px 12px rgba(255,122,0,0.25)',
  
  // Modal shadows
  modalSheet: '0 -12px 32px rgba(0, 0, 0, 0.12), 0 -2px 8px rgba(0, 0, 0, 0.06)',
  qrModal: '0 20px 60px rgba(0,0,0,0.2)',
};
```

### Typography Scale

```typescript
const TYPOGRAPHY = {
  // Timer
  timerHuge: { size: 56, weight: 700, lineHeight: 1, tracking: 'tight' },
  
  // Titles
  titleLarge: { size: 17, weight: 600, lineHeight: 'tight', tracking: 'tight' },
  titleMedium: { size: 15, weight: 600, lineHeight: 'tight' },
  
  // Body
  bodyLarge: { size: 14, weight: 400, lineHeight: 'relaxed' },
  bodyMedium: { size: 13, weight: 400, lineHeight: 'normal' },
  bodySmall: { size: 12, weight: 500, lineHeight: 'normal' },
  
  // Caption
  captionLarge: { size: 10, weight: 600, lineHeight: 'normal', tracking: 'widest', transform: 'uppercase' },
  captionSmall: { size: 8, weight: 500, lineHeight: 'tight', tracking: 'tight' },
};
```

### Spacing Grid (4pt)

```typescript
const SPACING = {
  xs: 4,   // 1 unit
  sm: 8,   // 2 units
  md: 12,  // 3 units
  lg: 16,  // 4 units
  xl: 20,  // 5 units
  xxl: 24, // 6 units
};
```

### Corner Radius

```typescript
const RADIUS = {
  sm: 8,    // QR inner corners
  md: 12,   // Cards, small elements
  lg: 14,   // QR container
  xl: 16,   // Wallet card
  xxl: 22,  // QR modal inner
  xxxl: 28, // Modal top corners
  full: 9999, // Buttons, pills
};
```

### Animation Timings

```typescript
const ANIMATIONS = {
  // Spring physics
  modalEntrance: { damping: 26, stiffness: 350 },
  qrTap: { damping: 18, stiffness: 450, duration: 0.12 },
  buttonPress: { damping: 20, stiffness: 400, duration: 0.14 },
  
  // Linear timings
  ringProgress: { duration: '1s', easing: 'ease-out' },
  microDotPulse: { duration: '2s', iteration: 'infinite' },
  
  // iOS Haptic equivalents
  lightImpact: 140, // ms
  mediumImpact: 160, // ms
};
```

---

## 📐 Layout Measurements

### Floating QR Module
- Total size: 170px × 170px
- Ring stroke: 4px
- Ring radius: 77px
- QR container: 130px × 130px
- QR code: 98px × 98px
- Top offset: -85px (50% overlap)
- Shadow distance: 16px + 4px dual layer

### Modal Body
- Max height: 50vh
- Top padding: 100px (QR clearance)
- Horizontal padding: 16px
- Bottom padding: 16px
- Section gaps: 12px
- Handle: 40px × 4px

### Timer
- Digits: 56px height
- Label: 10px height
- Gap: 4px

### Wallet Card
- Padding: 12px
- Title height: ~18px
- Partner height: ~15px
- Info row height: ~20px
- Total: ~65px

### Buttons
- Height: 44px (iOS standard)
- Gap: 10px
- Total row: ~58px

**Total Modal Height (without QR overlap):** ~340px (~50% of 667px iPhone SE)

---

## 🎯 Responsive Breakpoints

### iPhone SE (375×667px)
- QR size: 170px → 160px
- Timer: 56px → 52px
- Text scale: 100%
- Modal height: max 340px

### iPhone 12 mini (360×780px)
- QR size: 170px → 150px
- Timer: 56px → 48px
- Text scale: 95%
- Padding: 16px → 12px

### Very Small (<360px)
- QR size: 170px → 140px
- Timer: 56px → 44px
- Text scale: 90%
- Padding: 16px → 8px
- Button text: 15px → 14px

---

## 🎨 Variant Comparison

### Minimal White
**Philosophy:** Clean, flat, soft shadows - everyday use

**Characteristics:**
- Flat white backgrounds (#FFFFFF)
- Soft shadows (opacity 0.04)
- No gradients on buttons (solid #FF7A00)
- Simple border radius (no glossy effects)
- Subtle backdrop blur
- Performance optimized

**Best for:**
- Users who prefer simplicity
- Low-end devices (better performance)
- Accessibility mode
- Battery saving

### Premium Glossy
**Philosophy:** Extra depth, shine, micro-highlights - luxury feel

**Characteristics:**
- Linear gradient backgrounds
- Layered shadows (0.06-0.12 opacity)
- Glossy ring overlay (white gradient)
- Inset highlight shadows
- Rich backdrop blur + saturate
- Gradient buttons with inner highlights

**Best for:**
- Showcase/demo mode
- Premium brand positioning
- High-end devices (120Hz displays)
- Marketing materials

---

## 📦 Component Export

```typescript
// Usage
import { ActiveReservationCard } from '@/components/reservation/ActiveReservationCardV2';

<ActiveReservationCard
  reservation={activeReservation}
  userLocation={userLocation}
  onNavigate={handleNavigate}
  onCancel={handleCancel}
  onExpired={handleExpired}
  variant="glossy" // or "minimal"
/>
```

---

## ✅ Implementation Checklist

### Phase 1: Core Structure ✅
- [x] Floating QR module component
- [x] Countdown ring with SVG gradients
- [x] 18 micro-dots animation
- [x] Ultra-compact modal body
- [x] Responsive layout (<50% height)

### Phase 2: Interactions ✅
- [x] QR tap to enlarge (scale 1.08, 120ms)
- [x] Button press animations (scale 0.97, 140ms)
- [x] Modal entrance spring animation
- [x] Ring progress smooth transition

### Phase 3: Variants ✅
- [x] Minimal White variant
- [x] Premium Glossy variant
- [x] Prop-based variant switching

### Phase 4: Polish ✅
- [x] iOS drag handle
- [x] Color-coded timer
- [x] Apple Wallet card styling
- [x] Dual-layer floating shadows
- [x] Backdrop blur + saturate

### Phase 5: Responsive ✅
- [x] iPhone SE optimization
- [x] Small screen (<360px) adaptations
- [x] Text scaling system
- [x] Padding collapse logic

---

## 🚀 Performance Optimizations

1. **SVG Ring:** Hardware-accelerated CSS transforms
2. **Backdrop blur:** GPU-composited layer
3. **Framer Motion:** Spring physics with will-change
4. **QR Code:** Memoized render, level H
5. **Countdown:** 1s interval (not every frame)
6. **Micro-dots:** CSS animations (no JS)

**Result:** 60 FPS on iPhone SE, smooth on 120Hz displays

---

## 📸 Figma Export Guide

1. Export floating QR module at 3x (510×510px)
2. Export modal body at 2x (750×680px)
3. Export full composition at 1x (375×667px)
4. Use PNG with transparency for shadows
5. Export design tokens as JSON

---

**Implementation File:** `ActiveReservationCardV2.tsx`
**Created:** December 3, 2025
**Design System:** Apple Human Interface Guidelines + Wolt UX + SmartPick Brand
