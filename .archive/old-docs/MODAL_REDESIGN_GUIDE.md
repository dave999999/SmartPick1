# SmartPick Reservation Modal - Complete Redesign Guide

## 🎨 Design Philosophy

Premium, minimal, spacious design inspired by **Stripe, Airbnb, TooGoodToGo, and Wolt**. Light mode only, no neon effects, balanced typography, and clear visual hierarchy.

---

## 📐 Layout Structure

### 1. Full-Width Header Image
**Component:** `HeaderImage.tsx`

```tsx
- Width: 100%
- Height: 208px (52 × 4px = h-52)
- Border Radius: rounded-t-2xl (16px top corners)
- Object Fit: cover
- Shadow Transition: Soft gradient at bottom (white/80 opacity)
```

**Design Tokens:**
```css
.header-image {
  width: 100%;
  height: 208px;
  border-radius: 16px 16px 0 0;
  object-fit: cover;
}

.shadow-transition {
  background: linear-gradient(to top, rgba(255, 255, 255, 0.8), transparent);
  height: 32px;
}
```

**Key Features:**
- No circular image
- No white space above/below
- Fallback: Large emoji (text-7xl) centered
- Gradient background for missing images: `from-gray-50 to-gray-100`

---

### 2. Title Section
**Component:** `TitleSection.tsx`

**Layout:**
```tsx
- Padding: px-5 pt-5 pb-3
- Title: text-[17px] font-semibold text-[#111]
- Time Badge: bg-green-100 text-green-700, right-aligned, rounded-full
- Description: text-sm text-gray-600
- Fallback Text (no description): text-xs text-gray-400
  "Ready for pickup. Limited stock."
```

**Typography:**
```css
.title {
  font-size: 17px;
  font-weight: 600;
  color: #111111;
  line-height: 1.3;
}

.time-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  background: #DCFCE7;
  color: #15803D;
}

.description {
  font-size: 14px;
  color: #6B7280;
}

.fallback-text {
  font-size: 12px;
  color: #D1D5DB;
}
```

---

### 3. User Balance Pill (Small Section)
**Component:** `UnifiedPriceCard.tsx` (Top Element)

**Design:**
```tsx
- Display: inline-flex
- Background: white
- Border: 1px solid rgba(0,0,0,0.06)
- Border Radius: rounded-full
- Padding: px-3 py-2
- Shadow: shadow-sm
- Icon: 🪙 (coin emoji)
```

**Structure:**
```
🪙 Your Balance: 210 Points
```

**Tokens:**
```css
.balance-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 9999px;
  padding: 8px 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.balance-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.balance-value {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.balance-unit {
  font-size: 12px;
  color: #6B7280;
}
```

---

### 4. Pickup Price Section (Clean Text, No Big Box)
**Component:** `UnifiedPriceCard.tsx`

**Layout:**
```tsx
- No card background
- Just clean text with proper hierarchy
- Green color for discount price: #059669
- Gray crossed-out for original: #9CA3AF
```

**Structure:**
```
PICKUP PRICE TODAY
4.00 GEL
Original Price: ~10.00 GEL~
```

**Typography:**
```css
.price-label {
  font-size: 12px;
  font-weight: 500;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.price-value {
  font-size: 30px;
  font-weight: 700;
  color: #059669;
  line-height: 1;
}

.price-unit {
  font-size: 16px;
  font-weight: 500;
  color: #059669;
}

.original-price {
  font-size: 14px;
  color: #9CA3AF;
  text-decoration: line-through;
}
```

---

### 5. Reservation Cost (MAIN BLOCK - Visually Dominant)
**Component:** `UnifiedPriceCard.tsx`

**This is the MOST important section!**

**Design:**
```tsx
- Background: gradient-to-br from-orange-50 to-orange-100/50
- Border: 1px solid rgba(251, 146, 60, 0.5) (orange-200/50)
- Border Radius: rounded-2xl (16-20px)
- Padding: p-6
- Shadow: shadow-md
- Center Alignment: text-center
```

