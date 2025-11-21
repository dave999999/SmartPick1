# PWA Icons Needed

To complete the PWA setup, you need to add the following icon files to the `/public` folder:

## Required Icons:

1. **icon-192.png** (192x192 pixels)
   - App icon for Android home screen
   - Should have transparent or white background
   - Use your SmartPick logo

2. **icon-512.png** (512x512 pixels)
   - High-res app icon
   - Same design as 192px version
   - Used for splash screens and app stores

## Optional iOS Splash Screens:
(Not critical, but improves iOS experience)

- splash-640x1136.png (iPhone SE)
- splash-750x1334.png (iPhone 8)
- splash-1242x2208.png (iPhone 8 Plus)
- splash-1125x2436.png (iPhone X)
- splash-1536x2048.png (iPad)

## Optional Screenshots:
(For enhanced install prompts)

- screenshot-mobile.png (390x844)
- screenshot-desktop.png (1920x1080)

## How to Create Icons:

### Option 1: Use an Online Tool (Easiest)
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload your logo/icon (square, min 512x512)
3. Download the generated icons
4. Place them in the `/public` folder

### Option 2: Use Photoshop/Figma
1. Create a 512x512 canvas
2. Add your SmartPick logo centered
3. Export as PNG at 512x512 (icon-512.png)
4. Resize to 192x192 and export (icon-192.png)

### Option 3: Temporary Placeholders
For testing, you can use your existing favicon:
```bash
# Copy existing favicon as temporary icons
cp public/favicon_io/android-chrome-192x192.png public/icon-192.png
cp public/favicon_io/android-chrome-512x512.png public/icon-512.png
```

## Color Scheme:
- Primary: #4CC9A8 (SmartPick mint green)
- Background: White or transparent

## Design Tips:
- Keep it simple and recognizable
- Ensure it looks good on both light and dark backgrounds
- Test how it appears when rounded (iOS style) and square (Android)
