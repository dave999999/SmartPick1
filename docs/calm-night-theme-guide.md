# SmartPick Calm Night Map Theme

A soft, calm night mode for MapLibre/Mapbox with full OpenStreetMap road network visibility and excellent pin/readability balance.

## Palette
- Background: `#0C1118`, `#10151D`, `#111722`
- Land blocks: `#12171F`, `#171C24`
- Water: `#0A0F14`
- Parks: `#1A2A1A`
- Building footprints: `#141A22`
- Roads
  - Major: `#3A4457`
  - Secondary: `#2E3647`
  - Residential: `#252D3A`
  - Outline: `rgba(255,255,255,0.05)`
- Labels
  - Primary: `#C4CFDD`
  - Secondary: `#9AA7B5`
  - Halo: `#0C1118`

## Road Hierarchy (Colors + Widths)
Widths are zoom-dependent. Below are typical values; actual style uses continuous interpolation for smooth transitions.

| Class                               | Color       | z12 | z14 | z16 | z18 | z20 |
|-------------------------------------|-------------|-----|-----|-----|-----|-----|
| motorway                            | #3A4457     | 1.6 | 2.2 | 3.2 | 4.8 | 6.0 |
| trunk, primary                      | #3A4457     | 1.3 | 2.0 | 2.6 | 4.2 | 5.2 |
| secondary, tertiary                 | #2E3647     | 1.0 | 1.6 | 2.0 | 3.2 | 4.2 |
| residential, minor                  | #252D3A     | 0.8 | 1.3 | 1.5 | 2.4 | 3.2 |
| service                             | #252D3A     | 0.7 | 1.1 | 1.2 | 2.0 | 2.6 |
| cycleway                            | #2E3647     | 0.45| 0.7 | 0.8 | 1.2 | 1.6 |
| pedestrian, path, footway, steps    | #2E3647     | 0.45| 0.7 | 0.8 | 1.2 | 1.6 |
| casing (outline, all classes)       | rgba(255,255,255,0.05) | +0.6 to +0.8 vs. fill (interpolated) |

Special treatments:
- Tunnels: 60% opacity, subtle dash `[2,2]`.
- Bridges: Slightly wider casing and clean fill to sit above buildings.

## Land/Water/Buildings/Parks
- Land: `#12171F → #171C24` with subtle deepening at high zooms.
- Water: `#0A0F14` for lakes, rivers, waterways; narrow waterways use lines.
- Parks/Green: `#1A2A1A` at 0.8 opacity; muted to avoid glow.
- Buildings: `#141A22` with a faint outline `#1B212B` ramping from z15.

## Labels
- Road labels: `#9AA7B5` with halo `#0C1118` for contrast; appear from z12 with smooth opacity.
- Place labels (city/town/village/suburb): `#C4CFDD` with halo `#0C1118`.
- POIs intentionally minimized for a calmer look; app pins take priority.

## Pins (SVG Guidelines)
Use a clean teardrop with a soft stroke for clarity over dark maps.

- Colors:
  - Bakery: `#FFC97A`
  - Coffee: `#D2B89A`
  - Desserts: `#FFB5CC`
  - Healthy/Fruit: `#8CDFA2`
  - Pizza/Fast food: `#FF9F6A`
  - Price badge: `rgba(0,0,0,0.35)` background, white text
- Sizing: 24px (map), 32px (hover/selected), 40px (cluster representative)
- Stroke: 1px `rgba(0,0,0,0.35)` or `#0C1118` to seat pins on the night background
- Shadow: none or very soft `0 1px 0 rgba(0,0,0,0.25)` (avoid heavy glow)

Example SVG (color via `fill`):
```svg
<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 2c4.05 0 7.33 3.17 7.33 7.2 0 4.79-4.84 9.54-6.62 11.2a1 1 0 0 1-1.42 0C9.5 18.01 4.67 13.24 4.67 9.2 4.67 5.17 7.95 2 12 2z" fill="#FFC97A"/>
  <circle cx="12" cy="9.2" r="3.2" fill="rgba(0,0,0,0.35)"/>
</svg>
```
Swap the `fill` for category color. The inner circle can hold a white glyph or be used as a subtle price badge background.

