# 🎨 Product Detail Modal Redesign - Complete Documentation

## 📐 WIREFRAME & LAYOUT STRUCTURE

```
┌─────────────────────────────────────────┐
│  ╔═══════════════════════════════════╗  │ ← Header Image (180px height)
│  ║   [Product Image]                 ║  │   Bottom gradient overlay
│  ║                          [BAKERY] ║  │   Category badge top-right
│  ╚═══════════════════════════════════╝  │   
├─────────────────────────────────────────┤
│  🍞 Khachapuri                           │ ← Title (bold, 20px)
│  📍 Ermasan Savartsato                  │ ← Partner (14px, muted)
│  [FB] [TW] [IG]                    →   │ ← Social icons (right-aligned, tiny)
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │ ← Wallet Card
│  │ 💰 Your Balance    This costs     │  │   (Soft mint bg, compact)
│  │ 4481 SmartPoints   5 pts          │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │ ← Price + Quantity Card
│  │ Smart Price         2 GEL 40 GEL  │  │   (Combined, clean layout)
│  │ Save 95% with SmartPick           │  │
│  │                                   │  │
│  │      [-]    1    [+]             │  │   ← Quantity selector
│  │      55 left                      │  │
│  │   Max 3 per offer                 │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │ ← SmartPick Info Card
│  │ ⏱️ How SmartPick works            │  │   (Subtle hint)
│  │ Reserve now → Pick up within 1hr  │  │
│  │ → Show QR code in store           │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  Total Price              2.00 GEL     │ ← Total (bold, clean)
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │ ← Pickup Window
│  │ 🕒 Pickup Window    11h 22m left  │  │   (Compact card)
│  │ 03:36 AM — 03:36 PM               │  │
│  │ Ermasan Savartsato                │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  ╔═══════════════════════════════════╗  │ ← Reserve Button
│  ║      Reserve Now                  ║  │   (Large, prominent)
│  ╚═══════════════════════════════════╝  │
│  Your reservation will be held for 1hr │ ← Footer hint
└─────────────────────────────────────────┘
```

## 🎨 FIGMA-LEVEL DESIGN SYSTEM

### Component Tree
```
ReservationModal (Dialog)
├── HeaderImage
│   ├── Image (aspect-ratio: 16:9, h-48)
│   ├── GradientOverlay (from-black/40)
│   └── CategoryBadge (absolute top-3 right-3)
├── ContentContainer (px-5 pb-5 pt-4)
│   ├── TitleSection
│   │   ├── ProductTitle (text-xl font-bold)
│   │   ├── PartnerRow
│   │   │   ├── MapPin icon (h-3.5)
│   │   │   └── Partner name (text-sm)
│   │   └── SocialShare
│   │       ├── Label (text-xs)
│   │       └── IconButtons (h-4 w-4 each)
│   ├── WalletCard
│   │   ├── Balance section (left)
│   │   └── Cost section (right)
│   ├── PriceQuantityCard
│   │   ├── PriceRow
│   │   │   ├── Smart Price (text-2xl)
│   │   │   └── Original Price (line-through)
│   │   ├── Savings label
│   │   └── QuantitySelector
│   │       ├── Minus button (w-9 h-9)
│   │       ├── Quantity display
│   │       └── Plus button (w-9 h-9)
│   ├── SmartPickHint
│   │   ├── Clock icon
│   │   └── Info text (text-xs)
│   ├── TotalPrice
│   │   ├── Label
│   │   └── Amount (text-2xl)
│   ├── PickupWindowCard
│   │   ├── Header row (icon + badge)
│   │   ├── Time range
│   │   └── Location
│   └── ReserveButton
│       ├── Button (py-6 rounded-xl)
│       └── Footer hint (text-xs)
```

