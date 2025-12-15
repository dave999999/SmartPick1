# 🌟 The New SmartPick Discovery Experience

**A walkthrough from the user's perspective**

---

## 👤 Meet Sarah

Sarah is hungry after work. She opens SmartPick on her iPhone as she walks down Rustaveli Avenue in Tbilisi.

---

## 🗺️ Chapter 1: The Map

The app opens to a beautiful map showing her current location (blue dot) and dozens of orange pins scattered across nearby neighborhoods — each representing a partner with active food offers.

At the bottom is a curved navigation bar with 5 icons:
- **Home** (currently active, orange)
- **Favorites** (heart)
- **★ Reserve** (center, floating, glowing)
- **Profile**
- **Menu**

The map is clean, fast, and responsive. Sarah can pinch to zoom, pan around, and see which restaurants are nearby.

---

## ⭐ Chapter 2: Discovery Begins

Sarah taps the glowing **star button** in the center.

**Whoosh!** — A sleek white panel slides up from the bottom, revealing:

```
┌─────────────────────────────────┐
│  ═══ (drag handle)              │
│  ⭐ Explore Offers (24)    →    │
│  ┌────────┐ ┌────────┐          │
│  │ Croiss │ │ Pizza  │          │
│  └────────┘ └────────┘          │
└─────────────────────────────────┘
```

The sheet shows a **peek preview** — she can see the first 2 trending offers at a glance.

*Interesting! But I want to see more...*

---

## 📱 Chapter 3: Browsing Offers

Sarah **swipes up** on the sheet. It smoothly expands to **mid-height**, now taking up half the screen:

```
┌─────────────────────────────────┐
│ Discover              [X]       │
│ 🔍 Search deals...    [≡]      │
│ ⭐ Recommended  📍 Nearest 💸.. │
│ ⭐ All 🍕 Restaurant 🍞 Bakery │
│ 🔥 Trending Right Now           │
│ ┌────────┐ ┌────────┐          │
│ │[Image] │ │[Image] │          │
│ │22h 30m │ │1h 15m  │          │
│ │-42%    │ │-35%    │          │
│ │Croiss..│ │Pizza Sl│          │
│ │₾4.50   │ │₾3.20   │          │
│ └────────┘ └────────┘          │
│ ┌────────┐ ┌────────┐          │
│ │...     │ │...     │          │
└─────────────────────────────────┘
```

Now she sees:
- A **search bar** at the top ("Search deals, places, items…")
- **Sort pills**: Recommended ⭐ | Nearest 📍 | Cheapest 💸 | Expiring Soon ⏳
- **Category chips**: All ⭐ | Restaurant 🍕 | Bakery 🍞 | Dessert 🍰
- **Offer sections**: 
  - 🔥 Trending Right Now
  - ⏰ Closing Soon
  - 💸 Under 5 GEL

Each offer is displayed as a compact card:
- **Image** (4:3 ratio) showing delicious food
- **Time remaining** badge (22h 30m)
- **Discount badge** (-42% off)
- **Title** ("Croissant Bundle")
- **Partner name** ("Bella's Bakery")
- **Price** (₾4.50, was ₾8.00)
- **Stock** ("3 left")

Sarah scrolls down. As she scrolls, the map pins **bounce** to show which offer she's currently viewing. This helps her understand where each deal is located.

---

## 🍞 Chapter 4: Finding Bakery Deals

*I'm in the mood for something sweet...*

Sarah taps the **🥐 Bakery** chip. The offers instantly filter to show only bakery items.

She also taps **📍 Nearest** to sort by distance. Now the closest bakery offers appear first.

*Perfect! There's a croissant deal just 400 meters away.*

---

## 🔍 Chapter 5: Searching for Pizza

Actually, Sarah changes her mind. She types **"pizza"** into the search bar.

As she types, the offers update in real-time (with a 300ms debounce to avoid lag).

