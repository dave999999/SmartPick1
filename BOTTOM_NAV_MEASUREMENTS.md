# Bottom Navigation - Visual Measurements Reference

## Premium iOS Glass - Exact Pixel Measurements

```
iPhone 13 Pro (390px width)

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     [Content Area]                              │
│                                                                 │
│  ┌──────────────────────────[Gradient Fade 128px]─────────────┐
│  │                                                             │
│  │  2px ┌────────────────────────────────────────────┐ 2px   │
│  │  edge│         Glassmorphism Container            │ edge  │
│  │      │  bg-white/75 + backdrop-blur-[18px]        │       │
│  │      │  rounded-[28px]                             │       │
│  │      │  shadow-[0_8px_32px_rgba(0,0,0,0.12)]     │       │
│  │      │                                             │       │
│  │      │  ┌──┐           ╔════╗         ┌──┐ ┌──┐ │       │
│  │      │  │🏠│           ║ ⚡ ║         │👤│ │☰ │ │       │
│  │      │  │  │  60px     ║60px║         │  │ │  │ │       │
│  │      │  │24│  button   ╚════╝         │24│ │24│ │ 72px  │
│  │      │  │px│  floating -32px          │px│ │px│ │ height│
│  │      │  │  │  offset   [Glow]         │  │ │  │ │       │
│  │      │  └──┘           [blur-xl]      └──┘ └──┘ │       │
│  │      │  Home           Offers         Profile Menu│       │
│  │      │  10px           [label]        10px  10px │       │
│  │      │  [Active Pill: 52px width, rounded-full]  │       │
│  │      └─────────────────────────────────────────────┘       │
│  │  2px                                             2px       │
│  │  margin bottom                                  margin    │
│  └─────────────────────────────────────────────────────────────┘
│  16px Safe Area (env(safe-area-inset-bottom))                  │
└─────────────────────────────────────────────────────────────────┘
                       [iPhone Home Indicator]
```

### Detailed Measurements

**Container:**
- Total width: 386px (390px - 4px margins)
- Height: 72px
- Border radius: 28px
- Margin: 2px left/right, 2px bottom
- Padding internal: 8px top/bottom
- Background: rgba(255, 255, 255, 0.75)
- Backdrop filter: blur(18px) saturate(180%)
- Border: 1px solid rgba(255, 255, 255, 0.2)
- Shadow: 0px 8px 32px rgba(0, 0, 0, 0.12)

**Tab Layout:**
- Tab 1 (Home): 60px width
- Spacer: Auto flex
- Tab 2 (Favorites): 60px width
- Spacer: Auto flex
- Center Gap: 80px width (for floating button)
- Spacer: Auto flex
- Tab 3 (Profile): 60px width
- Spacer: Auto flex
- Tab 4 (Menu): 60px width