**Structure:**
```
✨ Reservation Cost

5

Points

Reserving costs points.
Payment is completed at pickup.
```

**Typography:**
```css
.reservation-card {
  background: linear-gradient(to bottom right, #FFF7ED, rgba(255, 237, 213, 0.5));
  border: 1px solid rgba(251, 146, 60, 0.5);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  text-align: center;
}

.reservation-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.reservation-points {
  font-size: 48px;
  font-weight: 700;
  color: #F97316;
  line-height: 1;
  letter-spacing: -0.02em;
}

.reservation-unit {
  font-size: 18px;
  font-weight: 500;
  color: #F97316;
}

.reservation-subtitle {
  font-size: 14px;
  color: #6B7280;
  line-height: 1.5;
  max-width: 280px;
  margin: 0 auto;
  border-top: 1px solid rgba(251, 146, 60, 0.5);
  padding-top: 12px;
}

.reservation-emphasis {
  font-weight: 500;
}
```

---

### 6. Quantity Selector (Integrated Design)
**Component:** `UnifiedPriceCard.tsx`

**Only shown if `maxQuantity > 1`**

**Design:**
```tsx
- Background: white
- Border: 1px solid rgba(0,0,0,0.06)
- Border Radius: rounded-xl (12px)
- Padding: p-4
- Shadow: shadow-sm
- Buttons: 44×44px minimum, rounded-full
- MAX badge: Integrated inside, not floating
```

**Layout:**
```
[ - ]    5    [ + ]
       MAX 10
```

**Button Design:**
```css
.quantity-container {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.quantity-button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  transition: all 150ms ease;
}

.quantity-button:hover {
  background: #F3F4F6;
}

.quantity-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quantity-number {
  font-size: 36px;
  font-weight: 700;
  color: #111827;
  line-height: 1;
}

.quantity-max-badge {
  font-size: 10px;
  font-weight: 600;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 6px;
}
```

---

### 7. CTA Button
**Component:** `ReserveButton.tsx`

**Design:**
```tsx
- Width: 100% (w-full)
- Height: 56px (h-14 = 48-56px)
- Border Radius: rounded-xl (12-14px)
- Background: #F97316 (orange-500)
- Hover: #EA580C (orange-600)
- Active: #DC2626 (red-600)
- Shadow: shadow-md, hover:shadow-lg
- Icon: 🪙 (small coin, text-base)
```

**Typography:**
```css
.cta-button {
  width: 100%;
  height: 56px;
  border-radius: 12px;
  background: #F97316;
  color: white;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  transition: all 150ms ease;
}

.cta-button:hover {
  background: #EA580C;
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

.cta-button:active {
  background: #DC2626;
  transform: scale(0.98);
}

.cta-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cta-footer {
  font-size: 12px;
  font-weight: 500;
  color: #9CA3AF;
  text-align: center;
  margin-top: 10px;
}
```

**Text:**
```
Reserve This Deal

Reservation held for 1 hour
```

---

## 🎨 Color System

### Primary Palette
```css
--orange-primary: #F97316;      /* Main CTA, points accent */
--orange-hover: #EA580C;        /* Hover state */
--orange-active: #DC2626;       /* Active state */
--green-price: #059669;         /* Discount price */
--green-badge: #15803D;         /* Time badge text */
--green-badge-bg: #DCFCE7;      /* Time badge background */
```

### Neutrals
```css
--gray-900: #111827;            /* Primary text */
--gray-700: #374151;            /* Secondary text */
--gray-600: #4B5563;            /* Tertiary text */
--gray-500: #6B7280;            /* Muted text */
--gray-400: #9CA3AF;            /* Placeholder text */
--gray-200: #E5E7EB;            /* Borders */
--gray-100: #F3F4F6;            /* Subtle backgrounds */
--gray-50: #F9FAFB;             /* Light backgrounds */
```

