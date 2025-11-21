# SmartPick Image Library

This directory contains curated product images that partners can use when creating offers.

## Directory Structure

```
library/
├── BAKERY/          # Bakery products (pastries, bread, cakes, etc.)
├── RESTAURANT/      # Restaurant dishes (meals, plates, etc.)
├── CAFE/            # Cafe items (coffee, beverages, snacks)
├── GROCERY/         # Grocery items (produce, packaged goods)
├── ALCOHOL/         # Alcoholic beverages (wine, beer, spirits)
└── FAST_FOOD/       # Fast food items (burgers, pizza, fries)
```

## How to Add Images

1. **Choose the right category** - Place images in the appropriate folder based on business type
2. **File formats** - Supported: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`, `.gif`
3. **File naming** - Use descriptive, lowercase names with hyphens (e.g., `chocolate-croissant.jpg`)
4. **Image requirements**:
   - Minimum size: 800x800px recommended
   - Aspect ratio: Square (1:1) or landscape (4:3) preferred
   - File size: Under 500KB for optimal loading
   - Quality: High-resolution, well-lit, appetizing photos

## Image Guidelines

### Good Photos
- Clean, bright backgrounds (white or neutral)
- Focused on the product
- Appetizing presentation
- High resolution and sharp focus
- Consistent lighting

### Avoid
- Blurry or low-quality images
- Dark or poorly lit photos
- Cluttered backgrounds
- Watermarked images
- Copyrighted images without permission

## Usage

Partners can select these images when creating offers through the Partner Dashboard. The images are fetched dynamically via the `/api/library?category={CATEGORY}` endpoint.

## API Usage

```
GET /api/library?category=BAKERY
```

Response:
```json
{
  "success": true,
  "category": "BAKERY",
  "count": 15,
  "images": [
    "/library/BAKERY/chocolate-croissant.jpg",
    "/library/BAKERY/french-baguette.jpg",
    ...
  ]
}
```