```
┌─────────────────────────────────┐
│ 🔍 pizza              [X]      │
│ ⭐ Recommended  📍 Nearest     │
│ 📍 All Offers (4)               │
│ ┌────────┐ ┌────────┐          │
│ │Pizza   │ │Pizza   │          │
│ │Margher.│ │Pepperoni│         │
│ │₾5.00   │ │₾6.50   │          │
│ └────────┘ └────────┘          │
└─────────────────────────────────┘
```

4 pizza offers appear. She taps **Clear Filters** to see everything again.

---

## 📍 Chapter 6: Tapping a Map Pin

Sarah minimizes the sheet by swiping down, and looks at the map.

She sees a pin near her office. *What's this place?*

She **taps the map pin**.

**Whoosh!** — The sheet transforms:

```
┌─────────────────────────────────┐
│ ← Bella's Bakery        [X]     │
│ Saburtalo • Great picks here ✨ │
│ ⭐ 4.8 (240) • 0.4 km • 5 min  │
│ [View on map →]                 │
│ ┌───────────────────────────┐  │
│ │                           │  │
│ │   [Large Image]           │  │
│ │   22h 30m       -42%      │  │
│ │                           │  │
│ │   Croissant Bundle        │  │
│ │   Fresh croissants + ...  │  │
│ │   ₾4.50 (was ₾8.00)       │  │
│ │   3 left                  │  │
│ │   [Reserve Now]           │  │
│ │                           │  │
│ └───────────────────────────┘  │
│ • • ○ (3 dots)                  │
│ [See all 5 offers from this...] │
└─────────────────────────────────┘
```

The sheet is now in **Partner Mode**, showing:
- **Partner name**: "Bella's Bakery"
- **Location**: Saburtalo district
- **Tagline**: "Great picks here ✨"
- **Rating**: ⭐ 4.8 (240 reviews)
- **Distance**: 0.4 km
- **Walking time**: 5 min
- **A large, beautiful offer card** (full-width, 16:9 image)
- **Reserve button** at the bottom

She swipes left — **whoosh!** — the next offer appears (a Pain au Chocolat deal).

Pagination dots at the bottom show she's on offer 2 of 3.

---

## 🎯 Chapter 7: Reserving an Offer

*This croissant bundle looks amazing! And I'm only 5 minutes away.*

Sarah taps **"Reserve Now"**.

A reservation modal slides up from the bottom:

```
┌─────────────────────────────────┐
│ Reserve: Croissant Bundle       │
│ Bella's Bakery                  │
│                                 │
│ Pickup Window:                  │
│ Today, 18:00 - 19:00            │
│                                 │
│ Price Breakdown:                │
│ Base Price: ₾4.50               │
│ Points Earned: +50              │
│                                 │
│ [Cancel] [Confirm Reservation]  │
└─────────────────────────────────┘
```

She taps **"Confirm Reservation"**.

✅ **Success!**

---

## 🎉 Chapter 8: Post-Reservation

The sheet closes. A new **floating card** appears at the top of the screen:

```
┌─────────────────────────────────┐
│ ✅ Reserved - Bella's Bakery    │
│ 400m away • 5 min walk          │
│ Pickup: 18:00-19:00 (3h 22m)    │
│ [View QR] [Navigate]            │
└─────────────────────────────────┘
```

Sarah taps **"Navigate"**.

The map switches to navigation mode, showing:
- A blue route line from her location to the bakery
- Turn-by-turn directions
- Live ETA updates
- A top bar: "← Navigating to Bella's Bakery (5 min)"

She follows the route, picks up her delicious croissants, and enjoys a discounted treat! 🥐

---

## 💡 Key Moments

### What Made This Experience Great?

1. **One Unified Tool**
   - No confusion between "explore" and "map pin" views
   - Same sheet, different modes — seamless

2. **Progressive Disclosure**
   - Starts collapsed (peek)
   - Expands to show more detail
   - Full-screen for deep browsing