### Semantic Colors
```css
--white: #FFFFFF;
--black: #000000;
--border: rgba(0, 0, 0, 0.06);  /* Subtle borders */
--shadow-light: rgba(0, 0, 0, 0.05);
--shadow-medium: rgba(0, 0, 0, 0.07);
--shadow-heavy: rgba(0, 0, 0, 0.1);
```

---

## 📏 Spacing System

### Component Padding
```css
--spacing-xs: 8px;    /* py-2 */
--spacing-sm: 12px;   /* py-3 */
--spacing-md: 16px;   /* py-4 */
--spacing-lg: 20px;   /* py-5 */
--spacing-xl: 24px;   /* py-6 */
```

### Component Gaps
```css
--gap-tight: 8px;     /* space-y-2 */
--gap-default: 12px;  /* space-y-3 */
--gap-relaxed: 16px;  /* space-y-4 */
--gap-loose: 24px;    /* space-y-6 */
```

---

## 🔤 Typography Scale

### Font Sizes
```css
--text-xs: 12px;      /* Small labels, badges */
--text-sm: 14px;      /* Body text, descriptions */
--text-base: 16px;    /* Button text, primary labels */
--text-lg: 18px;      /* Section titles */
--text-xl: 20px;      /* Unused */
--text-2xl: 24px;     /* Price values */
--text-3xl: 30px;     /* Large price displays */
--text-4xl: 36px;     /* Quantity numbers */
--text-5xl: 48px;     /* Reservation cost (main) */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights
```css
--leading-none: 1;
--leading-tight: 1.3;
--leading-relaxed: 1.5;
```

---

## 🎯 Border Radius System

```css
--radius-sm: 8px;     /* rounded-lg */
--radius-md: 12px;    /* rounded-xl */
--radius-lg: 16px;    /* rounded-2xl */
--radius-full: 9999px; /* rounded-full */
```

---

## 🌊 Shadow System

```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);          /* shadow-sm */
--shadow-sm: 0 4px 6px rgba(0, 0, 0, 0.07);          /* shadow-md */
--shadow-md: 0 10px 15px rgba(0, 0, 0, 0.1);         /* shadow-lg */
--shadow-lg: 0 20px 25px rgba(0, 0, 0, 0.15);        /* shadow-xl */
```

---

## 📱 Mobile Layout Rules

### Responsive Breakpoints
```css
/* All designs are mobile-first */
- Modal max-width: 95vw
- Modal max-height: 90vh
- Image height: 180-220px (static)
- Button height: 48-56px (minimum touch target)
- Minimum button width: 44px (iOS/Android guidelines)
```

### Touch Interactions
```css
- Swipe-to-close: Enabled with drag handle
- Button tap area: Minimum 44×44px
- Spacing between tappable elements: 8px minimum
```

---

## ✨ Animations & Transitions

### Hover States
```css
.button-hover {
  transition: all 150ms ease;
  transform: scale(1);
}

