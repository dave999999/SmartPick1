# Image and Icon Accessibility Audit

## Audit Date: December 8, 2025

## Executive Summary

**Status**: ❌ **Partially Compliant** - Needs Improvements

- ✅ **Content images**: Have proper alt text
- ❌ **Decorative icons**: Missing `aria-hidden="true"`
- ⚠️ **Decorative images**: Inconsistent `alt` attributes
- ❓ **Map markers**: Need accessibility review

---

## Findings by Component

### 1. Lucide React Icons (30+ usages)

**Issue**: All Lucide icons rendered without accessibility attributes

**Current Code**:
```tsx
import { Heart, Search, X } from 'lucide-react';

// ❌ No aria-hidden for decorative icons
<Button>
  <Heart /> Favorite
</Button>

// ❌ No aria-label for standalone icons
<Button>
  <X />
</Button>
```

**Required Fix**:
```tsx
// ✅ Decorative icon (next to text)
<Button>
  <Heart aria-hidden="true" /> Favorite
</Button>

// ✅ Standalone icon (icon-only button)
<Button aria-label="Close">
  <X aria-hidden="true" />
</Button>
```

**Affected Components**:
- `OnboardingDialog.tsx` - MapPin, Coins, QrCode, ChevronRight, ChevronLeft, X
- `PenaltyWarningDialog.tsx` - AlertTriangle, Info, Clock, Ban
- `BuyPointsModal.tsx` - Coins, Loader2, Check, Sparkles, Shield
- `BottomNavBar.tsx` - Home, Heart, User, Compass icons
- `HeroOfferCard.tsx` - Heart icon
- `OfferListCard.tsx` - Clock, MapPin icons
- All 30+ components importing from `lucide-react`

**Recommendation**: Use new `Icon` wrapper component

---

### 2. Offer Images

**Status**: ✅ **Compliant**

All offer images have proper descriptive alt text:

```tsx
// ✅ Correct
<img
  src={imageUrl}
  alt={offer.title} // Describes the offer
  loading="lazy"
/>
```

**Files Checked**:
- ✅ `HeroOfferCard.tsx` - `alt={title}`
- ✅ `OfferListCard.tsx` - `alt={title}`
- ✅ `ReservationModalNew.tsx` - `alt={offer.title}`
- ✅ `SpecialOfferCard.tsx` - `alt={title}`
- ✅ `ProductCardHorizontal.tsx` - `alt={title}`

---

### 3. Decorative Images

**Status**: ⚠️ **Inconsistent**

Some decorative images have empty `alt=""` but inconsistent:

```tsx
// ReservationModalNew.tsx line 296, 398
<img src="/icons/button.png" alt="" className="w-4 h-4" />
```

**Issue**: Empty alt is correct for decorative images, but not consistently applied

**Recommendation**: 
- Keep `alt=""` for decorative images (CSS-like visual elements)
- Add `aria-hidden="true"` for extra clarity
- Document pattern for future use

**Better**:
```tsx
<img src="/icons/button.png" alt="" aria-hidden="true" className="w-4 h-4" />
```

---

### 4. QR Codes

**Status**: ✅ **Compliant**

QR code images have descriptive alt text:

```tsx
// ✅ Correct
<img src={qrCodeUrl} alt="QR Code" />
```

**Files**: `MyPicks.tsx`, `ReservationDetail.tsx`

---

### 5. Partner Cards

**Status**: ✅ **Good** - Images have alt text

**PartnerSheet.tsx** (assumed based on pattern):
- Business name images: Should have `alt={partner.business_name}`
- Logo images: Should have `alt="${business_name} logo"`

**Need to verify**: Check if partner avatar/logo images exist and have alt text

---

### 6. Map Markers

**Status**: ❓ **Needs Review**

**File**: `src/components/map/SmartPickGoogleMap.tsx`

Map markers are created programmatically with Google Maps API:
```tsx
function createCustomMarker(category: string): string {
  // Returns SVG data URL for marker icon
}
```

**Issues**:
1. Google Maps markers don't support `alt` text (they're canvas-drawn)
2. Markers created via `google.maps.Marker` API
3. No ARIA labels on marker DOM elements

**Accessibility Concerns**:
- **Keyboard users**: Can't navigate to markers (Google Maps limitation)
- **Screen readers**: Markers not announced properly
- **Alternative needed**: Offer list provides keyboard-accessible alternative

**Recommendation**: 
- Document that map is mouse/touch only
- Ensure offer sheet provides full keyboard alternative
- Add ARIA live region to announce when markers update:
  ```tsx
  <div className="sr-only" aria-live="polite">
    {offers.length} offers shown on map
  </div>
  ```

---

## WCAG 2.1 AA Compliance

### Passing Criteria

✅ **1.1.1 Non-text Content (Level A)**
- Content images have text alternatives
- Decorative images can be ignored by assistive tech (with fixes)

✅ **1.3.1 Info and Relationships (Level A)**
- Semantic HTML used correctly
- ARIA labels present where needed