### Spacing & Sizing Rules
```
Modal:
- Max width: 448px (max-w-lg)
- Max height: 95vh
- Padding: 0 (content handles padding)
- Border radius: 12px (rounded-xl)

Header Image:
- Height: 192px (h-48) [Reduced from ~300px]
- Width: 100%
- Border radius: 12px 12px 0 0

Content Padding:
- Horizontal: 20px (px-5)
- Vertical top: 16px (pt-4)
- Vertical bottom: 20px (pb-5)
- Gap between sections: 16px (space-y-4)

Cards:
- Border radius: 12px (rounded-xl) or 8px (rounded-lg)
- Padding: 12-14px (p-3 to p-3.5)
- Border: 1px solid
- Shadow: subtle (shadow-sm)

Typography:
- Title: 20px/1.2 font-bold
- Subtitle: 14px font-normal
- Price large: 24px font-bold
- Labels: 12px font-medium
- Body: 14px font-normal
- Hints: 12px font-normal

Icons:
- Small: 14px (h-3.5 w-3.5)
- Medium: 16px (h-4 w-4)
- Large: 20px (h-5 w-5)

Buttons:
- Height: 48px (py-6)
- Border radius: 12px (rounded-xl)
- Font size: 16px (text-base)
- Font weight: 600 (font-semibold)
```

### Color Palette
```
Primary (Mint):
- mint-50: #EFFFF8
- mint-100: #D0FFF0
- mint-200: #A3FFE0
- mint-500: #4CC9A8
- mint-600: #00C896
- mint-700: #00B588

Accent (Orange/Amber):
- orange-50: #FFF7ED
- orange-200: #FED7AA
- orange-600: #EA580C
- amber-50: #FFFBEB

Neutrals:
- gray-50: #F9FAFB
- gray-100: #F3F4F6
- gray-200: #E5E7EB
- gray-400: #9CA3AF
- gray-500: #6B7280
- gray-600: #4B5563
- gray-700: #374151
- gray-900: #111827

States:
- Success: mint-600
- Warning: orange-600
- Error: red-600
- Info: blue-600
```

### Interaction States
```
Buttons:
- Default: mint-600 bg, white text
- Hover: mint-700 bg, shadow-xl
- Active: mint-800 bg, scale-98
- Disabled: gray-300 bg, gray-500 text, opacity-50

Social Icons:
- Default: gray-400
- Hover: color-specific (blue-600, sky-600, pink-600)
- Hover bg: color-50 (blue-50, sky-50, pink-50)
- Transition: all 200ms ease

Quantity Buttons:
- Default: white bg, gray-200 border
- Hover: mint-50 bg, mint-300 border
- Active: mint-100 bg
- Disabled: opacity-40, cursor-not-allowed

Cards:
- Default: white bg or colored-50 bg
- Hover: subtle lift (shadow-md)
- Active: no change
```

## 📱 MOBILE MOCKUP DESCRIPTION

```
Mobile (375px width):
┌────────────────────┐
│ [Product Image]    │ ← 180px height, full width
│              [CAT] │   Category badge visible
├────────────────────┤
│ Title              │ ← 18px on mobile
│ 📍 Partner         │   14px, truncate if needed
│ [Share icons]   →  │   Right-aligned
├────────────────────┤
│ 💰 Balance | Cost  │ ← Wallet card, flex row
├────────────────────┤
│ Smart Price: 2 GEL │ ← Price card stacks
│ Save 95%           │   vertically on mobile
│ [-] 1 [+]          │   Quantity centered
│ Max 3 per offer    │
├────────────────────┤
│ ⏱️ How it works    │ ← Info card, 2 lines
│ Reserve → Pickup   │   max on mobile
├────────────────────┤
│ Total: 2.00 GEL    │ ← Clean total row
├────────────────────┤
│ 🕒 Pickup Window   │ ← Compact pickup
│ 03:36 — 03:36      │   card
├────────────────────┤
│ [Reserve Now]      │ ← Full-width button
│ Held for 1 hour    │   Footer hint below
└────────────────────┘
```

