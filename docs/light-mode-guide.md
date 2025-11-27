# SmartPick Light Mode — Complete Implementation Guide

## Overview
This guide shows how to integrate the soft pastel light mode design into SmartPick, matching the beige map, white chips, and teal bottom navbar aesthetic.

---

## A) MapLibre Style Integration

### File Location
`src/map/styles/smartpick-light.maplibre.json`

### Usage in React Component

```tsx
import lightStyle from '@/map/styles/smartpick-light.maplibre.json';
import maplibregl from 'maplibre-gl';

// Inject your MapTiler API key
const styleWithKey = JSON.parse(JSON.stringify(lightStyle));
styleWithKey.sprite = `https://api.maptiler.com/maps/streets/sprite?key=${MAPTILER_KEY}`;
styleWithKey.glyphs = `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${MAPTILER_KEY}`;
styleWithKey.sources.openmaptiles.url = `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_KEY}`;

const map = new maplibregl.Map({
  container: mapContainerRef.current,
  style: styleWithKey,
  center: [44.793, 41.72], // Tbilisi
  zoom: 12,
});
```

### Key Style Features
- **Background**: `#F4EDE1` (soft beige)
- **Roads**: Primary `#D9D3C8`, Secondary `#E0DBD1`, Tertiary `#E8E4DF`
- **Parks**: `#E7F5DF` (pastel green)
- **Water**: `#D5E7F0` (pastel blue)
- **Buildings**: `#F8F4EF` with subtle `#E8E4DF` stroke
- **Labels**: `#6B6358` (primary), `#8B8275` (secondary)

---

## B) Pastel Pin Integration

### File Location
`src/components/map/PastelPins.tsx`

### Adding Pins to Map

```tsx
import { PASTEL_PINS, PASTEL_PIN_COLORS } from '@/components/map/PastelPins';
import { createRoot } from 'react-dom/client';

// For each offer location
offers.forEach((offer) => {
  const { latitude, longitude, category } = offer;
  
  // Create marker container
  const markerDiv = document.createElement('div');
  markerDiv.className = 'map-pin-container';
  markerDiv.style.cssText = `
    cursor: pointer;
    transition: transform 0.2s ease;
  `;
  
  // Render React pin component
  const PinComponent = PASTEL_PINS[category] || PASTEL_PINS.grocery;
  const root = createRoot(markerDiv);
  root.render(<PinComponent size={32} />);
  
  // Add hover effect
  markerDiv.addEventListener('mouseenter', () => {
    markerDiv.style.transform = 'scale(1.15)';
  });
  markerDiv.addEventListener('mouseleave', () => {
    markerDiv.style.transform = 'scale(1)';
  });
  
  // Create MapLibre marker
  const marker = new maplibregl.Marker({
    element: markerDiv,
    anchor: 'bottom',
  })
    .setLngLat([longitude, latitude])
    .addTo(map);
    
  // Handle click
  markerDiv.addEventListener('click', () => {
    onOfferClick(offer);
  });
});
```

### Pin Color Reference

| Category | Color | Hex |
|----------|-------|-----|
| Bakery | Coral | #EF8A7E |
| Coffee | Teal | #7BAFC2 |
| Desserts | Pink | #FFB5CC |
| Fresh Produce | Green | #A5D2A1 |
| Meat/Fish | Rose | #E89B9B |
| Hot Meals | Orange | #EDAD72 |
| Pizza | Yellow | #E5C26B |
| Healthy | Sage | #8FD69F |
| Drinks | Blue-grey | #88A8B9 |
| Prepared Meals | Tan | #C9A988 |
| Snacks | Peach | #F5C17A |
| Grocery | Taupe | #B8A49C |

---

## C) Homepage Layout Component

### File Location
`src/components/LightModeHomepage.tsx`

### Structure

```
┌─────────────────────────────────┐
│  Search Bar (white, rounded)    │
├─────────────────────────────────┤
│  Category Chips (horizontal)    │
│  [OPEN NOW] [Bakery] [Coffee]   │
├─────────────────────────────────┤
│                                  │
│         Map Container            │
│     (beige, rounded corners)     │
│                                  │
│                                  │
├─────────────────────────────────┤
│  Bottom Navbar (teal #7BAFC2)   │
│  [Map] [Browse] [Saved] [Profile]│
└─────────────────────────────────┘
```

### Key Layout Classes (Tailwind)

```tsx
// Search bar
className="w-full h-12 pl-11 pr-4 rounded-xl bg-white shadow-sm border border-[#E8E4DF]"

// Category chip (inactive)
className="px-4 py-2 rounded-full bg-white border border-[#E8E4DF] shadow-sm"

// Category chip (active)
className="px-4 py-2 rounded-full bg-white border-2 border-[#7BAFC2] shadow-md"

// Open Now chip (active)
className="px-4 py-2 rounded-full bg-[#7BAFC2] text-white shadow-md"

// Map container
className="w-full h-full rounded-2xl overflow-hidden shadow-lg border border-[#E8E4DF]"

// Bottom navbar
className="h-20 bg-[#7BAFC2] shadow-lg border-t border-[#6A9AAC]"

// Bottom tab (active)
className="flex flex-col items-center bg-white/20 rounded-lg"
```

---

## D) Category Chip Interaction

### Filter Logic

```tsx
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [openNow, setOpenNow] = useState(false);

// Toggle category
const handleCategoryClick = (categoryId: string) => {
  setSelectedCategory(prev => prev === categoryId ? null : categoryId);
};

// Filter offers
const filteredOffers = useMemo(() => {
  return offers.filter(offer => {
    const categoryMatch = !selectedCategory || offer.category === selectedCategory;
    const openMatch = !openNow || isOfferOpenNow(offer);
    return categoryMatch && openMatch;
  });
}, [offers, selectedCategory, openNow]);
```

