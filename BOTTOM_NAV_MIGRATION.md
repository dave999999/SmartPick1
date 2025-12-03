# Bottom Navigation Migration Guide

## Quick Migration from FloatingBottomNav to New System

### Step 1: Update Import Statement

**Before:**
```tsx
import { FloatingBottomNav } from '@/components/FloatingBottomNav';
```

**After (Premium - Recommended):**
```tsx
import { BottomNavPremium as FloatingBottomNav } from '@/components/navigation';
```

**After (Standard):**
```tsx
import { BottomNavStandard as FloatingBottomNav } from '@/components/navigation';
```

**After (Minimal):**
```tsx
import { BottomNavMinimal as FloatingBottomNav } from '@/components/navigation';
```

---

### Step 2: Update Prop Name

**Before:**
```tsx
<FloatingBottomNav 
  onSearchClick={() => {
    setDiscoverSheetOpen(true);
  }}
/>
```

**After:**
```tsx
<FloatingBottomNav 
  onCenterClick={() => {
    setDiscoverSheetOpen(true);
  }}
/>
```

**Change:** `onSearchClick` → `onCenterClick`

---

### Step 3: Test Navigation Flow

Verify these routes still work:
- ✅ Home: `/`
- ✅ Favorites: `/favorites`
- ✅ Profile: `/profile`
- ✅ Menu: Opens MenuDrawer (no route change)
- ✅ Center: Executes your custom callback

---

## Full Migration for Each Page

### 1. IndexRedesigned.tsx ✅ (Already Updated)

```tsx
import { BottomNavPremium as FloatingBottomNav } from '@/components/navigation';

<FloatingBottomNav 
  onCenterClick={() => {
    if (discoverSheetOpen) {
      setDiscoverSheetOpen(false);
    } else {
      setDiscoverSheetOpen(true);
      setSelectedPartnerId(null);
    }
  }}
/>
```

---

### 2. Favorites.tsx

**Location:** `src/pages/Favorites.tsx`

**Find:**
```tsx
import { FloatingBottomNav } from '@/components/FloatingBottomNav';
```

**Replace with:**
```tsx
import { BottomNavPremium as FloatingBottomNav } from '@/components/navigation';
```

**Find:**
```tsx
<FloatingBottomNav />
```

**Replace with:**
```tsx
<FloatingBottomNav 
  onCenterClick={() => {
    // Navigate to home and open offers
    navigate('/');
  }}
/>
```

---

### 3. UserProfile.tsx

**Location:** `src/pages/UserProfile.tsx`

**Find:**
```tsx
import { FloatingBottomNav } from '@/components/FloatingBottomNav';
```

**Replace with:**
```tsx
import { BottomNavPremium as FloatingBottomNav } from '@/components/navigation';
```

**Find:**
```tsx
<FloatingBottomNav />
```

**Replace with:**
```tsx
<FloatingBottomNav 
  onCenterClick={() => {
    navigate('/');
  }}
/>
```

---

### 4. PartnerDashboard.tsx (if exists)

**Location:** `src/pages/PartnerDashboard.tsx`

**Find:**
```tsx
import { FloatingBottomNav } from '@/components/FloatingBottomNav';
```

**Replace with:**
```tsx
import { BottomNavPremium as FloatingBottomNav } from '@/components/navigation';
```

**Find:**
```tsx
<FloatingBottomNav />
```

**Replace with:**
```tsx
<FloatingBottomNav 
  onCenterClick={() => {
    // Partner-specific action
    setShowAddOfferModal(true);
  }}
/>
```

---

### 5. AdminDashboard.tsx (if exists)

**Location:** `src/pages/AdminDashboard.tsx`

**Find:**
```tsx
import { FloatingBottomNav } from '@/components/FloatingBottomNav';
```

**Replace with:**
```tsx
import { BottomNavPremium as FloatingBottomNav } from '@/components/navigation';
```

**Find:**
```tsx
<FloatingBottomNav />
```

**Replace with:**
```tsx
<FloatingBottomNav 
  onCenterClick={() => {
    // Admin-specific action
    navigate('/admin/offers');
  }}
/>
```

---

## Breaking Changes Summary