.button-hover:hover {
  transform: scale(1.02);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

.button-hover:active {
  transform: scale(0.98);
}
```

### Loading States
```css
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### Modal Entry
```css
.modal-enter {
  opacity: 0;
  transform: translateY(20px);
}

.modal-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 300ms ease-out;
}
```

---

## 🎭 Visual Hierarchy

### Priority 1 (Most Prominent)
1. **Reservation Cost Block** - Orange gradient card, largest text (48px)
2. **CTA Button** - Full-width orange button, 56px height

### Priority 2 (Important)
3. **Pickup Price** - 30px green text
4. **Product Image** - Full-width header

### Priority 3 (Supporting)
5. **Product Title** - 17px semibold
6. **Balance Pill** - Small inline card
7. **Quantity Selector** - If needed

### Priority 4 (Subtle)
8. **Time Badge** - Small green pill
9. **Description** - 14px gray text
10. **Footer Text** - 12px muted

---

## 🚀 Implementation Checklist

### Component Structure
- [x] HeaderImage.tsx - Full-width rectangular image
- [x] TitleSection.tsx - Title + time badge + description
- [x] UnifiedPriceCard.tsx - Balance pill + pricing + reservation cost + quantity
- [x] ReserveButton.tsx - Premium CTA button
- [x] ReservationModal.tsx - Container with proper spacing

### Design Tokens Applied
- [x] Color system (#F97316, #059669, #111, etc.)
- [x] Typography scale (12px - 48px)
- [x] Spacing system (px-5, py-6, space-y-4)
- [x] Border radius (rounded-xl, rounded-2xl, rounded-full)
- [x] Shadow system (shadow-sm, shadow-md)

### Visual Requirements
- [x] Light mode only
- [x] No neon effects
- [x] No huge borders
- [x] Soft shadows
- [x] Premium feel
- [x] Balanced layout
- [x] Spacious design

### Mobile Optimization
- [x] Touch-friendly buttons (44×44px minimum)
- [x] Proper spacing for fat fingers
- [x] Swipe-to-close gesture
- [x] Responsive image sizing
- [x] Readable font sizes

---

## 🎨 Component Code Examples

### Full Modal Structure
```tsx
<Dialog>
  <DialogContent className="rounded-2xl">
    {/* 1. Drag Handle */}
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 w-10 h-1 bg-gray-300 rounded-full" />
    
    {/* 2. Full-Width Header Image */}
    <HeaderImage 
      imageUrl={offer.images[0]}
      title={offer.title}
      categoryName={offer.category}
    />
    
    {/* 3. Content Area */}
    <div className="space-y-4 bg-white rounded-b-2xl">
      
      {/* 4. Title Section */}
      <TitleSection
        title={offer.title}
        description={offer.description}
        timeRemaining="2h 34m"
      />
      
      {/* 5. Price Card */}
      <UnifiedPriceCard
        balance={210}
        cost={5}
        smartPrice={4.00}
        originalPrice={10.00}
        quantity={1}
        maxQuantity={3}
      />
      
      {/* 6. Alerts (if any) */}
      <div className="px-5 space-y-3">
        {/* Insufficient points, expiring soon, etc. */}
      </div>
      
      {/* 7. CTA Button */}
      <ReserveButton
        onClick={handleReserve}
        disabled={false}
        isLoading={false}
      />
    </div>
  </DialogContent>
</Dialog>
```

---

## 📊 Before vs After Comparison

### Before (Old Design)
- ❌ Circular product image (176px)
- ❌ Neon glows and dark gradients
- ❌ Complex nested card structures
- ❌ Unclear business model explanation
- ❌ Floating MAX badge outside container

### After (New Design)
- ✅ Full-width rectangular image (208px)
- ✅ Clean light theme, soft shadows
- ✅ Flat hierarchy with clear sections
- ✅ Prominent reservation cost explanation
- ✅ Integrated MAX badge inside quantity card

---

## 🎯 Success Metrics

### Visual Quality
- **Premium Feel**: Stripe/Airbnb aesthetic ✓
- **Clarity**: Business model is obvious ✓
- **Accessibility**: 44px touch targets ✓
- **Performance**: Fast load, smooth animations ✓

### User Experience
- **Intuitive**: No confusion about payment flow ✓
- **Trust**: Professional design builds confidence ✓
- **Conversion**: Clear CTA drives action ✓

---

## 📝 Maintenance Notes

### Adding New Elements
1. Follow spacing system (px-5, py-4, space-y-4)
2. Use color tokens (text-[#F97316], text-[#059669])
3. Maintain visual hierarchy (large = important)
4. Keep shadows subtle (shadow-sm, shadow-md)

### Testing Checklist
- [ ] Image loads correctly (fallback emoji works)
- [ ] Time badge appears when timeRemaining exists
- [ ] Balance pill shows current points
- [ ] Reservation cost is visually dominant
- [ ] Quantity selector only shows if maxQuantity > 1
- [ ] CTA button is always accessible
- [ ] Alerts appear in proper order
- [ ] Modal is swipeable on mobile

---

**Design System Version:** 2.0  
**Last Updated:** November 27, 2025  
**Designers:** Senior UI/UX Team  
**Framework:** React 19 + Tailwind CSS + shadcn/ui
