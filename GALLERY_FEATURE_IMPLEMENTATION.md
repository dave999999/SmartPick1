# 📷 Gallery Feature - Implementation Guide

## Overview
Apple-style premium Gallery feature for Partner Dashboard with glassmorphism design, tag-based organization, and seamless offer integration.

---

## 🎨 Visual Design Principles

### Glass Morphism Architecture
```css
/* Primary Glass Effect */
background: rgba(255, 255, 255, 0.95)
backdrop-filter: blur(40px)
border: 1px solid rgba(255, 255, 255, 0.2)
box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15)

/* Button Glass */
background: rgba(255, 255, 255, 0.6)
backdrop-filter: blur(10px)
border: 1px solid rgba(209, 213, 219, 0.6)
```

### Motion Guidelines
```typescript
// Spring Animation (Apple-like)
transition: {
  type: 'spring',
  damping: 30,
  stiffness: 300
}

// Stagger Grid Items
delay: index * 0.05

// Tap Feedback
whileTap={{ scale: 0.95 }}
```

---

## 📐 Component Architecture

```
GalleryModal
├── Header (sticky)
│   ├── Title + Description
│   ├── Upload Button (Primary CTA)
│   └── Sort Dropdown
├── Filter Chips (horizontal scroll)
│   ├── All
│   ├── Favorites (⭐)
│   └── Tag Filters (dynamic)
├── Image Grid
│   └── ImageCard[]
│       ├── Glass Overlay (hover)
│       ├── Favorite Star
│       ├── Actions Menu (⋯)
│       └── Bottom Info (title, tags, usage)
└── Empty State
```

---

## 🔧 Integration Points

### 1. Dashboard Button Placement
**Location:** Top header, center position between Home and Wallet

```tsx
// PartnerDashboardV3.tsx
<motion.button
  whileTap={{ scale: 0.95 }}
  onClick={() => modals.openGallery()}
  className="bg-white/80 backdrop-blur-sm border border-gray-200/60"
>
  <ImageIcon className="w-4 h-4" />
  Gallery
</motion.button>
```

### 2. Modal State Management
**Hook:** `usePartnerModals.ts`

```typescript
const [showGallery, setShowGallery] = useState(false);

openGallery: () => setShowGallery(true)
closeGallery: () => setShowGallery(false)
```

### 3. Offer Creation Integration
Future: Open Gallery in "select" mode when creating offers

```tsx
<GalleryModal
  mode="select"
  onSelect={(imageUrl) => {
    setOfferImage(imageUrl);
    closeGallery();
  }}
/>
```

---

## 🎯 Feature Specifications

### Image Management
- **Format:** 1:1 aspect ratio only (Instagram-style)
- **Grid:** 2 columns mobile / 4-5 columns desktop
- **Actions:**
  - Toggle favorite (⭐)
  - Rename
  - Copy URL
  - Delete (with usage warning)

### Organization System
- **Tag-Based:** No folder hierarchy
- **Filter Chips:** All · Favorites · Pizza · Bakery · etc.
- **Smart Sort:**
  - Newest First
  - Most Used
  - Unused

### Upload Experience
- **Multi-Upload:** Drag & drop or click
- **Auto-Processing:**
  - Crop to 1:1
  - Light enhancement (future)
  - Tag suggestions (future)

---

## 📱 Responsive Behavior

### Mobile (< 640px)
- Fullscreen modal (calc(100vh - 60px))
- Rounded top corners only
- 2 column grid
- Bottom sheet animation

### Desktop (≥ 640px)
- Centered modal (max-w-4xl)
- Fully rounded (24px)
- 4-5 column grid
- Backdrop blur

---

## 🎬 Animation Specifications

### Modal Entry/Exit
```typescript
// Entry
initial: { y: '100%', opacity: 0 }
animate: { y: 0, opacity: 1 }
transition: { type: 'spring', damping: 30, stiffness: 300 }

// Exit
exit: { y: '100%', opacity: 0 }
```

### Image Grid Stagger
```typescript
{sortedImages.map((image, index) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
  />
))}
```

### Hover States
- **Glass Overlay:** 0% → 20% black
- **Controls:** opacity 0 → 1
- **Scale Feedback:** 1.0 → 0.95 on tap

---

## 🔐 Edge Cases Handled

### Empty State
- Icon + Title + Description
- Primary CTA: "პირველი სურათის ატვირთვა"
- Encourages immediate action

### Delete Protection
```typescript
if (image.usedCount > 0) {
  toast.error(`ეს სურათი გამოიყენება ${image.usedCount} შეთავაზებაში`);
  return;
}
```

### Menu Overlay
- Click outside to close
- Prevents accidental actions
- Context-aware (show usage count)

---

## 🚀 Future Enhancements

### Phase 2: Advanced Features
1. **Supabase Storage Integration**
   - Real upload to `partner_images` bucket
   - CDN optimization
   - Lazy loading

2. **AI Enhancements**
   - Auto-tagging (food recognition)
   - Quality scoring
   - Duplicate detection

3. **Offer Integration**
   - Open Gallery from CreateOfferWizard
   - Favorites appear first
   - Show which offers use each image

4. **Bulk Actions**
   - Multi-select mode
   - Batch tagging
   - Batch delete

---

## 📊 Database Schema (Future)

```sql
CREATE TABLE partner_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  favorite BOOLEAN DEFAULT FALSE,
  used_count INTEGER DEFAULT 0,
  storage_path TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast filtering
CREATE INDEX idx_partner_images_partner_id ON partner_images(partner_id);
CREATE INDEX idx_partner_images_tags ON partner_images USING GIN(tags);
CREATE INDEX idx_partner_images_favorite ON partner_images(partner_id, favorite) WHERE favorite = TRUE;
```

---

## ✅ Testing Checklist

### Visual Testing
- [ ] Glass effect renders correctly on all backgrounds
- [ ] Animations are smooth (60fps)
- [ ] Grid responsive on all screen sizes
- [ ] Hover states work on desktop
- [ ] Touch feedback works on mobile

### Functional Testing
- [ ] Upload button triggers file picker
- [ ] Favorite toggle persists
- [ ] Delete shows warning if image is used
- [ ] Filter chips work correctly
- [ ] Sort options work
- [ ] Modal closes on backdrop click
- [ ] Modal closes on X button

### Performance Testing
- [ ] Large galleries (100+ images) scroll smoothly
- [ ] Images lazy load properly
- [ ] No memory leaks on open/close
- [ ] Animations don't block UI

---

## 🎯 Success Metrics

### User Engagement
- Gallery open rate from dashboard
- Upload completion rate
- Favorite usage
- Tag adoption

### Quality Indicators
- Average images per partner
- Image reuse rate in offers
- Time to find image when creating offer

---

## 📝 Notes

### Design Philosophy
This feature embodies Apple's design principles:
- **Clarity:** Purpose is immediately obvious
- **Deference:** Content (images) is the focus
- **Depth:** Layers create realistic spatial relationships

### Georgian Language
All UI text uses Georgian (ქართული) to match the app's localization strategy.

### Accessibility
- Large tap targets (44px minimum)
- Color contrast meets WCAG AA
- Keyboard navigation support (future)
- Screen reader labels (future)

---

## 🔗 Related Components

- `src/components/partner/GalleryModal.tsx` - Main component
- `src/hooks/pages/usePartnerModals.ts` - State management
- `src/pages/PartnerDashboardV3.tsx` - Integration point
- `src/components/partner/CreateOfferWizard.tsx` - Future integration

---

**Status:** ✅ Phase 1 Complete (UI/UX Implementation)  
**Next:** Supabase Storage Integration + Real Data
