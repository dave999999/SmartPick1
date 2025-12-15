# 🎨 Floating 3D Glass Dock - Figma Design Specification

## Overview
Premium Apple-style VisionOS-inspired floating bottom navigation dock with frosted glass material, superellipse radius, and cosmic orange 3D center bubble.

---

## 📐 Layout Structure

```
┌─────────────────────────────────────────────┐
│                                             │
│              Screen Content                 │
│                  (Map)                      │
│                                             │
│              8-10px gap ↓                   │
│                                             │
│    ┌─────────────────────────────────┐    │
│    │  ┌───┐    ┌───┐ ╭─○─╮ ┌───┐  ┌───┐ │    │
│    │  │ H │    │ S │ │ O │ │ P │  │ M │ │ <- 64px
│    │  └───┘    └───┘ ╰───╯ └───┘  └───┘ │    │
│    └─────────────────────────────────┐    │
│         ← Glass Dock (Floating) →         │
└─────────────────────────────────────────────┘
```

---

## 🧊 Glass Dock Container

### Dimensions
- **Height**: 64px
- **Width**: Auto (max-width: 448px / max-w-md)
- **Horizontal Padding**: 20px (px-5)
- **Border Radius**: 28px (superellipse-like)

### Material Properties
```css
backdrop-filter: blur(20px) saturate(180%)
background: rgba(255, 255, 255, 0.20) /* white/20 */
border: 1px solid rgba(255, 255, 255, 0.30) /* white/30 */
box-shadow: 0px 8px 25px rgba(0, 0, 0, 0.12)
```

### Positioning
- **Position**: Fixed, bottom 16px from screen edge
- **Float**: 8-10px above map content
- **Horizontal**: Centered with 16px side margins

### Visual Effects
- **Frosted Glass**: Backdrop blur with saturation boost
- **Subtle Refraction**: Linear gradient overlay (mint to orange, 10-5% opacity)
- **Floating Shadow**: Soft 25px blur, 12% black opacity

---

## 🌟 Center Button (3D Bubble)

### Geometry
- **Dimensions**: 72px × 72px (circle)
- **Small Screen**: 64px × 64px when width < 360px
- **Position**: Translate Y by -8px (floats above dock)

### Gradient Fill
```css
background: linear-gradient(135deg, #FF8A00 0%, #FF5A00 100%)
/* Cosmic Orange gradient - warm to hot */
```

### Lighting & Effects
```css
box-shadow: 0px 6px 20px rgba(255, 120, 0, 0.25) /* Orange glow */
ring: 1px rgba(255, 255, 255, 0.40) /* Inner gloss */
```