| Old API | New API | Notes |
|---------|---------|-------|
| `onSearchClick` | `onCenterClick` | Prop renamed for clarity |
| Custom SearchIcon | Lucide Sparkles | Icon changed to match Uber/Wolt aesthetic |
| 52px height | 72px height (Premium) | Increased for iOS feel |
| No safe area | 16px safe area (Premium) | Proper iPhone handling |
| Simple float | Animated glow + rotation | Premium micro-animations |

---

## Non-Breaking Changes

These still work the same:
- ✅ Navigation routing (Home, Favorites, Profile)
- ✅ MenuDrawer integration
- ✅ Active state detection
- ✅ Dark mode support
- ✅ z-index layering
- ✅ Click/tap handlers

---

## Search & Replace Commands

### PowerShell (Windows)
```powershell
# Find all files using old import
Get-ChildItem -Path "src\pages" -Filter "*.tsx" -Recurse | Select-String "FloatingBottomNav" | Select-Object Path -Unique

# Replace import in specific file
(Get-Content "src\pages\Favorites.tsx") -replace "import { FloatingBottomNav } from '@/components/FloatingBottomNav';", "import { BottomNavPremium as FloatingBottomNav } from '@/components/navigation';" | Set-Content "src\pages\Favorites.tsx"
```

### VS Code Find & Replace
```
Find:    import { FloatingBottomNav } from '@/components/FloatingBottomNav';
Replace: import { BottomNavPremium as FloatingBottomNav } from '@/components/navigation';

Files to include: src/**/*.tsx
```

---

## Validation Checklist

After migration, test each page:

### IndexRedesigned.tsx ✅
- [ ] Navigation bar appears at bottom
- [ ] Center button opens/closes offers sheet
- [ ] Home, Favorites, Profile, Menu tabs work
- [ ] Active state shows on current page
- [ ] Dark mode switches correctly
- [ ] Glassmorphism effect visible
- [ ] Safe area handled on iPhone

### Favorites.tsx
- [ ] Navigation bar appears
- [ ] Center button action defined
- [ ] Active state shows for Favorites tab
- [ ] Can navigate to other pages
- [ ] Menu drawer opens

### UserProfile.tsx
- [ ] Navigation bar appears
- [ ] Center button action defined
- [ ] Active state shows for Profile tab
- [ ] Can navigate to other pages
- [ ] Menu drawer opens

### Other Pages
- [ ] Repeat above checks for each page
- [ ] Verify no console errors
- [ ] Check mobile responsiveness
- [ ] Test dark mode toggle

---

## Rollback Plan

If issues occur, quick rollback:

**1. Revert Import:**
```tsx
// Change back to
import { FloatingBottomNav } from '@/components/FloatingBottomNav';
```

**2. Revert Prop:**
```tsx
// Change back to
<FloatingBottomNav onSearchClick={() => {}} />
```

**3. Old file still exists:**
```
src/components/FloatingBottomNav.tsx (preserved)
```

---

## Performance Testing

After migration, verify:

### Lighthouse Scores
```
Performance: Should be 95+
Accessibility: Should be 100
Best Practices: Should be 95+
SEO: Should be 100
```

### Animation Performance
```
FPS: Should maintain 60fps during animations
GPU layers: Check Chrome DevTools > Layers
Paint time: Should be <16ms per frame
```

### Bundle Size
```
Before: Check current bundle size
After: Should increase by ~36KB (Framer Motion)
```

---

## Gradual Migration Strategy

### Phase 1 (Week 1): Main Pages
1. ✅ IndexRedesigned.tsx (already done)
2. Favorites.tsx
3. UserProfile.tsx

### Phase 2 (Week 2): Secondary Pages
4. PartnerDashboard.tsx
5. AdminDashboard.tsx
6. Any other pages with FloatingBottomNav

### Phase 3 (Week 3): Testing & Cleanup
7. Full device testing (iOS + Android)
8. Remove old FloatingBottomNav.tsx
9. Update all documentation

---

## Common Issues & Solutions

### Issue 1: "Module not found"
**Error:** `Cannot find module '@/components/navigation'`

**Solution:**
```bash
# Verify files exist
ls src/components/navigation/

# Should see:
# BottomNavPremium.tsx
# BottomNavStandard.tsx
# BottomNavMinimal.tsx
# index.ts
```