**Center Floating Button:**
- Position: absolute, -32px from top edge
- Width: 60px
- Height: 60px
- Border radius: 50% (perfect circle)
- Background: linear-gradient(135deg, #FF8A00 0%, #FF6B00 100%)
- Shadow: 0px 8px 24px rgba(255, 122, 0, 0.40)
- Glow ring: 60px × 60px, blur 24px, opacity 0.4

**Icons:**
- Regular tabs: 24px × 24px
- Center button: 30px × 30px
- Stroke width: 2px (inactive), 2.5px (active)
- Color: #757575 (inactive), #FF7A00 (active)

**Labels:**
- Font size: 10px
- Font weight: 600 (semibold)
- Line height: 12px
- Margin top: 4px
- Color: #757575 (inactive), #FF7A00 (active)

**Active Pill:**
- Width: 52px
- Height: 100% of container
- Border radius: 9999px (pill shape)
- Background: rgba(255, 122, 0, 0.10)
- Backdrop filter: blur(8px)

**Gradient Fade:**
- Height: 128px
- Position: absolute, bottom 0
- Background: linear-gradient(to top, rgba(255,255,255,0.6) 0%, transparent 100%)
- Pointer events: none

**Safe Area:**
- Padding bottom: max(env(safe-area-inset-bottom), 16px)
- iPhone 13: 34px actual safe area
- iPhone SE: 0px (uses 16px minimum)

---

## Standard Clean White - Exact Pixel Measurements

```
iPhone 13 Pro (390px width)

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     [Content Area]                              │
│                                                                 │
│                                                                 │
│  3px ┌─────────────────────────────────────────────┐ 3px      │
│  edge│        Standard Container                   │ edge     │
│      │  bg-white (solid)                           │          │
│      │  rounded-[24px]                             │          │
│      │  shadow-[0_4px_16px_rgba(0,0,0,0.08)]     │          │
│      │                                             │          │
│      │  ┌──┐          ╔═══╗         ┌──┐ ┌──┐   │          │
│      │  │🏠│          ║ ⚡ ║         │👤│ │☰ │   │          │
│      │  │24│  56px    ║56px║         │24│ │24│   │ 68px     │
│      │  │px│  button  ╚═══╝         │px│ │px│   │ height   │
│      │  │  │  floating-28px          │  │ │  │   │          │
│      │  └──┘                         └──┘ └──┘   │          │
│      │  Home          Offers         Profile Menu │          │
│      │  10px          [label]        10px  10px  │          │
│      │  [Bottom Line: 32px × 2px, #FF7A00]       │          │
│      └─────────────────────────────────────────────┘          │
│  3px                                             3px          │
│  margin bottom                                  margin       │
│  12px Safe Area (env(safe-area-inset-bottom))                │
└─────────────────────────────────────────────────────────────────┘
```

### Detailed Measurements

**Container:**
- Total width: 384px (390px - 6px margins)
- Height: 68px
- Border radius: 24px
- Margin: 3px left/right, 3px bottom
- Background: #FFFFFF (solid)
- Border: 1px solid #F7F7F8
- Shadow: 0px 4px 16px rgba(0, 0, 0, 0.08)

**Center Button:**
- Width: 56px
- Height: 56px
- Top offset: -28px
- Shadow: 0px 4px 16px rgba(255, 138, 0, 0.30)

**Active Indicator:**
- Width: 32px
- Height: 2px
- Border radius: 9999px (pill)
- Background: #FF7A00
- Position: absolute, -4px from bottom

**Safe Area:** 12px minimum

---

## Minimal Flat - Exact Pixel Measurements

```
iPhone 13 Pro (390px width)

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     [Content Area]                              │
│                                                                 │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ border-t-1 (top border only, #F7F7F8)                    │  │
│ │                                                           │  │
│ │   ┌──┐    ┌──┐    [⊕]    ┌──┐    ┌──┐                 │  │
│ │   │🏠│    │❤️│    48px    │👤│    │☰ │   64px          │  │
│ │   │24│    │24│   button   │24│    │24│   height        │  │
│ │   │px│    │px│   inline   │px│    │px│                 │  │
│ │   └──┘    └──┘            └──┘    └──┘                 │  │
│ │                                                           │  │
│ │   (No labels)                                            │  │
│ └───────────────────────────────────────────────────────────┘  │
│ 8px Safe Area (env(safe-area-inset-bottom))                    │
└─────────────────────────────────────────────────────────────────┘
```

### Detailed Measurements

**Container:**
- Total width: 390px (full width)
- Height: 64px
- Border radius: 0px (flat)
- Margin: 0px
- Background: #FFFFFF (solid)
- Border: 1px solid #F7F7F8 (top only)
- Shadow: none

**Center Button:**
- Width: 48px
- Height: 48px
- Position: relative (inline with other icons)
- Border radius: 50%
- Background: #FF7A00 (solid, no gradient)
- Shadow: 0px 1px 3px rgba(0, 0, 0, 0.1)

**Icons:**
- All icons: 24px × 24px
- Stroke width: 2px
- No labels
- Spacing: Auto flex between

**Safe Area:** 8px minimum

---

## Touch Target Verification

### iOS Guidelines (44×44px minimum)

**Premium:**
- Tab buttons: 60px × 72px ✅ (exceeds)
- Center button: 60px × 60px ✅ (exceeds)
- Active area includes label

**Standard:**
- Tab buttons: 56px × 68px ✅ (exceeds)
- Center button: 56px × 56px ✅ (exceeds)
- Active area includes label

**Minimal:**
- Tab buttons: 48px × 64px ✅ (exceeds)
- Center button: 48px × 48px ✅ (meets)
- No labels, but icon area sufficient

---

## Animation Timing Reference

```tsx
// Center Button Mount
duration: 300ms
delay: 300ms
spring: { stiffness: 260, damping: 20 }

// Tab Selection
duration: 200ms
spring: { stiffness: 400, damping: 25 }

// Glow Pulse
duration: 2000ms
repeat: Infinity
easing: ease-in-out

// Ripple Feedback
duration: 600ms
easing: ease-out

// Active Pill (layoutId)
spring: { stiffness: 400, damping: 30 }
```

---

## Color Values (Exact)

### Orange Palette
```css
Primary:        #FF7A00  rgb(255, 122, 0)
Light:          #FF8A00  rgb(255, 138, 0)
Dark:           #FF6B00  rgb(255, 107, 0)
Glow:           rgba(255, 122, 0, 0.40)
Active Pill:    rgba(255, 122, 0, 0.10)
```

### Gray Palette
```css
Gray 50:        #FAFAFA  rgb(250, 250, 250)
Gray 100:       #F7F7F8  rgb(247, 247, 248)
Gray 300:       #E5E5E7  rgb(229, 229, 231)
Gray 500:       #A0A0A0  rgb(160, 160, 160)
Gray 600:       #757575  rgb(117, 117, 117)
Gray 800:       #333333  rgb(51, 51, 51)
Gray 900:       #1F1F1F  rgb(31, 31, 31)
```

### Glass Effect
```css
Background:     rgba(255, 255, 255, 0.75)
Border:         rgba(255, 255, 255, 0.20)
Backdrop:       blur(18px) saturate(180%)
```

---

## Z-Index Layering

```
Layer Stack (bottom to top):

0   - Content (map, offers)
40  - Bottom navigation backdrop
50  - Bottom navigation container
51  - Floating center button
52  - Glow ring (behind button icon)
53  - Button icon
60  - Menu drawer overlay
70  - Menu drawer content
100 - Active reservation card
```

---

## Spacing System

### Premium
```
Horizontal:  12px edge → 60px tab → auto space → 80px center → auto → 60px tab → 12px edge
Vertical:    8px top → 56px content → 8px bottom → 16px safe area
```

### Standard
```
Horizontal:  12px edge → 56px tab → auto space → 72px center → auto → 56px tab → 12px edge
Vertical:    8px top → 52px content → 8px bottom → 12px safe area
```

### Minimal
```
Horizontal:  16px edge → 48px tab → auto space → 48px center → auto → 48px tab → 16px edge
Vertical:    8px top → 48px content → 8px bottom → 8px safe area
```

---

## Responsive Breakpoints

```css
/* Mobile First (default) */
min-width: 320px  /* iPhone SE */
ideal: 390px      /* iPhone 13 Pro */
max-width: 428px  /* iPhone 13 Pro Max */

/* Container adjusts automatically via flex */
.navigation-container {
  max-width: 480px;  /* Cap for tablets */
  margin: 0 auto;     /* Center on wide screens */
}
```

---

## Shadow Specifications

### Premium
```css
/* Container */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
/* X-offset: 0px
   Y-offset: 8px
   Blur: 32px
   Spread: 0px
   Color: #000 @ 12% opacity */

/* Floating Button */
box-shadow: 0 8px 24px rgba(255, 122, 0, 0.40);
/* Y-offset: 8px
   Blur: 24px
   Color: #FF7A00 @ 40% opacity */

/* Glow Ring */
filter: blur(24px);
opacity: 0.4;
```

### Standard
```css
/* Container */
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
/* Y-offset: 4px
   Blur: 16px
   Color: #000 @ 8% opacity */

/* Floating Button */
box-shadow: 0 4px 16px rgba(255, 138, 0, 0.30);
/* Y-offset: 4px
   Blur: 16px
   Color: #FF8A00 @ 30% opacity */
```

### Minimal
```css
/* No container shadow */

/* Center Button */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.10);
/* Y-offset: 1px
   Blur: 3px
   Color: #000 @ 10% opacity */
```

---

## Export for Figma

**Auto Layout Settings:**

Premium Container:
- Direction: Horizontal
- Spacing: Auto
- Padding: 8px vertical, 8px horizontal
- Fill: rgba(255, 255, 255, 0.75)
- Stroke: 1px rgba(255, 255, 255, 0.2)
- Corner radius: 28px
- Effects: 
  - Drop Shadow (0, 8, 32, 0, #000 @ 12%)
  - Background Blur (18px, 180% saturation)

Standard Container:
- Direction: Horizontal
- Spacing: Auto
- Padding: 8px vertical, 12px horizontal
- Fill: #FFFFFF
- Stroke: 1px #F7F7F8
- Corner radius: 24px
- Effects: Drop Shadow (0, 4, 16, 0, #000 @ 8%)

Minimal Container:
- Direction: Horizontal
- Spacing: Auto
- Padding: 8px vertical, 16px horizontal
- Fill: #FFFFFF
- Stroke: 1px #F7F7F8 (top only)
- Corner radius: 0px
- Effects: None

---

**Created:** December 3, 2025  
**Purpose:** Pixel-perfect implementation reference  
**Units:** All measurements in CSS pixels (px)
