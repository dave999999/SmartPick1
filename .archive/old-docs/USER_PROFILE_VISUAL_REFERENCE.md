# 📱 User Profile Visual Reference

## Before & After Transformation

### 🌑 BEFORE: Dark Admin Dashboard
```
┌────────────────────────────────────────┐
│ ← [DH] Dave Smith          ⚠️ 2      │ ← Dark slate header
│    Partner                             │
├────────────────────────────────────────┤
│ Overview Achievements Wallet Settings  │ ← Dark tabs
├────────────────────────────────────────┤
│ [Dark Card]  [Dark Card]               │
│ 📧 Email     📱 Phone                  │
│ dave@...     555-1234                  │
│                                        │
│ [Dark Card]  [Dark Card]               │
│ 📅 Joined    🛡️ Status                │
│ Jan 2024     Penalized                 │
├────────────────────────────────────────┤
│ Your Stats | Level | Streak | Invite  │ ← Nested dark tabs
├────────────────────────────────────────┤
│ [Complex dark gamification section]    │
└────────────────────────────────────────┘
```

### ☀️ AFTER: Warm Mobile-First Experience
```
┌────────────────────────────────────────┐
│ ╭────╮  Hi Dave! 👋           [✏️]   │ ← Soft gradient header
│ │ DH │  Your SmartPick journey         │   (emerald-50 to cyan-50)
│ │ 🟢 │  🌟 Partner                     │
│ ╰────╯                                 │
├────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │ 📧  Email                          │ │ ← Compact info card
│ │     dave@example.com               │ │   (white bg, soft shadows)
│ │ 📱  Phone                          │ │
│ │     + Add phone to unlock features │ │
│ │ 📅  Member since                   │ │
│ │     Jan 15, 2024                   │ │
│ │ ✅  Status                         │ │
│ │     All good! 🎉                   │ │
│ └────────────────────────────────────┘ │
├────────────────────────────────────────┤
│ ┌─────────┬─────────┐                 │ ← 2×2 Stats Grid
│ │ ⭐ 24   │ 💰 ₾156│                 │   (gamified, animated)
│ │ Reserve │ Saved   │                 │
│ ├─────────┼─────────┤                 │
│ │ 🔥 7    │ 🎁 3   │                 │
│ │ Streak  │ Invites │                 │
│ └─────────┴─────────┘                 │
├────────────────────────────────────────┤
│ ✨ You're off to a great start! 🌱   │ ← Journey encouragement
│    7 reservations and counting         │   (soft gradient bg)
│    📈 You're in top 25% of users      │
├────────────────────────────────────────┤
│ 🏠 Overview│🏆 Achievements│💼│⚙️│   │ ← Rounded pill tabs
│ ───────                                │
└────────────────────────────────────────┘
```

---

## 🎨 Component Breakdown

### 1. ProfileHeader (Lines 1-90)

**Dimensions**: Full width, ~160px height
**Layout**: Horizontal flex, 16px gap

```
┌───────────────────────────────────────────────┐
│  ╭─────────────────────────────────────────╮  │
│  │  Soft gradient background (rounded-b-32) │  │
│  │                                           │  │
│  │  ┌────┐  Hi Dave! 👋            [✏️]    │  │
│  │  │ DH │  (22px, bold, gray-900)          │  │
│  │  │    │  Your SmartPick journey so far   │  │
│  │  │🟢 │  (13px, gray-600)                │  │
│  │  └────┘  🌟 Partner                      │  │
│  │  (80px)  (11px badge, white pill)        │  │
│  │                                           │  │
│  ╰─────────────────────────────────────────╯  │
└───────────────────────────────────────────────┘
     ↑                ↑                    ↑
   Avatar        Greeting              Edit Btn
  (pulsing)      (warm)              (floating)
```

**Key Elements**:
- **Avatar**: 80px circle, soft glow animation
- **Greeting**: "Hi {firstName}! 👋" - 22px bold
- **Subtext**: "Your SmartPick journey so far" - 13px gray-600
- **Badge**: Rounded pill with emoji (🌟/💚/👑) + role
- **Edit**: 36px circle, top-right, ghost style
- **Background**: Gradient emerald-50 → teal-50 → cyan-50
- **Decorative**: Floating blur orbs (emerald/cyan)