### Issue 2: "onSearchClick is not a function"
**Error:** `TypeError: onSearchClick is not a function`

**Solution:** Change prop name to `onCenterClick`

### Issue 3: Backdrop blur not showing
**Error:** Glassmorphism background looks solid

**Solution:** 
```tsx
// Check browser support
@supports (backdrop-filter: blur(18px)) {
  /* Should apply */
}

// Fallback already included in component
```

### Issue 4: Center button position wrong
**Error:** Button too high or too low

**Solution:**
```tsx
// Premium: -32px offset (for 72px bar + 60px button)
// Standard: -28px offset (for 68px bar + 56px button)
// Check container height matches variant
```

### Issue 5: Safe area too large
**Error:** Too much bottom padding

**Solution:**
```tsx
// iOS: Uses env(safe-area-inset-bottom) automatically
// Android: Fallback to minimum (16px/12px/8px)
// If too large, reduce fallback value
```

---

## A/B Testing Setup

To test Premium vs Standard:

```tsx
// Add user preference
const [navVariant, setNavVariant] = useState<'premium' | 'standard'>('premium');

// Conditional import
const BottomNav = navVariant === 'premium' 
  ? BottomNavPremium 
  : BottomNavStandard;

// Render
<BottomNav onCenterClick={() => {}} />

// Settings toggle
<button onClick={() => setNavVariant(v => v === 'premium' ? 'standard' : 'premium')}>
  Switch Navigation Style
</button>
```

---

## Device Testing Matrix

Test on these devices:

### iOS
- [ ] iPhone SE (2020) - Small screen, no home indicator
- [ ] iPhone 13 - Standard size, home indicator
- [ ] iPhone 13 Pro Max - Large screen
- [ ] iPhone 15 Pro - Latest, Dynamic Island
- [ ] iPad - Tablet layout

### Android
- [ ] Pixel 5 - Medium screen
- [ ] Samsung S21 - Different safe areas
- [ ] OnePlus - High refresh rate
- [ ] Tablet - Landscape mode

### Browsers
- [ ] Safari (iOS)
- [ ] Chrome (Android)
- [ ] Firefox (both)
- [ ] Edge (desktop)

---

## Analytics Events to Track

Add these after migration:

```tsx
// Track variant usage
analytics.track('navigation_variant_loaded', {
  variant: 'premium', // or 'standard', 'minimal'
  page: location.pathname
});

// Track center button clicks
onCenterClick={() => {
  analytics.track('navigation_center_clicked', {
    page: location.pathname,
    action: 'open_offers_sheet'
  });
  // ... rest of handler
}}

// Track tab switches
analytics.track('navigation_tab_clicked', {
  from: previousTab,
  to: currentTab,
  variant: 'premium'
});
```

---

## Documentation Updates Needed

After migration complete:

1. **README.md** - Update navigation section
2. **ARCHITECTURE.md** - Update component tree
3. **CHANGELOG.md** - Add migration entry
4. **API.md** - Update component API docs

---

## Support & Help

### If migration fails:
1. Check console for errors
2. Verify all files exist in `src/components/navigation/`
3. Confirm imports match exact filenames
4. Test on clean browser (no cache)
5. Rollback if necessary (old file preserved)

### For questions:
- Review: `BOTTOM_NAV_REDESIGN.md` (full specs)
- Review: `BOTTOM_NAV_COMPARISON.md` (variant differences)
- Review: `BOTTOM_NAV_MEASUREMENTS.md` (pixel-perfect details)
- Test: `/navigation-demo` page (live examples)

---

## Success Criteria

Migration is complete when:

✅ All pages render new navigation  
✅ All routes work correctly  
✅ Active states show on correct tabs  
✅ Center button executes correct action  
✅ Menu drawer opens/closes  
✅ Dark mode switches properly  
✅ Safe area handled on iPhone  
✅ No TypeScript errors  
✅ No console warnings  
✅ Lighthouse scores maintained  
✅ User feedback positive  

---

**Migration Guide Version:** 1.0  
**Last Updated:** December 3, 2025  
**Estimated Time:** 30 minutes per page  
**Risk Level:** Low (old file preserved as backup)