### Icon
- **Component**: Sparkles (Lucide)
- **Size**: 28px (24px on small screens)
- **Color**: White (#FFFFFF)
- **Stroke Width**: 2px

### Animation - Bubble Tap
```css
@keyframes bubbleTap {
  0%   { transform: scale(1);    filter: brightness(1);    }
  60%  { transform: scale(0.92); filter: brightness(1.25); }
  100% { transform: scale(1);    filter: brightness(1);    }
}
duration: 180ms
easing: ease-out
```

### States
- **Idle**: Scale 1.0, brightness 1.0
- **Hover**: Scale 1.05 (smooth transition)
- **Press**: bubbleTap animation + haptic (10ms vibration)

---

## 🔘 Navigation Icons

### Icon Specifications
- **Library**: Lucide Icons
- **Stroke Width**: 2px (thin, Apple-style)
- **Size**: 22px
- **Style**: Rounded geometry, minimal line weight

### Icon Set
1. **Home**: Home icon
2. **Saved**: Heart icon
3. **Offers**: Sparkles (center bubble)
4. **Profile**: User icon
5. **Menu**: Menu icon

### Colors
- **Idle State**: `text-neutral-400` (#A3A3A3)
- **Active State**: `text-[#FF7A00]` (Cosmic Orange)

---

## 💡 Active Tab State

### Glowing Glass Capsule
```css
background: rgba(255, 255, 255, 0.40) /* white/40 */
backdrop-filter: blur(12px)
border-radius: 12px /* rounded-xl */
padding: 4px 12px /* py-1 px-3 */
box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.05)
```

### Icon Behavior
- **Lift Effect**: Translate Y by -2px
- **Color**: Changes to cosmic orange (#FF7A00)
- **Animation**: Spring transition (stiffness: 400, damping: 25)

### Label
- **Font Size**: 10px (9px on small screens)
- **Font Weight**: 500 (medium)
- **Opacity**: 1.0 (active), 0.7 (inactive)
- **Position**: 4px below icon (mt-1)

---

## 📱 Responsive Behavior

### Small Screens (< 360px width)

**Dock Adjustments**:
- Width reduces to 90% of screen
- Maintains horizontal centering

**Center Button**:
- Size: 64px × 64px
- Icon: 24px

**Labels**:
- Font size: 9px
- Maintains spacing

**Icon Spacing**:
- Reduces horizontal padding slightly
- Keeps even distribution

---

## 🎯 Interaction States

### Tab Button
1. **Idle**: 
   - Opacity 0.7
   - Scale 1.0
   - No capsule background

2. **Hover**:
   - Opacity 1.0
   - Smooth transition (200ms)

3. **Active**:
   - Glowing capsule appears (layoutId animation)
   - Icon lifts -2px
   - Color shifts to cosmic orange
   - Label opacity 1.0

4. **Press**:
   - Scale 0.9 (whileTap)
   - Haptic feedback (10ms)
   - Smooth spring return

### Center Button
1. **Idle**:
   - Full gradient glow
   - Ring highlight visible

2. **Hover**:
   - Scale 1.05
   - Glow intensifies slightly

3. **Press**:
   - Scale 0.92
   - Brightness 1.25 (60% through animation)
   - Glow pulse effect
   - Returns to scale 1.0 at 100%

---

## 🎨 Color Palette

### Cosmic Orange (Primary)
```
Gradient Start: #FF8A00 (255, 138, 0)
Gradient End:   #FF5A00 (255, 90, 0)
Active State:   #FF7A00 (255, 122, 0)
Glow Shadow:    rgba(255, 120, 0, 0.25)
```

### Glass Materials
```
Glass Background:  rgba(255, 255, 255, 0.20)
Glass Border:      rgba(255, 255, 255, 0.30)
Active Capsule:    rgba(255, 255, 255, 0.40)
Ring Highlight:    rgba(255, 255, 255, 0.40)
```

### Neutral States
```
Inactive Icon:  #A3A3A3 (neutral-400)
Inactive Label: #A3A3A3 with 70% opacity
```

### Shadow Values
```
Floating Dock:  0px 8px 25px rgba(0, 0, 0, 0.12)
Center Button:  0px 6px 20px rgba(255, 120, 0, 0.25)
Active Capsule: 0px 2px 4px rgba(0, 0, 0, 0.05)
```

---

## 🧩 Figma Layer Structure

```
🗂 Bottom Nav Bar (Frame)
  ├── 📐 Glass Dock Container (Auto Layout)
  │   ├── 🎨 Backdrop Blur (Effect)
  │   ├── 🎨 Background Fill (white/20)
  │   ├── 🎨 Border (white/30, 1px)
  │   ├── 🎨 Drop Shadow (0, 8, 25, 12% black)
  │   ├── 🎨 Refraction Overlay (gradient, 20% opacity)
  │   │
  │   ├── 🔘 Tab - Home (Component)
  │   │   ├── 📦 Active Capsule (visible when active)
  │   │   ├── 🎯 Icon (22px, 2px stroke)
  │   │   └── 📝 Label (10px, medium)
  │   │
  │   ├── 🔘 Tab - Saved (Component)
  │   │
  │   ├── ⭐ Center Bubble (Component)
  │   │   ├── 🎨 Gradient Fill (#FF8A00 → #FF5A00)
  │   │   ├── 🎨 Glow Shadow (orange, 25% opacity)
  │   │   ├── 🎨 Ring Border (white/40, 1px)
  │   │   └── ✨ Icon - Sparkles (28px, white)
  │   │
  │   ├── 🔘 Tab - Profile (Component)
  │   │
  │   └── 🔘 Tab - Menu (Component)
  │
  └── 📝 Annotations
```

---

## 📋 Component Variants

### Tab Button Component
**Properties**:
- State: Idle | Active | Hover | Pressed
- Label: String
- Icon: Component

**Active Variant**:
- Shows glass capsule background
- Icon color: cosmic orange
- Y offset: -2px
- Label opacity: 100%

### Center Bubble Component
**Properties**:
- State: Idle | Hover | Pressed
- Size: Large (72px) | Small (64px)

**Pressed Variant**:
- Scale: 0.92
- Brightness: 125%
- Duration: 180ms

---

## 🔧 Technical Notes

### Backdrop Blur Support
```css
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);
```

### Superellipse Approximation
- Use `border-radius: 28px` in CSS
- In Figma: Use "Squircle" or rounded rectangle with high smoothing

### Animation Timing
- **Spring Animations**: stiffness 400-500, damping 25-35
- **Bubble Tap**: 180ms ease-out
- **Color Transitions**: 200ms linear

### Accessibility
- All buttons have proper `aria-label` attributes
- Minimum touch target: 44px × 44px (met by button sizing)
- Color contrast: Active state meets WCAG AA (orange on white capsule)

---

## 📸 Visual Reference

### ASCII Layout
```
┌──────────────── Glass Dock (64px) ────────────────┐
│  px-5 ↓                                   ↓ px-5  │
│  ┌───┐         ┌───┐    ╭───╮    ┌───┐    ┌───┐ │
│  │ H │  20px   │ S │ 16 │ O │ 16 │ P │ 20 │ M │ │
│  │ ⌂ │   gap   │ ♥ │ px │ ✨ │ px │ 👤│ gap│ ≡ │ │
│  │Home│         │Sav│    │Off│    │Pro│    │Men│ │
│  └───┘         └───┘    ╰─┬─╯    └───┘    └───┘ │
│                            │                      │
│                       72px bubble                 │
│                    (-8px Y offset)                │
└──────────────────────────────────────────────────┘
           ↑ 28px superellipse radius ↑
```

### Active State Example
```
┌──────────────── Glass Dock ───────────────┐
│                                            │
│  ┌───┐    ╭─────╮    ╭───╮    ┌───┐    ┌───┐  │
│  │ ⌂ │    │  ♥  │    │ ✨ │    │ 👤│    │ ≡ │  │
│  │   │    │ Sav │    │    │    │   │    │   │  │
│  └───┘    ╰─────╯    ╰───╯    └───┘    └───┘  │
│  gray    ← glowing    orange   gray     gray   │
│           capsule                              │
└──────────────────────────────────────────────────┘
```

---

## ✅ Quality Checklist

- [ ] Dock floats 8-10px above content
- [ ] 64px total height maintained
- [ ] Superellipse radius (28px) applied
- [ ] Backdrop blur renders correctly
- [ ] Center button floats above dock (-8px)
- [ ] Cosmic orange gradient on center button
- [ ] Active tabs show glowing glass capsule
- [ ] Icons use 2px stroke (thin, Apple-style)
- [ ] Haptic feedback triggers on tap
- [ ] Small screen scaling works (< 360px)
- [ ] Spring animations smooth (60fps)
- [ ] All touch targets ≥ 44px
- [ ] WCAG AA color contrast met

---

## 🎯 Design Goals Achieved

✅ **Premium Feel**: Frosted glass with VisionOS aesthetic  
✅ **Apple-Style Icons**: Thin stroke, rounded geometry  
✅ **3D Center Bubble**: Gradient glow with pulse animation  
✅ **Floating Design**: Elevated above map with soft shadow  
✅ **Responsive**: Scales gracefully on small screens  
✅ **Smooth Interactions**: Spring physics and haptic feedback  
✅ **World-Class Polish**: Every pixel considered and refined  

---

**Design System**: SmartPick Premium UI  
**Last Updated**: December 2025  
**Platform**: iOS / Android Web App  
**Framework**: React + Tailwind + Framer Motion