**Colors**:
- Background: `bg-gradient-to-br from-emerald-50/80 via-teal-50/80 to-cyan-50/80`
- Avatar border: `border-4 border-white`
- Avatar bg: `bg-gradient-to-br from-emerald-500 to-teal-600`
- Status dot: `bg-emerald-500 animate-pulse`

---

### 2. ProfileInfoCard (Height: ~220px)

```
┌─────────────────────────────────────────┐
│ ┌───┐  Email                            │ ← 32px icon box
│ │📧 │  dave@example.com                 │   (blue-50 bg)
│ └───┘  (13px, gray-900)                 │
│                                         │
│ ┌───┐  Phone                            │ ← 32px icon box
│ │📱 │  + Add phone to unlock features   │   (purple-50 bg)
│ └───┘  (13px, emerald-600 link)         │
│                                         │
│ ┌───┐  Member since                     │ ← 32px icon box
│ │📅 │  Jan 15, 2024                     │   (amber-50 bg)
│ └───┘  (13px, gray-900)                 │
│                                         │
│ ┌───┐  Status                           │ ← 32px icon box
│ │✅ │  All good! 🎉                     │   (emerald-50 bg)
│ └───┘  (13px, emerald-700)              │
└─────────────────────────────────────────┘
```

**Spacing**:
- Card padding: 16px
- Vertical gap between items: 12px
- Icon to text gap: 12px
- Label to value gap: 2px

**Icon Boxes** (32px × 32px, rounded-lg):
- Email: `bg-blue-50` + `text-blue-600`
- Phone: `bg-purple-50` + `text-purple-600`
- Calendar: `bg-amber-50` + `text-amber-600`
- Status: `bg-emerald-50` + `text-emerald-600`

---

### 3. StatsGrid (2×2 Grid, 12px gap)

```
┌───────────────┬───────────────┐
│ ┌───┐        │ ┌───┐        │
│ │⭐ │   24   │ │💰 │  ₾156  │ ← 28px values
│ └───┘        │ └───┘        │   (bold, gray-900)
│ Reservations │ Money saved  │ ← 11px labels
│              │              │   (gray-600)
├───────────────┼───────────────┤
│ ┌───┐        │ ┌───┐        │
│ │🔥 │    7   │ │🎁 │    3   │
│ └───┘        │ └───┘        │
│ Day streak   │ Referrals    │
└───────────────┴───────────────┘
```

**Each Card**:
- Size: Flexible (50% width - 6px gap)
- Height: ~110px
- Padding: 16px
- Border: `border-gray-200`
- Shadow: `shadow-sm` → `shadow-md` on hover
- Animation: Scale 1.02 on hover, fade-in-up on mount

**Icon Boxes** (40px × 40px, rounded-xl):
- Reservations: `bg-amber-50` + Star icon (amber-600)
- Money: `bg-emerald-50` + DollarSign icon (emerald-600)
- Streak: `bg-orange-50` + Flame icon (orange-600)
- Referrals: `bg-purple-50` + Gift icon (purple-600)

**Hover Effects**:
1. Card scales to 1.02
2. Shadow increases (sm → md)
3. Icon scales to 1.1
4. Value scales to 1.05
5. Gradient orb appears (opacity 0 → 10%)

---

### 4. JourneyCard (Height: ~100px)

```
┌───────────────────────────────────────────┐
│ ┌───┐                                 🌱  │ ← Emoji badge
│ │✨ │  You're off to a great start!       │   (24px)
│ └───┘  7 reservations and counting        │
│        (15px bold)  (13px regular)        │
│                                           │
│        📈 You're in top 25% of users      │ ← Progress
│           (11px, gray-600)                │   indicator
└───────────────────────────────────────────┘
```

**Background**: Same as ProfileHeader
- Gradient: emerald-50 → teal-50 → cyan-50
- Decorative orbs with blur

