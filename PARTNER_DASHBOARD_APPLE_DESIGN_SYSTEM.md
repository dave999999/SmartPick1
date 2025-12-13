# SmartPick Partner Dashboard - Apple Design System
**Mobile-First Architecture | Inspired by iOS Wallet + Fitness + Settings**

---

## 🎨 DESIGN TOKENS

### Typography
```typescript
// SF Pro Display - Titles
heading.large: 34px / Bold / -0.4px tracking
heading.medium: 28px / Bold / -0.3px tracking
heading.small: 22px / Semibold / -0.2px tracking

// SF Pro Text - Body
body.large: 17px / Regular / -0.2px tracking
body.medium: 15px / Medium / -0.1px tracking
body.small: 13px / Regular / 0px tracking
caption: 11px / Medium / 0.1px tracking
```

### Spacing System (8pt grid)
```
xs: 4px   (0.5rem)
sm: 8px   (1rem)
md: 12px  (1.5rem)
lg: 16px  (2rem)
xl: 24px  (3rem)
2xl: 32px (4rem)
3xl: 48px (6rem)
```

### Border Radius (Superellipse approximation)
```
card: 24px
button.primary: 18px
button.secondary: 16px
avatar: 14px
chip: 12px
```

### Colors
```typescript
// Primary Palette
mint.500: #14B8A6 (Teal)
mint.600: #0D9488
emerald.500: #10B981

// Secondary
orange.500: #FF8A00
orange.600: #E67700
blue.500: #007AFF
purple.500: #AF52DE

// Neutrals
gray.50: #F9FAFB
gray.100: #F3F4F6
gray.600: #4B5563
gray.900: #111827

// Semantic
success: #34C759
warning: #FF9500
error: #FF3B30
```

### Glassmorphism
```css
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.glass-button {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 0, 0, 0.08);
}
```

### Shadows (Subtle, Apple-style)
```css
elevation.sm: 0 2px 8px rgba(0, 0, 0, 0.04)
elevation.md: 0 4px 16px rgba(0, 0, 0, 0.06)
elevation.lg: 0 8px 32px rgba(0, 0, 0, 0.08)
elevation.xl: 0 12px 48px rgba(0, 0, 0, 0.12)

/* Colored shadows for primary actions */
shadow.teal: 0 8px 24px rgba(20, 184, 166, 0.3)
shadow.orange: 0 8px 24px rgba(255, 138, 0, 0.3)
```

---

## 📐 LAYOUT STRUCTURE

### Frame Hierarchy
```
┌─ Screen (375px min width)
│
├─ Header (Fixed)
│  ├─ Title (34px bold)
│  ├─ Subtitle (13px medium)
│  └─ Action Button (40px circle)
│
├─ Metrics Carousel (Horizontal Scroll)
│  └─ Card[] (280px × 140px each)
│     ├─ Icon Badge (40px circle)
│     ├─ Value (34px bold)
│     └─ Label (13px medium)
│
├─ Section Header
│  ├─ Title (20px bold)
│  └─ Count (13px semibold)
│
├─ Offers List (Vertical)
│  └─ OfferCard[] (height: 100px)
│     ├─ Thumbnail (64px × 64px, 16px radius)
│     ├─ Title (15px semibold)
│     ├─ Price + Quantity (13px)
│     └─ Status Pill
│
└─ Floating Action Bar (Fixed Bottom)
   ├─ Primary Button (flex-1, height: 56px)
   └─ Secondary Button (56px × 56px)
```

---

## 🎯 COMPONENT SPECS

### 1. Metric Card
**Size:** 280px × 140px  
**Border Radius:** 28px  
**Padding:** 20px  
**Background:** Gradient + Glass blur  
**Touch Target:** Entire card (tappable)

**Structure:**
```
┌─────────────────────────────┐
│  [Icon]           [Trend]   │
│   40px            chip      │
│                             │
│  1,234                      │
│  (34px bold)                │
│  Active Offers              │
│  (13px medium)              │
└─────────────────────────────┘
```

**States:**
- Default: opacity 100%
- Pressed: scale 0.98, 200ms ease-out
- Disabled: opacity 50%

**Color Variants:**
- Mint: Teal gradient + teal icon
- Orange: Amber gradient + orange icon
- Blue: Cyan gradient + blue icon
- Purple: Pink gradient + purple icon

---

### 2. Swipeable Offer Card
**Size:** Full width × 100px  
**Border Radius:** 24px  
**Background:** White glass (90% opacity)  
**Touch Target:** 44px minimum (entire card)

**Interaction Model:**
```
→ Swipe Right (80px threshold)
  └─ Action: Pause / Resume
     └─ Visual: Green or Orange circle button

← Swipe Left (80px threshold)  
  └─ Actions Revealed:
     ├─ Edit (Blue)
     ├─ Duplicate (Purple)
     └─ Delete (Red)
```

**Card Structure:**
```
┌─────────────────────────────────┐
│ [Img]  Title         [···]      │
│ 64px   Bold 15px     drag       │
│        Price • Qty              │
│        13px          [PAUSED]   │
└─────────────────────────────────┘
```

**Animation:**
- Drag: spring physics, elastic 0.2
- Reveal: fade in 200ms
- Snap back: spring damping 20

---

### 3. Floating Action Bar
**Size:** Full width - 32px (16px margins)  
**Height:** 72px (with padding)  
**Border Radius:** 24px  
**Background:** White glass + blur  
**Shadow:** Extra large with 10% opacity