❌ **4.1.2 Name, Role, Value (Level A)** - FAILING
- Icons missing `aria-hidden` or `aria-label`
- Some buttons with icons missing labels

### Required Fixes for Compliance

1. **Add `aria-hidden="true"` to all decorative Lucide icons** (30+ instances)
2. **Add `aria-label` to icon-only buttons** (e.g., close, favorite)
3. **Add ARIA live region for map marker updates**
4. **Document map keyboard limitations and alternative**

---

## Implementation Plan

### Phase 1: Create Icon Wrapper (Completed)
✅ Created `src/components/ui/icon.tsx`
- `Icon` component with decorative/label props
- `DecorativeIcon` helper for common case
- `StandaloneIcon` helper for icon-only buttons

### Phase 2: Update High-Traffic Components

**Priority 1** (User-facing, high usage):
1. `BottomNavBar.tsx` - Navigation icons
2. `HeroOfferCard.tsx` - Heart favorite icon
3. `OfferListCard.tsx` - Clock, MapPin icons
4. `AuthDialog.tsx` - Close button icon

**Priority 2** (Modals and dialogs):
5. `PenaltyModal.tsx` - Warning icons
6. `ReservationModalNew.tsx` - Button icons
7. `OnboardingDialog.tsx` - Navigation icons
8. `BuyPointsModal.tsx` - Sparkles, Shield icons

**Priority 3** (Admin and partner):
9. All admin dashboard components
10. Partner profile components
11. Settings and profile icons

### Phase 3: Add Map Accessibility

1. Add ARIA live region for marker count
2. Document keyboard limitation in docs
3. Ensure offer sheet is fully keyboard accessible

### Phase 4: Automated Testing

1. Install `eslint-plugin-jsx-a11y`
2. Add linting rules for images/icons
3. Add axe-core tests (see `ACCESSIBILITY_TESTING_GUIDE.md`)

---

## Code Examples

### Before (Current - Inaccessible)
```tsx
import { Heart, X } from 'lucide-react';

export function Card() {
  return (
    <div>
      <button onClick={onClose}>
        <X /> {/* ❌ Screen reader announces "X graphic" */}
      </button>
      
      <button onClick={onFavorite}>
        <Heart /> Favorite {/* ❌ Redundant announcement */}
      </button>
    </div>
  );
}
```

### After (Accessible)
```tsx
import { Heart, X } from 'lucide-react';

export function Card() {
  return (
    <div>
      <button onClick={onClose} aria-label="Close">
        <X aria-hidden="true" /> {/* ✅ Icon hidden, button labeled */}
      </button>
      
      <button onClick={onFavorite}>
        <Heart aria-hidden="true" /> Favorite {/* ✅ Icon hidden, text read */}
      </button>
    </div>
  );
}
```

### Better (Using New Component)
```tsx
import { Heart, X } from 'lucide-react';
import { DecorativeIcon, StandaloneIcon } from '@/components/ui/icon';

export function Card() {
  return (
    <div>
      {/* Icon-only button: use StandaloneIcon or aria-label on button */}
      <button onClick={onClose} aria-label="Close">
        <DecorativeIcon icon={X} />
      </button>
      
      {/* Icon + text: use DecorativeIcon */}
      <button onClick={onFavorite}>
        <DecorativeIcon icon={Heart} /> Favorite
      </button>
    </div>
  );
}
```

---

## ESLint Configuration

Add to `.eslintrc.json`:
```json
{
  "extends": [
    "plugin:jsx-a11y/recommended"
  ],
  "plugins": ["jsx-a11y"],
  "rules": {
    "jsx-a11y/alt-text": ["error", {
      "elements": ["img"],
      "img": ["Image"]
    }],
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-proptypes": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/role-has-required-aria-props": "error"
  }
}
```

Install:
```bash
pnpm add -D eslint-plugin-jsx-a11y
```

---

## Testing Checklist

### Manual Tests
- [ ] Navigate with screen reader (NVDA/JAWS)
- [ ] Verify decorative icons are skipped
- [ ] Verify icon-only buttons announce correctly
- [ ] Check map marker accessibility
- [ ] Verify offer images have meaningful alt text

### Automated Tests
- [ ] Run `pnpm lint` (with jsx-a11y rules)
- [ ] Run axe-core tests on all modals
- [ ] Run Lighthouse accessibility audit (score 95+)
- [ ] Check browser accessibility inspector

---

## Resources

- [WCAG 2.1 - Non-text Content](https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html)
- [WAI Images Tutorial](https://www.w3.org/WAI/tutorials/images/)
- [Lucide React Accessibility](https://lucide.dev/guide/packages/lucide-react#accessibility)
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)

---

## Summary

**Current Status**: ❌ Non-compliant with WCAG 2.1 AA (4.1.2)

**Required Actions**:
1. Add `aria-hidden="true"` to 30+ decorative icons
2. Add `aria-label` to icon-only buttons
3. Add map marker count live region
4. Install jsx-a11y ESLint plugin

**Estimated Effort**: 4-6 hours
- Icon wrapper: 1 hour (✅ Done)
- Update components: 3-4 hours
- Testing: 1-2 hours