**Dynamic Messages** (based on stats):
- 0 reservations: "Welcome to SmartPick! 🌱"
- 1-4: "You're off to a great start! 🌱"
- 5-19: "Keep up the great work! 💪"
- 7+ streak: "Wow! You're on fire! 🔥"
- 20+: "You're a SmartPick superstar! ⭐"

**Icon Box** (40px, white/80, backdrop-blur, pulse):
- Sparkles icon (emerald-600)
- Subtle animation

---

### 5. TabsNav (Sticky, height: ~52px)

```
┌─────────────────────────────────────────────┐
│ ┌─────────┐ ┌──────────┐ ┌──────┐ ┌──────┐│
│ │🏠 Overview│ │🏆 Achieve│ │💼 Wallet│ │⚙️ Set││ ← Active:
│ └─────────┘ └──────────┘ └──────┘ └──────┘│   gradient bg
│ [━━━━━━━]                                  │   white text
└─────────────────────────────────────────────┘   scale 1.05
     ↑
  Active Tab (emoji replaces icon)
```

**Active Tab**:
- Background: `bg-gradient-to-r from-emerald-500 to-teal-600`
- Text: `text-white`
- Shadow: `shadow-lg shadow-emerald-500/30`
- Scale: `1.05`
- Icon: Shows emoji (16px) instead of icon

**Inactive Tab**:
- Background: `bg-gray-100`
- Text: `text-gray-700`
- Icon: Shows Lucide icon (16px)
- Hover: `bg-gray-200`, `scale-105`

**Container**:
- Sticky: `top-0`, `z-10`
- Backdrop: `backdrop-blur-md`
- Border: `border-b border-gray-200`
- Padding: 12px vertical, 20px horizontal
- Scrollable: Horizontal on mobile (scrollbar hidden)

---

### 6. AchievementsPreview (Height: ~280px)

```
┌───────────────────────────────────────────┐
│ ┌───┐ Achievements           View all →  │ ← Header
│ │🏆 │ 2 of 8 unlocked                    │   (15px bold)
│ └───┘ (11px, gray-600)                   │
│                                           │
│ [████░░░░░░░]  25%                       │ ← Progress bar
│                                           │   (8px, amber)
│ ┌─────────┬─────────┐                    │
│ │  🎉✓   │  🔒⚡  │                    │ ← 2×2 Grid
│ │ First  │ Early   │                    │   (8px gap)
│ │Unlocked│  0/5    │                    │
│ │   ✨   │  (10px) │                    │
│ └─────────┴─────────┘                    │
│ ┌─────────┬─────────┐                    │
│ │ [More achievements...]                 │
│ └─────────┴─────────┘                    │
│                                           │
│ Keep going! 6 more to unlock 💪          │ ← Encouragement
└───────────────────────────────────────────┘
```

**Badge States**:

**Unlocked Badge**:
```
┌─────────┐
│   ✓     │ ← Green checkmark (top-right)
│  🎉     │ ← Emoji (28px)
│         │
│ First   │ ← Name (11px, bold, gray-900)
│Unlocked!│ ← Status (10px, amber-700)
│   ✨    │
└─────────┘
Border: amber-200
Background: gradient amber-50 to orange-50
```

**Locked Badge**:
```
┌─────────┐
│  🔒     │ ← Lock icon (center)
│  [⚡]   │ ← Blurred emoji
│         │
│ Early   │ ← Name (11px, gray-500)
│  Bird   │
│  0/5    │ ← Progress (10px, gray-600)
└─────────┘
Border: gray-200
Background: gray-50
```

---

## 📏 Spacing & Measurements

### Page Layout
```
┌─────────────────────────────────────┐
│ ProfileHeader (-mt-4, rounded-b-32) │ 160px
├─────────────────────────────────────┤
│ ↕ 16px spacing                      │
├─────────────────────────────────────┤
│ ProfileInfoCard                     │ 220px
├─────────────────────────────────────┤
│ ↕ 16px spacing                      │
├─────────────────────────────────────┤
│ StatsGrid                           │ 240px
├─────────────────────────────────────┤
│ ↕ 16px spacing                      │
├─────────────────────────────────────┤
│ JourneyCard                         │ 100px
├─────────────────────────────────────┤
│ TabsNav (sticky)                    │ 52px
├─────────────────────────────────────┤
│ Tab Content...                      │ Variable
└─────────────────────────────────────┘
  ← 20px horizontal padding →
```

