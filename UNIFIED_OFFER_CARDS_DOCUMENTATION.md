# ✨ UNIFIED OFFER CARD SYSTEM - Complete Documentation

## 📐 Visual Specifications

### Card Container
```
Width: Responsive (2-3 columns based on screen size)
Height: Auto (consistent for same content)
Border-radius: 16px
Background: #FFFFFF
Border: 1px solid rgba(0,0,0,0.06)
Shadow: 0 2px 6px rgba(0,0,0,0.04)
Hover Shadow: 0 4px 12px rgba(0,0,0,0.08)
Overflow: hidden (prevents any overflow issues)
```

### Image Container
```
Height: 140px (FIXED - never changes)
Width: 100%
object-fit: cover (maintains aspect ratio)
Border-radius: 0 (images are rectangular, rounded at card level)
Background: linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%)
Hover: scale(1.05) with 300ms transition
```

### Discount Badge (Red)
```
Position: absolute
Top: 8px
Left: 8px
Padding: 2px 6px
Background: #EF4444
Color: white
Font-size: 12px
Font-weight: 600
Border-radius: 6px
Line-height: 16px
```

### Title Section
```
Font-size: 14px
Font-weight: 600
Color: #111827
Line-height: 18px
Min-height: 36px (ensures 2-line space)
Max-lines: 2 (line-clamp-2)
Margin-top: 0
```

### Partner Name
```
Font-size: 12px
Font-weight: 400
Color: #6B7280
Line-height: 16px
Min-height: 16px
Max-lines: 1 (truncate)
Margin-top: 2px
```

### Price Section
```
Margin-top: 8px
Display: flex
Align-items: center

Icon:
  - Width: 16px
  - Height: 16px
  - Color: #059669 (emerald-600)
  - Margin-right: 4px
  - Stroke-width: 2.5

Current Price:
  - Font-size: 15px
  - Font-weight: 600
  - Color: #059669 (emerald-600)
  - Line-height: 20px

Original Price:
  - Font-size: 12px
  - Font-weight: 400
  - Color: #9CA3AF
  - Text-decoration: line-through
  - Margin-left: 6px
  - Line-height: 16px
```

### Padding & Spacing
```
Card content padding: 12px (all sides)
Grid gap: 16px (between cards)
Row gap: 16px (between rows)
Section header margin-bottom: 16px
```

## 🎨 Grid Layout Specifications

### Responsive Breakpoints
```css
Mobile (default):     2 columns
Small (640px+):       2 columns
Medium (768px+):      3 columns
Large (1024px+):      3 columns
Extra Large (1280px+): 3 columns
```

### Grid CSS
```css
.offers-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  row-gap: 16px;
  width: 100%;
}

@media (min-width: 768px) {
  .offers-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## 📊 Example Card Data Structure

```typescript
interface Offer {
  id: string;
  title: string;
  smart_price: number;
  original_price: number;
  category: string;
  images: string[];
  partner: {
    business_name: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
  created_at: string;
  expires_at?: string;
}

// Example data
const exampleOffer: Offer = {
  id: "123",
  title: "Beef Burger Meal with Fries and Drink",
  smart_price: 4.50,
  original_price: 8.00,
  category: "fast-food",
  images: ["/uploads/burger.jpg"],
  partner: {
    business_name: "Burger House Tbilisi"
  },
  created_at: "2025-11-27T10:00:00Z"
};
```

## 🔧 Implementation Guide

### 1. Import Components
```tsx
import { OfferCardUnified } from '@/components/home/OfferCardUnified';
import { OffersGridUnified } from '@/components/home/OffersGridUnified';
```

### 2. Basic Usage
```tsx
<OffersGridUnified
  offers={offers}
  onOfferClick={handleOfferClick}
  title="All Offers"
  showCount={true}
/>
```

### 3. Single Card Usage
```tsx
<OfferCardUnified
  offer={offer}
  onClick={handleClick}
/>
```

## 🎯 Key Features

### ✅ Consistency Guarantees
- ✓ All cards have identical structure
- ✓ Images always 140px height
- ✓ Titles always 2 lines max
- ✓ Partner names always 1 line
- ✓ Consistent padding (12px)
- ✓ Uniform spacing (16px gaps)
- ✓ No stretched images
- ✓ No overflow issues

### ✅ Professional Design
- ✓ Light mode optimized
- ✓ Premium shadows
- ✓ Smooth hover effects
- ✓ Perfect alignment
- ✓ Clean typography
- ✓ Proper contrast ratios

### ✅ Responsive Behavior
- ✓ 2 columns on mobile
- ✓ 3 columns on tablet+
- ✓ Maintains proportions
- ✓ No layout shifts

## 🐛 Bug Fixes Applied

### Left Overflow Bug
```css
overflow: hidden;
overflow-x: hidden;
overflow-y: hidden;
```
This removes the dark strip on the left side.

### Image Aspect Ratio
```css
height: 140px; /* FIXED height */
object-fit: cover; /* Maintains aspect ratio */
```
Prevents stretched or squished images.

### Card Height Consistency
```css
min-height: 36px; /* Title - 2 lines */
min-height: 16px; /* Partner - 1 line */
```
Ensures all cards align perfectly.

## 📱 Mobile Optimization

### Touch Targets
- Card minimum: 44px tap target
- Hover effects disabled on touch devices
- Active states for feedback

### Performance
- Lazy loading images
- Optimized image URLs (width: 400px)
- Reduced motion support
- Efficient re-renders

## 🎨 Design Inspiration

Following best practices from:
- ✓ Airbnb (clean cards, perfect spacing)
- ✓ Wolt (light design, premium feel)
- ✓ Uber Eats (consistent layout)
- ✓ TooGoodToGo (environmental friendly)
- ✓ DoorDash (clear pricing)

## 🔄 Migration Guide

### From Old OfferCard
```tsx
// Old
<OfferCard offer={offer} onClick={onClick} variant="grid" />

// New
<OfferCardUnified offer={offer} onClick={onClick} />
```

### From Custom Grid
```tsx
// Old
<div className="grid grid-cols-3 gap-3">
  {offers.map(offer => <OfferCard key={offer.id} />)}
</div>

// New
<OffersGridUnified offers={offers} onOfferClick={handleClick} />
```

## ✨ Usage Examples

### With Category Filter
```tsx
const [category, setCategory] = useState('');
const filtered = category 
  ? offers.filter(o => o.category === category)
  : offers;

<OffersGridUnified
  offers={filtered}
  onOfferClick={handleClick}
  title={category ? `${category} Offers` : 'All Offers'}
/>
```

### With Sections
```tsx
<>
  <OffersGridUnified
    offers={newOffers}
    onOfferClick={handleClick}
    title="New Offers"
  />
  
  <OffersGridUnified
    offers={expiringSoon}
    onOfferClick={handleClick}
    title="Expiring Soon"
  />
</>
```

## 🎯 Quality Checklist

- ✅ All images same height (140px)
- ✅ Consistent border radius (16px)
- ✅ Uniform padding (12px)
- ✅ Same gap spacing (16px)
- ✅ Badges properly positioned
- ✅ No text overflow
- ✅ No image stretching
- ✅ Perfect alignment
- ✅ Smooth animations
- ✅ Accessible contrast
- ✅ Touch-friendly
- ✅ Performance optimized

## 🚀 Result

A pixel-perfect, professional, consistent offer card system that:
- Looks premium and polished
- Works perfectly on all devices
- Maintains visual consistency
- Provides excellent UX
- Easy to maintain and extend