### Smooth Scroll for Chips

```css
/* In your global CSS or Tailwind */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

---

## E) Bottom Navbar Routing

### Tab Configuration

```tsx
const BOTTOM_TABS = [
  { id: 'map', label: 'Map', icon: MapPin, route: '/' },
  { id: 'browse', label: 'Browse', icon: Grid, route: '/browse' },
  { id: 'saved', label: 'Saved', icon: Heart, route: '/saved' },
  { id: 'profile', label: 'Profile', icon: User, route: '/profile' },
];
```

### Next.js Integration

```tsx
import { useRouter, usePathname } from 'next/navigation';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  
  const handleTabClick = (route: string) => {
    router.push(route);
  };
  
  return (
    <div className="h-20 bg-[#7BAFC2]">
      {BOTTOM_TABS.map(tab => {
        const isActive = pathname === tab.route;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.route)}
            className={isActive ? 'bg-white/20' : ''}
          >
            <tab.icon className="w-6 h-6 text-white" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

---

## F) Responsive Breakpoints

```tsx
// Mobile first (default above)
// Tablet: Add side margins
className="md:px-8"

// Desktop: Max width container, centered
<div className="max-w-md mx-auto">
  <LightModeHomepage />
</div>
```

---

## G) Animation & Transitions

### Pin Hover

```tsx
markerDiv.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
markerDiv.addEventListener('mouseenter', () => {
  markerDiv.style.transform = 'scale(1.15)';
});
```

### Chip Click Feedback

```tsx
className="transition-all duration-200 active:scale-95"
```

### Map Zoom Transitions
MapLibre handles this automatically with the `interpolate` expressions in the style JSON.

---

## H) Color Palette Summary

```ts
// Copy-paste ready
export const LIGHT_MODE_COLORS = {
  bg: '#F4EDE1',
  surface: '#FFFFFF',
  text: '#6B6358',
  textSecondary: '#8B8275',
  border: '#E8E4DF',
  accent: '#7BAFC2',
  accentDark: '#6A9AAC',
  
  // Map
  mapRoad: '#D9D3C8',
  mapPark: '#E7F5DF',
  mapWater: '#D5E7F0',
  mapBlock: '#F8F4EF',
};
```

---

## I) Folder Structure

```
src/
├── components/
│   ├── LightModeHomepage.tsx         ← Main layout
│   ├── map/
│   │   ├── PastelPins.tsx            ← Pin SVG components
│   │   └── MapContainer.tsx          ← Reusable map wrapper
│   └── ui/
│       ├── CategoryChip.tsx          ← Reusable chip
│       └── BottomNav.tsx             ← Navbar component
├── map/
│   └── styles/
│       └── smartpick-light.maplibre.json  ← Style JSON
├── styles/
│   ├── theme-light.ts                ← Design tokens
│   └── globals.css                   ← Global styles
└── lib/
    ├── mapUtils.ts                   ← Pin placement helpers
    └── filterUtils.ts                ← Category filtering
```

---

## J) Quick Start Commands

### 1. Copy files to your project
```bash
# Already created:
# - src/map/styles/smartpick-light.maplibre.json
# - src/components/map/PastelPins.tsx
# - src/components/LightModeHomepage.tsx
# - src/styles/theme-light.ts
```

### 2. Update your MapTiler key
```bash
# In .env or .env.local
VITE_MAPTILER_KEY=your_key_here
```

### 3. Use the light mode homepage
```tsx
// In your app/page.tsx or routes
import LightModeHomepage from '@/components/LightModeHomepage';

export default function HomePage() {
  return <LightModeHomepage />;
}
```

### 4. Test locally
```bash
pnpm dev
# Visit http://localhost:5173
```

---

## K) Design Checklist

- [ ] Beige map background visible
- [ ] White search bar with shadow
- [ ] Horizontal category chips with smooth scroll
- [ ] "OPEN NOW" toggle distinct style
- [ ] Map rounded corners (20px)
- [ ] Pastel pins rendering with correct colors
- [ ] Teal bottom navbar (#7BAFC2)
- [ ] Active tab highlighted with bg-white/20
- [ ] No neon colors anywhere
- [ ] Soft shadows (max 0.10 opacity)
- [ ] Smooth transitions on all interactions

---

## L) Performance Tips

1. **Pin Clustering**: Use Supercluster for 100+ pins
2. **Lazy Load Pins**: Only render pins in viewport
3. **Memoize Filters**: Use `useMemo` for filtered offers
4. **Debounce Search**: Delay search by 300ms
5. **Image Sprites**: Combine pin SVGs into sprite sheet for faster rendering

---

## M) Accessibility

```tsx
// Search input
<input aria-label="Search for food near you" />

// Category chips
<button aria-pressed={isActive} aria-label={`Filter by ${category}`}>

// Bottom tabs
<button role="tab" aria-selected={isActive} aria-label={tabLabel}>

// Map container
<div role="application" aria-label="Interactive map of nearby offers">
```

---

## N) Dark Mode Toggle (Optional Future)

```tsx
const [theme, setTheme] = useState<'light' | 'dark'>('light');

const mapStyle = theme === 'light' 
  ? lightStyle 
  : darkStyle; // Use calm-night.maplibre.json
```

---

## Complete! 🎉

Your SmartPick light mode is ready to deploy. The design matches the soft, elegant, pastel aesthetic with:
- Beige map base
- White chip filters
- Teal bottom navbar
- 12 pastel category pins
- Zero neon, zero dark gradients
- Premium, friendly, modern vibe

For questions or adjustments, refer to the design tokens in `src/styles/theme-light.ts`.
