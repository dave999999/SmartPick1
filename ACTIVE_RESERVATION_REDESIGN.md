# Active Reservation Modal - Apple-Inspired Minimal Design

## 🎯 Design Overview

Complete redesign of the Active Reservation Modal to match Apple Maps/Uber minimal aesthetic with SmartPick branding.

## 📐 Figma Layout Description

### Frame Structure (393×844 iPhone)

```
App Container
├── Google Map (full height, z-0)
│   ├── Route polyline (blue)
│   ├── User marker (A)
│   └── Destination marker (B)
│
└── Status Card (fixed bottom, z-40)
    ├── Drag Handle
    ├── Countdown Square (180×180)
    │   ├── SVG Border (animated)
    │   └── QR Code (132×132)
    ├── Time Display
    ├── Offer Information
    ├── Info Chips
    └── Action Buttons
```

### Component Hierarchy

```
motion.div (Status Card)
├── div.drag-handle
│   └── div.indicator (w-20 h-1 bg-gray-300 rounded-full)
│
├── AnimatePresence
│   ├── Minimized View (120px height)
│   │   ├── img (offer thumbnail, 64×64, rounded-2xl)
│   │   ├── div.text-content
│   │   │   ├── p.title (text-base font-bold)
│   │   │   └── p.partner (text-sm text-gray-600)
│   │   └── div.countdown (text-2xl font-mono)
│   │
│   └── Full View (auto height)
│       ├── SquareCountdownBorder (180×180)
│       │   ├── svg (gradient stroke, animated)
│       │   └── div.qr-container (bg-white rounded-3xl p-4 shadow-sm)
│       │       ├── QRCodeSVG (132×132)
│       │       └── p.hint (text-[9px] text-gray-400)
│       │
│       ├── div.time-display (text-center)
│       │   ├── div.countdown (text-4xl font-bold font-mono)
│       │   └── div.label (text-[10px] uppercase text-gray-400)
│       │
│       ├── div.offer-info (text-center)
│       │   ├── p.title (text-base font-bold)
│       │   └── p.partner (text-sm text-gray-600)
│       │
│       ├── div.info-chips (flex gap-2 justify-center)
│       │   ├── div.distance-chip (bg-blue-50 rounded-full)
│       │   │   ├── MapPin icon (w-3.5 h-3.5 text-blue-500)
│       │   │   └── span (text-xs font-medium)
│       │   └── div.quantity-chip (bg-gray-100 rounded-full)
│       │       └── span (text-xs font-semibold)
│       │
│       └── div.buttons (flex gap-3)
│           ├── Button.cancel (outline, orange border, h-11, rounded-full)
│           └── Button.navigate (solid orange gradient, h-11, rounded-full)
```

## 🎨 Design Tokens

### Spacing System (Tailwind Classes)

```typescript
// Padding
Card Container: px-6 pb-6 (24px horizontal, 24px bottom)
QR Container: p-4 (16px all sides)
Info Chips: px-3 py-1.5 (12px horizontal, 6px vertical)

// Gaps
Vertical sections: space-y-4 (16px gaps)
Button row: gap-3 (12px gap)
Chip row: gap-2 (8px gap)
Text stacks: space-y-1 (4px gaps)

// Margins
QR top: pt-2 (8px)
Button section: pt-2 (8px)
Chip text icon: gap-1.5 (6px)
```

### Corner Radius

```css
Card: rounded-t-3xl (24px top corners)
QR Square: rounded-3xl (24px all corners)
QR Inner: rounded-3xl (24px)
Buttons: rounded-full (9999px)
Offer Image: rounded-2xl (16px)
Info Chips: rounded-full (9999px)
Drag Handle: rounded-full (9999px)
```

### Shadows

```css
Card: shadow-2xl
QR Container: shadow-sm
Modal: shadow-lg
Button: shadow-md shadow-orange-500/30
```

### Colors

```typescript
// Countdown Border (Dynamic)
Green (>15min): #35C759 (SmartPick green)
Amber (5-15min): #F59E0B (amber-500)
Red (<5min): #EF4444 (red-500)

// Buttons
Orange Primary: #FF7A00 → #FF9933 (gradient)
Orange Border: #FF7A00
Orange Hover: #FF6600 → #FF8800

// Background
Card: bg-white/95 backdrop-blur-xl
Chips Blue: bg-blue-50
Chips Gray: bg-gray-100
Modal: bg-gradient-to-br from-orange-50 to-amber-50

// Text
Primary: text-gray-900
Secondary: text-gray-600
Muted: text-gray-400
Icons: text-blue-500
```

### Typography

```css
/* Countdown */
font-size: 2.25rem (text-4xl)
font-weight: 700 (bold)
font-family: monospace (font-mono)

/* Offer Title */
font-size: 1rem (text-base)
font-weight: 700 (bold)

/* Partner Name */
font-size: 0.875rem (text-sm)
color: text-gray-600

/* Labels */
font-size: 0.625rem (text-[10px])
text-transform: uppercase
letter-spacing: 0.05em
```

## 🔧 Technical Implementation

### File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── card.tsx (Shadcn)
│   │   ├── button.tsx (Shadcn)
│   │   └── dialog.tsx (Shadcn)
│   └── reservation/
│       └── ActiveReservationCard.tsx (✨ NEW)
```

### Key Components

#### 1. SquareCountdownBorder

**Purpose:** Animated SVG border around QR code square

**Implementation:**
```typescript
<svg width={180} height={180}>
  <rect
    x={2} y={2}
    width={176} height={176}
    rx={20} ry={20}
    fill="none"
    stroke="url(#progressGradient)"
    strokeWidth={4}
    strokeDasharray={pathLength}
    strokeDashoffset={strokeDashoffset}
    strokeLinecap="round"
  />