### Horizontal Spacing
- Page padding: 20px (px-5)
- Card padding: 16px (p-4)
- Icon-to-text gap: 12px (gap-3)
- Grid gap: 12px (gap-3)
- Tab gap: 8px (gap-2)

### Vertical Spacing
- Page sections: 16px (space-y-4)
- Card items: 12px (space-y-3)
- Text lines: 4px (mb-1)
- Tight groups: 8px (space-y-2)

---

## 🎨 Color Swatches

### Primary Gradients
```css
/* Header Background */
linear-gradient(135deg, 
  rgba(209, 250, 229, 0.8) 0%,   /* emerald-50/80 */
  rgba(204, 251, 241, 0.8) 50%,  /* teal-50/80 */
  rgba(207, 250, 254, 0.8) 100%  /* cyan-50/80 */
)

/* Active Tab */
linear-gradient(90deg,
  #10B981 0%,  /* emerald-500 */
  #14B8A6 100% /* teal-600 */
)

/* Stats Cards Hover */
linear-gradient(135deg,
  #FBBF24 0%,  /* amber-400 (Reservations) */
  #F59E0B 100% /* amber-500 */
)
```

### Icon Backgrounds
```css
--icon-email: #DBEAFE;      /* blue-50 */
--icon-phone: #F3E8FF;      /* purple-50 */
--icon-calendar: #FEF3C7;   /* amber-50 */
--icon-status: #D1FAE5;     /* emerald-50 */
--icon-reservations: #FEF3C7; /* amber-50 */
--icon-money: #D1FAE5;      /* emerald-50 */
--icon-streak: #FFEDD5;     /* orange-50 */
--icon-referrals: #F3E8FF;  /* purple-50 */
```

### Text Colors
```css
--text-hero: #111827;       /* gray-900 - Headers */
--text-body: #4B5563;       /* gray-600 - Body */
--text-label: #6B7280;      /* gray-500 - Labels */
--text-success: #059669;    /* emerald-700 - Status */
--text-link: #10B981;       /* emerald-600 - Links */
```

---

## 📱 Responsive Breakpoints

### Mobile (320px - 639px)
```
┌──────────────┐
│ Single column│
│ Full width   │
│ Stats: 2×2   │
│ Tabs: scroll │
└──────────────┘
```

### Tablet (640px - 767px)
```
┌──────────────────────┐
│ Single column        │
│ Max-width: 640px     │
│ Stats: 2×2 (larger)  │
│ Tabs: all visible    │
└──────────────────────┘
```

### Desktop (768px+)
```
┌────────────────────────────┐
│    Centered container      │
│    Max-width: 768px        │
│    Stats: 4×1 (optional)   │
│    Extra spacing           │
└────────────────────────────┘
```

---

## ✨ Animations

### Fade In Up (Stats Grid)
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Staggered: 0ms, 50ms, 100ms, 150ms */
```

### Pulse (Avatar, Icons)
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Duration: 2s infinite */
```

### Scale on Hover
```css
.stat-card {
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.stat-card:hover .icon {
  transform: scale(1.1);
}

.stat-card:hover .value {
  transform: scale(1.05);
}
```

---

## 🎯 Touch Targets (Mobile)

All interactive elements meet **44px minimum**:

- Buttons: 36-40px height
- Tabs: 40px height
- Cards: Full width, 40px+ tap area
- Links: 40px line height
- Icons: 40px container

---

## 📊 Performance Targets

- **First Paint**: < 1.0s
- **Fully Interactive**: < 2.0s
- **Animations**: 60fps
- **Lighthouse Score**: 90+
- **Bundle Size**: < 50KB (components only)

---

**This is the complete visual specification for the warm, mobile-first User Profile redesign! 🎉**