**Structure:**
```
┌───────────────────────────────┐
│ [New Offer (flex-1)] [QR]     │
│  Gradient Button    Circle    │
│  56px height        56px      │
└───────────────────────────────┘
```

**Primary Button:**
- Background: Teal→Emerald gradient
- Text: White, semibold
- Icon: Plus (20px, stroke 3)
- Shadow: Teal glow
- Height: 56px (meets 44px minimum)

**Secondary Button:**
- Background: Gray-100
- Icon: QR Code (24px, stroke 2.5)
- Size: 56px × 56px
- Border Radius: 18px

---

## 📱 MOBILE OPTIMIZATION

### Small Screen Rules (≤375px)

**Touch Targets:**
- Minimum: 44px × 44px
- Recommended: 48px × 48px
- Floating buttons: 56px × 56px

**Typography Scale Down:**
```
Heading: 28px → 24px
Body: 15px → 14px
Caption: 13px → 12px
```

**Card Sizing:**
- Metric cards: 280px → 260px width
- Offer cards: Keep 100px height
- Action bar: Maintain 56px height

**Padding Adjustments:**
```
Screen edges: 16px (never less)
Card internal: 20px → 16px
Between elements: 12px → 8px
```

---

## 🎭 INTERACTION PATTERNS

### 1. Horizontal Carousel (Metrics)
```typescript
// Scroll behavior
overflow-x: auto
scroll-snap-type: x mandatory
scroll-padding: 16px

// Card snap points
scroll-snap-align: start
gap: 12px

// Hide scrollbar
scrollbar-width: none
-webkit-scrollbar: display none
```

### 2. Swipe Gestures (Offer Cards)
```typescript
// Framer Motion config
drag="x"
dragConstraints={{ left: -200, right: 100 }}
dragElastic={0.2}
onDragEnd={handleSwipe}

// Thresholds
pauseThreshold: 80px right
actionsThreshold: 80px left

// Animation
spring: { damping: 20, stiffness: 300 }
```

### 3. Haptic Feedback
```typescript
// iOS Native
import { Haptics } from '@capacitor/haptics'

onSwipeSuccess: Haptics.impact({ style: 'medium' })
onDelete: Haptics.notification({ type: 'warning' })
onComplete: Haptics.notification({ type: 'success' })
```

---

## 🎨 VISUAL HIERARCHY

### Information Density
**High Priority (Large, Bold):**
- Metric values (34px)
- Revenue (34px)
- Offer prices (15px bold)

**Medium Priority (Regular):**
- Labels (13px medium)
- Offer titles (15px semibold)
- Section headers (20px bold)

**Low Priority (Small, Subtle):**
- Captions (11px)
- Trends (10px)
- Status pills (10px)

### Color Usage
**Action Colors:**
- Primary actions: Teal gradient
- Pause: Orange
- Resume: Green
- Edit: Blue
- Duplicate: Purple
- Delete: Red

**Status Colors:**
- Active: Green-600
- Paused: Orange-600
- Draft: Gray-500

---

## 🔤 LOCALIZATION (Georgian)

### Key Translations Required
```typescript
'partner.dashboard.title': 'პარტნიორის პანელი'
'partner.dashboard.activeOffers': 'აქტიური შეთავაზებები'
'partner.dashboard.pickedUp': 'აღებული'
'partner.dashboard.revenueToday': 'დღევანდელი შემოსავალი'
'partner.dashboard.newOffer': 'ახალი შეთავაზება'
'partner.dashboard.noOffers': 'შეთავაზებები არ არის'
'offers.left': 'დარჩა'
'offers.total': 'სულ'
```

---

## 📊 PERFORMANCE TARGETS

### Core Web Vitals
- LCP: < 1.2s (Metric cards render)
- FID: < 50ms (Swipe response)
- CLS: < 0.05 (No layout shift)

### Animation
- 60 FPS for all interactions
- Spring animations: damping 20, stiffness 300
- Transitions: 200ms ease-out

### Bundle Size
- Component: < 15KB gzipped
- Assets (icons): < 5KB
- Total: < 20KB additional

---

## 🚀 IMPLEMENTATION CHECKLIST

### Phase 1: Foundation
- [x] Design tokens defined
- [x] Component structure created
- [ ] Framer Motion installed
- [ ] Glassmorphism styles applied

### Phase 2: Components
- [x] MetricCard with variants
- [x] OfferCard with swipe
- [x] Floating action bar
- [ ] Empty state
- [ ] Loading skeletons

### Phase 3: Interactions
- [ ] Swipe to pause/resume
- [ ] Swipe to reveal actions
- [ ] Horizontal scroll snap
- [ ] Haptic feedback (iOS)

### Phase 4: Polish
- [ ] Micro-animations
- [ ] Sound effects (optional)
- [ ] Dark mode support
- [ ] Accessibility labels

---

## 🎯 SUCCESS METRICS

**Usability:**
- Time to create offer: < 30s
- Time to pause offer: < 2s (one swipe)
- Error rate: < 2%

**Engagement:**
- Daily active partners: +30%
- Offers created per session: +50%
- Session duration: +40%

**Performance:**
- Load time: < 1s
- Interaction delay: < 50ms
- Crash rate: < 0.1%

---

**Design by: SmartPick Design Team**  
**Inspired by: Apple iOS Human Interface Guidelines**  
**Version: 2.0 - December 2025**