## UI CSS (Night, Soft Blur-Glass)
Define tokens and apply to panels, search, bottom categories, and side icons.

```css
:root {
  --bg-0: #0C1118;
  --bg-1: #10151D;
  --bg-2: #111722;
  --land-0: #12171F;
  --land-1: #171C24;
  --water: #0A0F14;
  --park: #1A2A1A;
  --building: #141A22;
  --road-major: #3A4457;
  --road-secondary: #2E3647;
  --road-residential: #252D3A;
  --road-outline: rgba(255,255,255,0.05);
  --text-primary: #C4CFDD;
  --text-secondary: #9AA7B5;
  --panel-blur: 12px;
  --panel-bg: rgba(16,21,29,0.6); /* glass */
  --panel-stroke: rgba(255,255,255,0.06);
  --panel-shadow: 0 4px 14px rgba(0,0,0,0.35);
}

.panel-glass {
  background: var(--panel-bg);
  backdrop-filter: blur(var(--panel-blur)) saturate(120%);
  -webkit-backdrop-filter: blur(var(--panel-blur)) saturate(120%);
  border: 1px solid var(--panel-stroke);
  border-radius: 12px;
  box-shadow: var(--panel-shadow);
}

/* Top search bar */
.map-search {
  composes: panel-glass;
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; height: 44px;
}
.map-search input {
  flex: 1; background: transparent; border: 0; outline: 0;
  color: var(--text-primary); font-size: 14px;
}
.map-search input::placeholder { color: color-mix(in oklab, var(--text-secondary) 70%, transparent); }

/* Bottom category bar */
.category-bar { composes: panel-glass; display: flex; gap: 8px; padding: 6px; }
.category-pill {
  background: rgba(17,23,34,0.7);
  border: 1px solid rgba(255,255,255,0.06);
  color: var(--text-secondary);
  font-size: 12px; line-height: 16px;
  padding: 6px 10px; border-radius: 10px;
}
.category-pill[aria-selected="true"] {
  color: var(--text-primary);
  border-color: rgba(255,255,255,0.12);
}

/* Side icons with tooltips */
.side-icon { composes: panel-glass; width: 40px; height: 40px; display:grid; place-items:center; }
.tooltip {
  position: absolute; transform: translateY(-8px);
  background: rgba(16,21,29,0.85);
  color: var(--text-secondary);
  padding: 6px 8px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.06);
  white-space: nowrap; font-size: 12px;
}
```

## MapLibre Style JSON
- Path: `src/map/styles/calm-night.maplibre.json`
- Based on the OpenMapTiles schema:
  - Layers include: `highway` (motorway), `trunk`, `primary`, `secondary`, `tertiary`, `residential`/`minor`, `service`, `cycleway`, `pedestrian`, `path`/`footway`/`steps`.
  - Casings (outlines) sit under fills; tunnels lower opacity + dashed; bridges above buildings.
- Source URL defaults to the MapLibre demo tiles; replace with your own OpenMapTiles endpoint for full coverage.

## Next.js + MapLibre Integration
Use the JSON directly as your map style. Two common options:

1) Serve as a static asset and reference by URL:
```ts
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export default function Map() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: '/map/styles/calm-night.maplibre.json',
      center: [0, 0],
      zoom: 2,
      attributionControl: false
    });
    return () => map.remove();
  }, []);
  return <div ref={ref} style={{width:'100%',height:'100%'}}/>;
}
```

2) Import JSON and pass the object:
```ts
import style from '@/map/styles/calm-night.maplibre.json';

new maplibregl.Map({ container, style });
```

Replace the vector tile source URL (`sources.openmaptiles.url`) with your own OpenMapTiles server or a provider-compatible endpoint. If your dataset uses different layer names, update the `source-layer` and `class` filters accordingly.

## Pin Placement and Sizing in MapLibre
Use HTML markers (recommended for flexibility and tooltip control) with the SVG above, or sprite symbols if you prefer in-style icons. Keep z-index above roads but below search/controls. Minimum on-screen size: 16px.

## Notes
- No bright saturation or heavy glow. All contrast derives from subtle value shifts and halos.
- Road and label transitions are continuous using `interpolate` for readable zooming.
- Pedestrian/cycle/path types use dash patterns to differentiate without neon.
