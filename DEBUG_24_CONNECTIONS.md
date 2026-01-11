# 🔍 Debug: 24 Connections with Only 3 Hidden Tabs

**User Report:** 3 hidden tabs (2 admin, 1 partner) = 24 connections  
**Expected:** 0-3 connections  
**Actual:** 24 connections  
**Problem:** Connection leak or other active users

---

## Expected Behavior

### With Visibility-Aware Subscriptions:
- **Visible tab:** Creates connections
- **Hidden tab:** Unsubscribes after ~100ms
- **3 hidden tabs:** Should = 0-3 connections max

### Connection Breakdown:
1. **Admin Dashboard:** No subscriptions (manual refresh only)
2. **Partner Dashboard:** No subscriptions (React Query polling)
3. **Customer tabs:** Would have MyPicks subscription (if open)

---

## Possible Causes

### 1. ✅ Other Users Connected
- **Most likely:** 24 connections = 12-20 other users
- **Check:** Supabase dashboard shows ALL connections, not just yours
- **Verify:** Close all your tabs, check if connections drop to 20+

### 2. ⚠️ Connection Leak in MyPicks
- **Issue:** `unsubscribe()` not being called properly
- **Location:** [src/pages/MyPicks.tsx](src/pages/MyPicks.tsx#L60-L106)
- **Check:** Console logs "⏸️ Unsubscribing" when tab hidden?

### 3. ⚠️ Connection Leak in Telegram Status
- **Issue:** `unsubscribe()` not being called properly
- **Location:** [src/hooks/useTelegramStatus.ts](src/hooks/useTelegramStatus.ts#L84-L133)
- **Check:** Console logs showing unsubscribe events?

### 4. ⚠️ Multiple Devices
- **Issue:** Your phone, laptop, desktop all connected
- **Check:** Count your devices

---

## Diagnostic Steps

### Step 1: Verify It's Not Just You
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) as total_connections 
FROM pg_stat_activity 
WHERE state = 'active' 
  AND application_name LIKE '%supabase%';
```

**Expected:**
- If 24 connections drop to 0-3 when you close your tabs = others are connected ✅
- If 24 connections stay at 24 = connection leak ⚠️

### Step 2: Check Browser Console (Your Tabs)
```
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Hide the tab (switch to another tab)
4. Check for: "⏸️ Unsubscribing" log message
5. Wait 5 seconds
6. Go to Network > WS (WebSocket) tab
7. Should see: Red disconnected sockets
```

**Expected:**
- See "⏸️ Unsubscribing" in console
- WebSocket shows disconnected
- If NOT = visibility event not firing ⚠️

### Step 3: Test Visibility API
```javascript
// Paste in browser console (on your SmartPick tab)
console.log('Document hidden?', document.hidden);
document.addEventListener('visibilitychange', () => {
  console.log('🔔 Visibility changed! Hidden:', document.hidden);
});
// Now switch tabs and come back
```

**Expected:**
- Switching tabs shows: "🔔 Visibility changed! Hidden: true"
- Coming back shows: "🔔 Visibility changed! Hidden: false"
- If NOT firing = browser issue ⚠️

### Step 4: Close All Your Tabs
```
1. Note current connections: 24
2. Close ALL SmartPick tabs (all 3)
3. Wait 10 seconds
4. Refresh Supabase dashboard
5. Check new connection count
```

**Expected:**
- If drops to 18-21 = others are connected ✅ (you were only 3-6 connections)
- If drops to 0 = all connections were yours ⚠️ (connection leak)
- If stays at 24 = stale dashboard data (refresh page)

---

## Most Likely Scenario

**24 connections = Other users are active**

- 5:06 AM = breakfast booking time in Georgia (Tbilisi)
- Your 3 hidden tabs = 0-3 connections
- Other 21-24 connections = 10-15 real users browsing MyPicks

**Proof:**
- Admin dashboard doesn't subscribe to anything
- Partner dashboard doesn't subscribe to anything
- Only MyPicks + Telegram status could create connections
- Your tabs are hidden = should unsubscribe

---

## How to Confirm

### Run This Terminal Command:
```powershell
# Check realtime connections right now
$url = "https://ggzhtpaxnhwcilomswtm.supabase.co/rest/v1/rpc/get_connection_stats"
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    "Authorization" = "Bearer ..."
}
Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body "{}"
```

**Expected Response:**
```json
{
  "total_connections": 24,
  "by_table": {
    "reservations": 18,
    "notification_preferences": 6
  }
}
```

**Analysis:**
- `reservations: 18` = 18 users on MyPicks page
- `notification_preferences: 6` = 6 users with Telegram connected
- Your 3 tabs (hidden) should = 0 connections

---

## Action Items

### If Other Users Are Connected (Most Likely) ✅
- **Nothing to fix!**
- Your capacity is healthy: 24/200 = 12%
- Morning traffic is normal
- Your optimizations are working

### If Connection Leak Detected ⚠️
1. Check browser console for unsubscribe logs
2. Test visibility API in console
3. Review [MyPicks.tsx](src/pages/MyPicks.tsx#L60-L106) cleanup logic
4. Review [useTelegramStatus.ts](src/hooks/useTelegramStatus.ts#L84-L133) cleanup

### If Browser Issue ⚠️
- Some browsers don't fire `visibilitychange` reliably
- Test in Chrome (most reliable)
- Consider adding heartbeat disconnect (5-minute timeout)

---

## Key Question

**Close all 3 of your tabs right now. Do the connections drop to 18-21?**

- **YES** = Other users connected, everything working ✅
- **NO** = Connection leak, needs investigation ⚠️