Behavior:
- Modal opens with fade-in animation (300ms)
- Content scrolls smoothly with momentum
- Reserve button stays in view (no sticky needed due to compact design)
- Image doesn't scroll out (stays at top)
- Tappable areas minimum 44px height
- Safe area padding on notched devices

## 🎭 ICON PACK & USAGE

### Required Icons (Lucide React)
```typescript
import {
  Clock,        // ← Pickup window, how it works
  MapPin,       // ← Partner location
  Coins,        // ← SmartPoints/wallet
  Minus,        // ← Quantity decrease
  Plus,         // ← Quantity increase
  AlertCircle,  // ← Warnings, errors
  Facebook,     // ← Social share
  Twitter,      // ← Social share
  Instagram,    // ← Social share
  Shield,       // ← Security/rate limit
} from 'lucide-react';
```

### Icon Sizing Chart
```
Component          | Icon       | Size  | Color
-------------------|------------|-------|------------
Wallet card        | Coins      | 16px  | mint-600
Partner row        | MapPin     | 14px  | mint-600
Pickup window      | Clock      | 16px  | orange-600
How it works       | Clock      | 14px  | mint-600
Social buttons     | Social     | 16px  | gray-400 → hover-color
Quantity buttons   | Plus/Minus | 16px  | gray-600
Warnings           | AlertCircle| 16px  | context-color
```

### Icon Styling Pattern
```tsx
<div className="bg-mint-100 rounded-full p-1.5">
  <Clock className="h-4 w-4 text-mint-600" />
</div>
```

## 🎬 ANIMATION & TRANSITIONS

### Modal Entrance
```css
Modal wrapper:
- opacity: 0 → 1 (300ms ease-out)
- transform: scale(0.95) → scale(1)
- backdrop: blur(0) → blur(4px)

Content:
- opacity: 0 → 1 (200ms ease-out, delay 100ms)
- transform: translateY(20px) → translateY(0)
```

### Micro-Animations
```typescript
Button press:
- Scale: 1 → 0.98 (150ms ease-in-out)
- Shadow: shadow-lg → shadow-md
- Background: mint-600 → mint-700

Quantity selector:
- On click: scale(1) → scale(1.1) → scale(1) (200ms)
- Background: white → mint-50 → white
- Border: gray-200 → mint-300

Social icon hover:
- Transform: translateY(0) → translateY(-2px)
- Background: transparent → color-50
- Color: gray-400 → color-600
- Transition: all 200ms ease

Card hover (optional):
- Shadow: shadow-sm → shadow-md (200ms)
- Transform: translateY(0) → translateY(-2px)
```

### Scroll Behavior
```typescript
Image behavior:
- Stays fixed at top (position: sticky not needed)
- Gradient overlay always visible

Content scroll:
- Smooth scrolling enabled
- Momentum scrolling on iOS
- No bounce at bottom
- Reserve button always visible (no sticky needed)

Loading states:
- Button text: "Reserve Now" → "Creating Reservation..."
- Button: Disabled state + loading spinner (optional)
- Opacity: 1 → 0.6
```

## 🖱️ INTERACTION & BEHAVIOR LOGIC

### Modal Opening
```typescript
1. User clicks offer card
2. Modal fades in (300ms)
3. Backdrop blurs (300ms)
4. Content slides up (200ms, delay 100ms)
5. Focus trapped inside modal
6. Body scroll locked
7. ESC key closes modal
```

### Quantity Selection
```typescript
States:
- Min: 1 (minus button disabled)
- Max: min(3, offer.quantity_available)
- Step: 1

Behavior:
- Click minus: quantity--
- Click plus: quantity++
- Disabled when: penalty active OR quantity at boundary
- Visual feedback: scale animation on click
- Updates total price immediately
- Updates points cost immediately
```