</svg>
```

**Animation:**
- Path length: `(180 - 40) * 4 + (2π * 20) = 685px`
- Progress: `offset = pathLength - (pathLength * progressPercent / 100)`
- Transition: `duration-1000 ease-linear`

**Color Logic:**
```typescript
let strokeColor = '#35C759'; // >15min
if (minutes < 5) strokeColor = '#EF4444'; // <5min
else if (minutes < 15) strokeColor = '#F59E0B'; // 5-15min
```

#### 2. useCountdown Hook

**Purpose:** Real-time countdown with progress calculation

```typescript
function useCountdown(expiresAt: string | null) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(expiresAt).getTime();
      const diff = Math.max(0, target - now);
      setRemainingMs(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const ms = remainingMs ?? 0;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const progressPercent = Math.min(100, (ms / (30 * 60 * 1000)) * 100);

  return { formatted, isExpired: ms <= 0, progressPercent, minutes };
}
```

#### 3. QRModal Component

**Purpose:** Full-screen QR code preview dialog

**Features:**
- Gradient background (orange-50 → amber-50)
- Large QR code (280×280px)
- Countdown timer display
- Close button with smooth animation

```typescript
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-md p-0 bg-gradient-to-br from-orange-50 to-amber-50">
    <div className="p-6 space-y-6">
      <QRCodeSVG value={qrPayload} size={280} level="H" />
    </div>
  </DialogContent>
</Dialog>
```

### Gesture Handlers

#### Double-Tap to Minimize

```typescript
const lastTapRef = useRef<number>(0);

const handleCardTap = () => {
  const now = Date.now();
  const timeSinceLastTap = now - lastTapRef.current;

  if (timeSinceLastTap < 300) {
    setIsMinimized(!isMinimized); // Double tap
  }
  lastTapRef.current = now;
};
```

#### Tap QR to Open Modal

```typescript
<div
  onClick={(e) => {
    e.stopPropagation();
    setShowQRModal(true);
  }}
>
  {/* QR Code */}
</div>
```

### Animations

#### Card Entry

```typescript
<motion.div
  initial={{ y: 100, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
/>
```

#### State Transitions

```typescript
<AnimatePresence mode="wait">
  {isMinimized ? (
    <motion.div
      key="minimized"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  ) : (
    <motion.div
      key="full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  )}
</AnimatePresence>
```

#### QR Hover Effect

```css
.hover:scale-105 .active:scale-95 .transition-transform
```

## 📱 States

### 1. Full View (Default)
- **Height:** Auto (approx 500-550px)
- **Content:** QR code, countdown, full details, buttons
- **Interaction:** Double-tap to minimize

### 2. Minimized View
- **Height:** 120px
- **Content:** Thumbnail, title, partner, countdown
- **Interaction:** Double-tap to expand

## 🎬 Interactions

| Action | Trigger | Result |
|--------|---------|--------|
| Tap QR Square | Single tap | Opens full-screen QR modal |
| Double-tap Card | 2 taps <300ms | Toggle minimize/expand |
| Tap Cancel | Single tap | Confirmation dialog → Cancel reservation |
| Tap Navigate | Single tap | Launch Google Maps navigation |
| Tap Modal Background | Single tap | Close QR modal |

## 🚀 Performance Optimizations

### 1. Countdown Updates
```typescript
// Update every 1000ms (1 second)
const interval = setInterval(updateCountdown, 1000);
```

### 2. SVG Animations
```css
/* Hardware-accelerated transform */
.transition-all duration-1000 ease-linear
```

### 3. Backdrop Blur
```css
/* Use sparingly, GPU-intensive */
bg-white/95 backdrop-blur-xl
```

### 4. Image Optimization
```typescript
// Use optimized image sizes
<img src={reservation.imageUrl} alt="" loading="lazy" />
```

## 🐛 Bug Fixes

### IntersectionObserver Issue (RESOLVED)

**Previous Error:**
```
IntersectionObserver parameter 1 is not of type 'Element'
```

**Solution:** Removed draggable behavior and IntersectionObserver usage. Card is now fixed-position with double-tap minimize instead.

## 📦 Dependencies

```json
{
  "dependencies": {
    "framer-motion": "^10.x",
    "qrcode.react": "^3.x",
    "lucide-react": "^0.x",
    "@radix-ui/react-dialog": "^1.x"
  }
}
```

## ✅ Checklist

- [x] Apple-inspired minimal design
- [x] Square QR with rounded corners
- [x] Animated countdown border (SVG)
- [x] Double-tap to minimize
- [x] Tap QR for full-screen modal
- [x] Clean shadows and spacing
- [x] Smooth spring animations
- [x] SmartPick orange branding
- [x] Fixed card (non-draggable)
- [x] Minimized state (120px)
- [x] Full state (auto height)
- [x] Color-coded urgency (green/amber/red)
- [x] Shadcn UI integration
- [x] Tailwind design tokens
- [x] TypeScript types
- [x] Performance optimized
- [x] No other app components modified

## 🎯 Result

Clean, minimal, Apple-inspired reservation card that:
- Feels premium and modern
- Uses soft shadows and blur effects
- Has smooth, delightful animations
- Maintains SmartPick branding
- Provides excellent UX with gestures
- Optimized for performance

**File:** `src/components/reservation/ActiveReservationCard.tsx`