3. **Powerful Filters**
   - Search by keyword
   - Sort by distance, price, time
   - Filter by category
   - All instant, no page reloads

4. **Map Synchronization**
   - Scrolling offers highlights map pins
   - Tapping pins opens partner view
   - Always clear where offers are located

5. **Beautiful Design**
   - Smooth animations (Framer Motion)
   - Cosmic orange accents
   - High-quality food images
   - Clear typography

6. **Mobile-First**
   - Thumb-friendly zones
   - Swipe gestures
   - Safe area padding (iPhone notch)
   - Fast performance

7. **Smart Details**
   - Time remaining badges (urgency)
   - Discount percentages (savings)
   - Distance + walking time
   - Stock indicators ("3 left")
   - Partner ratings

---

## 📊 User Flow Diagram

```
[App Launch]
     ↓
[Map View + Star Button]
     ↓
[Tap Star] → [Sheet Opens: Discover Mode, Collapsed]
     ↓
[Swipe Up] → [Mid Height: Browse Offers]
     ↓
[Apply Filters] → [Sort, Search, Category]
     ↓
[Scroll Offers] → [Map Pins Highlight]
     ↓
[Tap Offer Card] → [Reservation Modal Opens]
     ↓
[Confirm Reservation] → [Floating Card Appears]
     ↓
[Tap Navigate] → [Navigation Mode]
     ↓
[Arrive] → [Show QR] → [Pickup Complete]

OR

[Tap Map Pin] → [Sheet Opens: Partner Mode, Mid]
     ↓
[Swipe Through Carousel] → [View Partner Offers]
     ↓
[Tap Reserve] → [Reservation Modal Opens]
     ↓
(same flow as above)
```

---

## 🎨 Design Philosophy

### Why This Works

**1. Familiar Patterns**
- Bottom sheets: Users know how to interact (swipe, drag)
- Search bars: Universal pattern for filtering
- Carousels: Swipe left/right is intuitive

**2. Contextual Modes**
- **Discover Mode**: "Show me everything nearby"
- **Partner Mode**: "Tell me about THIS place"

**3. No Dead Ends**
- Every screen has a clear next action
- Back buttons return to previous context
- Empty states suggest alternatives

**4. Visual Hierarchy**
- Important info is large and bold (price, title)
- Secondary info is smaller (partner name, stock)
- Badges draw attention to urgency (time, discount)

**5. Feedback Loops**
- Tap → immediate visual response
- Scroll → map pins bounce
- Reserve → success confirmation
- Navigate → live route updates

---

## 🌈 Emotional Journey

| Moment | Feeling | Design Element |
|--------|---------|----------------|
| Opens app | **Curious** | Clean map, many options |
| Taps star | **Excited** | Smooth animation, preview |
| Browses offers | **Engaged** | Beautiful cards, food photos |
| Finds deal | **Delighted** | Big discount badge, "3 left" |
| Sees distance | **Confident** | "400m, 5 min" — totally doable |
| Reserves | **Accomplished** | Success animation, clear next step |
| Navigates | **Guided** | Blue route, live ETA |
| Picks up | **Satisfied** | Great food at a great price! |

---

## 🚀 The Result

Sarah saved ₾3.50 on fresh croissants, discovered a new bakery near her office, and had a delightful experience using SmartPick.

She'll definitely use the app again tomorrow!

---

## 💬 What Sarah Would Say

> "I love how easy it is to find deals nearby. The map shows me where everything is, and I can filter by what I'm craving. The swipeable cards are so smooth! And seeing the time left on each deal helps me decide quickly. SmartPick feels like a premium app — totally worth it!"

---

**This is the experience you're building. ✨**

Every design decision, animation, and UX pattern works together to create a **delightful, efficient, and intuitive** food discovery journey.

Welcome to the new SmartPick! 🧡

---

**Document Version:** 1.0  
**Last Updated:** December 1, 2025  
**For:** SmartPick Team & Stakeholders