### Social Sharing
```typescript
Facebook:
- Opens popup window (600x400)
- Shares offer URL with OG tags
- Toast: "Opening Facebook share..."

Twitter:
- Opens popup window (600x400)
- Pre-filled text with offer details
- Toast: "Opening Twitter share..."

Instagram:
- Copies link to clipboard
- Toast: "Link copied! Open Instagram..."
- Fallback: Shows link in toast
```

### Reserve Button
```typescript
Conditions:
- Enabled: user has enough points AND not expired AND no penalty
- Disabled: insufficient points OR expired OR penalty active
- Loading: shows "Creating Reservation..."

Click flow:
1. Validate points balance
2. Check rate limits
3. Get CSRF token
4. Create reservation API call
5. Deduct points locally
6. Show success toast
7. Navigate to reservation detail page
8. Close modal

Error handling:
- Show error toast with retry button
- Reset loading state
- Keep modal open for retry
```

### Scroll Behavior
```typescript
Desktop:
- Max height: 95vh
- Overflow-y: auto
- Smooth scrolling
- Custom scrollbar (webkit)

Mobile:
- Max height: 95vh
- Overflow-y: auto
- Native momentum scrolling
- No custom scrollbar
- Safe area padding

Sticky elements:
- None (compact design keeps button in view)
```

## 📏 RESPONSIVE BREAKPOINTS

```css
Mobile (default):
- Width: 100% (max 448px)
- Padding: 20px
- Image height: 180px
- Font sizes: smaller
- Button: full width

Tablet (640px+):
- Width: 448px
- Padding: 24px
- Image height: 192px
- Font sizes: base
- Button: full width

Desktop (1024px+):
- Width: 448px
- Padding: 24px
- Image height: 192px
- Font sizes: base
- Button: full width
- Hover states active
```

## 🚦 STATE MANAGEMENT PRESERVATION

```typescript
// ✅ PRESERVED - Do not modify
const [quantity, setQuantity] = useState(1);
const [isReserving, setIsReserving] = useState(false);
const [penaltyInfo, setPenaltyInfo] = useState<PenaltyInfo | null>(null);
const [countdown, setCountdown] = useState('');
const [pointsBalance, setPointsBalance] = useState<number>(0);
const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);
const [insufficientPoints, setInsufficientPoints] = useState(false);

// ✅ PRESERVED - Do not modify
const isProcessingRef = useRef(false);
const lastClickTimeRef = useRef(0);

// ✅ PRESERVED - Business logic constants
const POINTS_PER_UNIT = 5;
const DEBOUNCE_MS = 2000;

// ✅ PRESERVED - All useEffect hooks
// ✅ PRESERVED - All API calls and error handling
// ✅ PRESERVED - All business logic functions
```

## 📦 COMPONENT FILES TO CREATE

```
src/components/reservation/
├── HeaderImage.tsx          [NEW]
├── TitleSection.tsx         [NEW]
├── WalletCard.tsx           [NEW]
├── PriceQuantityCard.tsx    [NEW]
├── SmartPickHint.tsx        [NEW]
├── PickupWindowCard.tsx     [NEW]
└── ReserveButton.tsx        [NEW]
```

Each component:
- Fully typed with TypeScript
- Uses shadcn/ui components
- Tailwind styling only
- Exported as default
- Documented props interface
- No business logic (presentational only)

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Create HeaderImage component
- [ ] Create TitleSection component
- [ ] Create WalletCard component
- [ ] Create PriceQuantityCard component
- [ ] Create SmartPickHint component
- [ ] Create PickupWindowCard component
- [ ] Create ReserveButton component
- [ ] Rewrite ReservationModal.tsx with new layout
- [ ] Preserve all state management
- [ ] Preserve all business logic
- [ ] Preserve all API calls
- [ ] Add animations and transitions
- [ ] Test on mobile viewport
- [ ] Test on desktop viewport
- [ ] Verify all functionality works
- [ ] Build passes without errors

---

**Design Philosophy**: Wolt-grade means clean, minimal, fast, and premium. Every pixel serves a purpose. White space is intentional. Colors guide attention. Animations delight without distracting.
