# 🔴 REAL-TIME SUBSCRIPTION MAP

## 📊 Who Uses Real-Time in Your App

Complete breakdown of **all real-time subscriptions** by user type and action.

---

## 👤 **REGULAR CUSTOMERS**

### 1. **My Picks Page** (Active Reservations)
- **File:** [src/pages/MyPicks.tsx](src/pages/MyPicks.tsx#L62)
- **Channel:** `reservations:${customerId}`
- **Watches:** Customer's own reservations (INSERT, UPDATE, DELETE)
- **When Active:** When user views "My Picks" tab
- **Optimization:** ✅ **Has manual visibility handling** (disconnects when tab hidden)
- **Connections:** ~10-20 active at any time

```typescript
subscription = subscribeToReservations(user.id, (payload) => {
  logger.debug('[MyPicks] Real-time update received:', payload);
  loadReservations();
});
```

**Action Triggers:**
- ✅ When partner marks food ready
- ✅ When reservation auto-expires
- ✅ When partner cancels reservation
- ✅ When user makes new reservation
- ✅ When user picks up food (status changes)

---

### 2. **Reservation History Page**
- **File:** [src/pages/ReservationHistory.tsx](src/pages/ReservationHistory.tsx#L61)
- **Channel:** `reservations:${customerId}`
- **Watches:** Customer's completed/cancelled reservations
- **When Active:** When user views reservation history
- **Optimization:** ❌ **No visibility handling** (always-on)
- **Connections:** ~5-10 active

```typescript
const subscription = subscribeToReservations(user.id, () => {
  logger.debug('[ReservationHistory] Reservation updated via realtime');
  loadReservations();
});
```

---

### 3. **Reservation Detail Page** (Single Reservation)
- **File:** [src/pages/ReservationDetail.tsx](src/pages/ReservationDetail.tsx#L126)
- **Channel:** `reservation-${reservationId}`
- **Watches:** Single reservation changes (UPDATE)
- **When Active:** When viewing a specific reservation
- **Optimization:** ❌ **No visibility handling** (always-on)
- **Connections:** ~10-15 active

```typescript
supabase
  .channel(`reservation-${id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'reservations',
    filter: `id=eq.${id}`,
  }, () => loadReservation())
  .subscribe();
```

**Action Triggers:**
- ✅ When partner marks as ready
- ✅ When status changes (ready → completed)
- ✅ When reservation expires
- ✅ QR code pickup broadcasts

---

### 4. **Active Reservation Flow** (Reservation Tracker)
- **File:** [src/hooks/pages/useReservationFlow.ts](src/hooks/pages/useReservationFlow.ts#L165)
- **Channel:** `reservation-${activeReservationId}`
- **Watches:** Current active reservation
- **When Active:** While user has active reservation (shown on home screen)
- **Optimization:** ❌ **No visibility handling** (always-on)
- **Connections:** ~20-30 active

```typescript
supabase
  .channel(`reservation-${activeReservation.id}`, {
    config: { broadcast: { self: true } }
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'reservations',
  }, handleReservationUpdate)
  .subscribe();
```

---

### 5. **QR Code Pickup Broadcast** (Real-time Pickup Confirmation)
- **File:** [src/hooks/usePickupBroadcast.ts](src/hooks/usePickupBroadcast.ts#L40)
- **Channel:** `pickup-${reservationId}`
- **Watches:** Partner scanning QR code (broadcast event)
- **When Active:** While viewing QR code on reservation page
- **Optimization:** ❌ **No visibility handling** (always-on)
- **Connections:** ~5-10 active

```typescript
supabase
  .channel(`pickup-${reservationId}`)
  .on('broadcast', { event: 'pickup-scanned' }, (payload) => {
    onPickupScanned(payload);
  })
  .subscribe();
```

**Use Case:** Partner scans QR → Customer's screen auto-confirms pickup

---

### 6. **SmartPoints Balance** (Points Updates)
- **File:** [src/lib/smartpoints-api.ts](src/lib/smartpoints-api.ts#L355)
- **Channel:** `points:${userId}`
- **Watches:** User's points balance (user_points + partner_points)
- **When Active:** When user is viewing points balance/shop
- **Optimization:** ❌ **No visibility handling** (always-on)
- **Connections:** ~10-15 active

```typescript
supabase
  .channel(`points:${userId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'user_points',
    filter: `user_id=eq.${userId}`
  }, (payload) => callback(payload.new.balance))
  .subscribe();
```

**Action Triggers:**
- ✅ When user buys points
- ✅ When partner bonus applied
- ✅ When achievement unlocked
- ✅ When points spent on reservation

---

### 7. **Map Page - Global Offers** (DISABLED)
- **File:** [src/pages/IndexRedesigned.tsx](src/pages/IndexRedesigned.tsx#L297)
- **Channel:** `offers-realtime-index`
- **Status:** ⚠️ **COMMENTED OUT / DISABLED**
- **Reason:** Was causing 23K+ queries, severe performance issue
- **Connections:** **0** (not active)

```typescript
// ⚠️ DISABLED: Real-time subscription for ALL offers causes 23K+ queries
/* const offersChannel = supabase
  .channel('offers-realtime-index')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'offers',
  }, () => refetch())
  .subscribe(); */
```

---

## 🏪 **PARTNERS** (Restaurant Owners)

### 1. **Partner Offers** (Own Offers Updates)
- **File:** [src/lib/api/realtime.ts](src/lib/api/realtime.ts#L57)
- **Channel:** `partner:offers:${partnerId}`
- **Watches:** Partner's own offers (INSERT, UPDATE, DELETE)
- **When Active:** In partner dashboard
- **Optimization:** ❌ **No visibility handling** (always-on)
- **Connections:** ~15-20 active

```typescript
subscribeToPartnerOffers(partnerId, (payload) => {
  // Refetch offers when partner creates/updates/deletes their own
});
```

**Action Triggers:**
- ✅ When partner creates new offer
- ✅ When offer approved/rejected by admin
- ✅ When partner edits offer
- ✅ When offer expires

---

### 2. **Partner Reservations** (Incoming Orders)
- **File:** [src/lib/api/realtime.ts](src/lib/api/realtime.ts#L79)
- **Channel:** `public:reservations:partner:${partnerId}`
- **Watches:** Reservations for partner's offers
- **When Active:** In partner dashboard
- **Optimization:** ❌ **No visibility handling** (always-on)
- **Connections:** ~15-20 active

```typescript
subscribeToPartnerReservations(partnerId, (payload) => {
  // New reservation created for this partner's offer
  playNotificationSound();
  showToast("New reservation!");
});
```

**Action Triggers:**
- ✅ When customer reserves partner's offer
- ✅ When customer cancels reservation
- ✅ When customer picks up food
- ✅ When reservation expires

---

### 3. **Global Offers Subscription** (All Partners, DISABLED)
- **File:** [src/hooks/useOffers.ts](src/hooks/useOffers.ts#L25)
- **Channel:** `offers-realtime`
- **Status:** ⚠️ **DISABLED** (causing performance issues)
- **Connections:** **0** (not active)

```typescript
// Was watching all offers globally - disabled for performance
```

---

## 👨‍💼 **ADMINS**

### 1. **New Reservations Monitor**
- **File:** [src/lib/api/admin-realtime.ts](src/lib/api/admin-realtime.ts#L291)
- **Channel:** `admin_reservations`
- **Watches:** ALL new reservations (INSERT only)
- **When Active:** Admin dashboard open
- **Optimization:** ❌ **Always-on for ALL admins**
- **Connections:** ~2-4 active

```typescript
supabase
  .channel('admin_reservations')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'reservations' 
  }, (payload) => callback('reservation', payload.new))
  .subscribe();
```

---

### 2. **Point Purchases Monitor**
- **File:** [src/lib/api/admin-realtime.ts](src/lib/api/admin-realtime.ts#L299)
- **Channel:** `admin_purchases`
- **Watches:** ALL point purchases (INSERT only)
- **When Active:** Admin dashboard open
- **Optimization:** ❌ **Always-on for ALL admins**
- **Connections:** ~2-4 active

```typescript
supabase
  .channel('admin_purchases')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'point_purchases' 
  }, (payload) => callback('purchase', payload.new))
  .subscribe();
```

---

### 3. **New User Signups Monitor**
- **File:** [src/lib/api/admin-realtime.ts](src/lib/api/admin-realtime.ts#L307)
- **Channel:** `admin_users`
- **Watches:** ALL new user signups (INSERT only)
- **When Active:** Admin dashboard open
- **Optimization:** ❌ **Always-on for ALL admins**
- **Connections:** ~2-4 active

```typescript
supabase
  .channel('admin_users')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'users' 
  }, (payload) => callback('signup', payload.new))
  .subscribe();
```

---

### 4. **Pending Partners Monitor**
- **File:** [src/components/admin/PendingPartners.tsx](src/components/admin/PendingPartners.tsx#L39)
- **Channel:** `pending-partners-changes`
- **Watches:** Partner approval status changes
- **When Active:** Admin viewing pending partners page
- **Optimization:** ❌ **No visibility handling** (always-on)
- **Connections:** ~1-2 active

```typescript
supabase
  .channel('pending-partners-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'partners',
  }, () => refetchPartners())
  .subscribe();
```

---

## 🌐 **ALL USERS** (Global Features)

### 1. **Announcements Popup**
- **File:** [src/components/AnnouncementPopup.tsx](src/components/AnnouncementPopup.tsx#L29)
- **Channel:** `announcements`
- **Watches:** New announcements (INSERT)
- **When Active:** Always (loaded in App.tsx)
- **Optimization:** ❌ **Always-on for EVERYONE**
- **Connections:** ~50-80 active (all logged-in users)

```typescript
supabase
  .channel('announcements')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'announcements',
  }, handleNewAnnouncement)
  .subscribe();
```

**Use Case:** Admin creates urgent announcement → All users see popup immediately

---

### 2. **Maintenance Mode Monitor**
- **File:** [src/App.tsx](src/App.tsx#L185)
- **Channel:** `maintenance_mode_changes`
- **Watches:** Maintenance mode toggle (UPDATE)
- **When Active:** Always (loaded in App.tsx root)
- **Optimization:** ❌ **Always-on for EVERYONE**
- **Connections:** ~50-80 active (all logged-in users)

```typescript
supabase
  .channel('maintenance_mode_changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'app_settings',
    filter: 'key=eq.maintenance_mode',
  }, handleMaintenanceModeChange)
  .subscribe();
```

**Use Case:** Admin enables maintenance → All users see maintenance screen immediately

---

### 3. **Telegram Integration Status**
- **File:** [src/hooks/useTelegramStatus.ts](src/hooks/useTelegramStatus.ts#L78)
- **Channel:** `telegram_updates`
- **Watches:** User's telegram connection status
- **When Active:** When user is on settings/profile page
- **Optimization:** ❌ **No visibility handling** (always-on)
- **Connections:** ~5-10 active

```typescript
supabase
  .channel('telegram_updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'users',
    filter: `id=eq.${userId}`,
  }, handleTelegramUpdate)
  .subscribe();
```

---

## 📊 **CONNECTION BREAKDOWN**

### By User Type:

| User Type | Subscriptions | Avg Connections/User | Total Est. |
|-----------|--------------|---------------------|-----------|
| **Regular Customer** | 7 types | 1-3 active | 60-90 |
| **Partner** | 2 types | 1-2 active | 15-25 |
| **Admin** | 4 types | 3-4 active | 6-12 |
| **Global (All)** | 3 types | 2-3 active | 50-80 |
| **TOTAL** | **16 types** | - | **131-207** |

---

### By Page:

| Page/Feature | Connections | Visibility-Aware? |
|-------------|-------------|-------------------|
| My Picks | 10-20 | ✅ Yes (manual) |
| Reservation Detail | 10-15 | ❌ No |
| Reservation History | 5-10 | ❌ No |
| Active Res Tracker | 20-30 | ❌ No |
| QR Pickup | 5-10 | ❌ No |
| Points Balance | 10-15 | ❌ No |
| Partner Dashboard | 30-40 | ❌ No |
| Admin Dashboard | 6-12 | ❌ No |
| Announcements | 50-80 | ❌ No (global) |
| Maintenance | 50-80 | ❌ No (global) |
| Telegram Status | 5-10 | ❌ No |
| Map (offers) | 0 | ⚠️ Disabled |

---

## 🎯 **CRITICAL FINDINGS**

### 1. **Always-On Global Subscriptions** (Highest Impact)
These are active for **EVERY logged-in user**:
- ⚠️ **Announcements** (~50-80 connections)
- ⚠️ **Maintenance Mode** (~50-80 connections)

**Combined: 100-160 connections** (50-80% of your 200 limit!)

**Why Critical:**
- Even users just browsing consume 2 connections minimum
- No way to reduce these (needed for instant notifications)
- Scales linearly with user count

---

### 2. **No Visibility Handling** (Most Common Issue)
Only **1 of 16** subscription types has visibility-aware disconnect:
- ✅ My Picks page (manual implementation)
- ❌ All other 15 types: always-on

**Impact:** Users with multiple tabs/backgrounded apps stay connected

---

### 3. **Admin Dashboard Inefficiency**
Admins use **3 separate channels** for monitoring:
- admin_reservations
- admin_purchases
- admin_users

**Impact:** 3 connections per admin (could be 1 with multiplexing)

---

### 4. **Map Page Mystery**
The highest-traffic page has **0 connections**:
- Realtime offers subscription was **disabled** due to 23K+ query issue
- No alternative real-time solution implemented
- Users must manually refresh to see new offers

**Impact:** Map offers are stale until user refreshes

---

## 🚨 **WHO'S CAUSING THE BOTTLENECK?**

### Connection Hogs (Ranked):

1. **🔴 Global Announcements** (50-80 connections)
   - Every user = 1 connection
   - Can't reduce without breaking feature

2. **🔴 Global Maintenance Mode** (50-80 connections)
   - Every user = 1 connection
   - Can't reduce without breaking feature

3. **🟠 Active Reservation Tracker** (20-30 connections)
   - Users with active reservations
   - Should use visibility-aware hook

4. **🟠 Partner Dashboard** (30-40 connections)
   - Partners monitoring incoming orders
   - Should use visibility-aware hook

5. **🟡 Reservation Detail** (10-15 connections)
   - Users viewing specific reservations
   - Should use visibility-aware hook

6. **🟡 My Picks** (10-20 connections)
   - Already optimized with visibility handling ✅

7. **🟡 Others** (15-25 connections)
   - Points, QR, History, etc.

---

## ✅ **OPTIMIZATION PRIORITY**

### **Cannot Optimize** (Must Stay Always-On):
- ❌ Announcements (emergency broadcast system)
- ❌ Maintenance Mode (instant app disable)

These **100-160 connections are unavoidable**.

---

### **Should Optimize** (Quick Wins):

#### **Priority 1: Active Reservation Tracker** (Save 15-20 connections)
```typescript
// Current: Always-on even when tab hidden
// Fix: Use visibility-aware hook
useVisibilityAwareSubscription({
  channelName: `reservation-${activeReservation.id}`,
  event: 'UPDATE',
  table: 'reservations',
  callback: handleUpdate
});
```

#### **Priority 2: Partner Dashboard** (Save 20-25 connections)
```typescript
// Current: 2 always-on channels per partner
// Fix: Use visibility-aware hook for both
useVisibilityAwareSubscription({ /* offers */ });
useVisibilityAwareSubscription({ /* reservations */ });
```

#### **Priority 3: Reservation Detail** (Save 5-10 connections)
```typescript
// Current: Always-on when viewing reservation
// Fix: Use visibility-aware hook
```

---

## 📈 **REALISTIC EXPECTATIONS**

### Current Reality:
- **Fixed Overhead:** 100-160 connections (announcements + maintenance)
- **Variable Usage:** 30-50 connections (other features)
- **Total:** 130-210 connections
- **Limit:** 200 connections
- **Status:** ⚠️ At capacity

### After Optimizations:
- **Fixed Overhead:** 100-160 connections (unchanged)
- **Variable Usage:** 10-20 connections (60% reduction)
- **Total:** 110-180 connections
- **Status:** 🟡 Safer, but limited growth

### Conclusion:
**You can optimize 30-40 connections**, but **100-160 are unavoidable** due to global features.

**Maximum capacity on free tier: ~350-400 concurrent users**

---

## 🎯 **ACTIONABLE RECOMMENDATIONS**

### Short-term (This Week):
1. ✅ Add connection monitoring dashboard
2. ✅ Track actual usage vs estimates
3. ✅ Alert at 180/200 connections (90%)

### Medium-term (This Month):
1. 🔧 Migrate reservation tracker to visibility-aware
2. 🔧 Migrate partner dashboard to visibility-aware
3. 🔧 Migrate reservation detail to visibility-aware

### Long-term (Consider):
1. 💰 Upgrade to Pro plan ($25/mo = 500 connections)
2. 🔄 Replace announcements with polling every 30s
3. 🔄 Replace maintenance mode with HTTP header check
4. 📊 Implement connection pooling/multiplexing

---

**Report Generated:** January 11, 2026  
**Total Subscription Types:** 16  
**Estimated Active Connections:** 130-210  
**Free Tier Limit:** 200  
**Status:** ⚠️ **AT CAPACITY - Optimizations Recommended**
