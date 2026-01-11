# 📊 Real Connection Measurement - Manual Test Results

## Test Setup
**Date:** January 8, 2026
**Time:** [Record time when testing]
**Tester:** [Your name]

---

## 🔍 Measurement Method

### Option 1: Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm
2. Navigate to: **Database** > **Logs** > **Realtime**
3. Or: **Observability** > **Realtime**
4. Look for: **Active Connections** metric

### Option 2: SQL Query (Most Accurate)
1. Go to: **SQL Editor** in Supabase Dashboard
2. Copy-paste query from `measure-connections.sql`
3. Run the query
4. Record: **Total active connections**

### Option 3: Browser DevTools (Client-Side)
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run: `__RT_TEST__.countConnections()` (from console-test-helper.js)
4. This counts YOUR client's connections only

---

## 📝 Test Scenario 1: Baseline (Before Opening Tabs)

### Setup:
- Close ALL tabs except one
- Go to Admin Dashboard
- Start Connection Monitor

### Record:
```
Time: _______
Total Connections (Dashboard): _______
MyPicks: _______
Telegram: _______
Presence: _______
Other: _______
```

**Expected:** 1-5 connections (admin presence tracking only)

---

## 📝 Test Scenario 2: Open MyPicks Tab (Visible)

### Setup:
1. Keep Admin Dashboard visible
2. Open **1 MyPicks tab** in a new window (visible)
3. Wait 5 seconds

### Record:
```
Time: _______
Total Connections: _______
MyPicks: _______
Change from baseline: +_______
```

**Expected:** Baseline + 1 connection

---

## 📝 Test Scenario 3: Hide MyPicks Tab

### Setup:
1. **Minimize or switch away** from MyPicks tab
2. Keep Admin Dashboard visible
3. Wait 5 seconds

### Record:
```
Time: _______
Total Connections: _______
MyPicks: _______
Change from Scenario 2: _______
```

**Expected:** Back to baseline (MyPicks disconnected)

---

## 📝 Test Scenario 4: Multiple Tabs (All Hidden)

### Setup:
1. Open 5 MyPicks tabs
2. **Hide all of them** (minimize or switch away)
3. Keep only Admin Dashboard visible
4. Wait 10 seconds

### Record:
```
Time: _______
Total Connections: _______
MyPicks: _______
Tabs open: 5
Tabs visible: 0
```

**Expected:** Still at baseline (all hidden = all disconnected)

---

## 📝 Test Scenario 5: Multiple Tabs (2 Visible)

### Setup:
1. Keep 5 MyPicks tabs open
2. Make **2 of them visible** (side-by-side windows)
3. Hide the other 3
4. Wait 5 seconds

### Record:
```
Time: _______
Total Connections: _______
MyPicks: _______
Tabs open: 5
Tabs visible: 2
Hidden tabs: 3
```

**Expected:** Baseline + 2 connections (only visible tabs)

---

## 📝 Test Scenario 6: Telegram Settings

### Setup:
1. Close all MyPicks tabs
2. Open Profile page (with Telegram connected)
3. Keep Profile **visible**

### Record:
```
Time: _______
Total Connections: _______
Telegram: _______
```

**Expected:** Baseline + 1 connection

---

## 📝 Test Scenario 7: Hide Telegram Settings

### Setup:
1. **Hide Profile page** (minimize or switch away)
2. Wait 5 seconds

### Record:
```
Time: _______
Total Connections: _______
Telegram: _______
```

**Expected:** Back to baseline (Telegram disconnected)

---

## 📊 Comparison: Before vs After Optimization

### BEFORE Optimization (Old Behavior):
| Scenario | Connections |
|----------|-------------|
| 1 MyPicks tab (hidden) | 1 (always connected) |
| 5 MyPicks tabs (all hidden) | 5 (all always connected) |
| 10 tabs (all hidden) | 10 (all always connected) |
| Typical user (5 tabs) | 5-10 persistent connections |

### AFTER Optimization (New Behavior):
| Scenario | Connections | Improvement |
|----------|-------------|-------------|
| 1 MyPicks tab (hidden) | 0 | ✅ -1 (-100%) |
| 5 MyPicks tabs (all hidden) | 0 | ✅ -5 (-100%) |
| 10 tabs (all hidden) | 0 | ✅ -10 (-100%) |
| Typical user (5 tabs, 1 visible) | 1-2 | ✅ -4 to -8 (-80%) |

---

## 📈 Real-World Usage Projection

### Scenario: 100 Active Users

**BEFORE Optimization:**
- Average 3 tabs per user
- All tabs always connected
- **Total:** 100 users × 3 tabs = **300 connections**
- **Status:** ❌ EXCEEDS free tier (200 limit)

**AFTER Optimization:**
- Average 3 tabs per user
- Only 1 visible at a time
- **Total:** 100 users × 1 visible tab = **100 connections**
- **Status:** ✅ Under free tier limit
- **Savings:** 200 connections (67% reduction!)

---

## 🎯 Success Metrics

### ✅ Optimization is successful if:
- [ ] Hidden tabs show **0 connections** for that component
- [ ] Visible tabs show **+1 connection** per tab
- [ ] Switching away **immediately disconnects** (2-5 seconds)
- [ ] Switching back **reconnects instantly** (< 1 second)
- [ ] Total connections = **only visible tabs + baseline**
- [ ] **40-60% reduction** in typical usage

### ❌ Fail conditions:
- [ ] Hidden tabs still maintain connections
- [ ] Reconnection takes > 5 seconds
- [ ] Console shows errors
- [ ] Data doesn't update when tab becomes visible

---

## 📸 Screenshot Checklist

Take screenshots of:
- [ ] Admin Dashboard monitor showing low baseline
- [ ] Monitor showing increase when MyPicks visible
- [ ] Monitor showing decrease when MyPicks hidden
- [ ] Browser console showing subscription logs
- [ ] Supabase Dashboard realtime connections (if available)

---

## 📝 Final Results

### Summary:
```
Baseline connections: _______
Peak connections (5 visible tabs): _______
Savings when tabs hidden: _______
Percentage reduction: _______%
```

### Observations:
```
What worked well:
- 

What didn't work:
- 

Any errors/issues:
- 

User experience rating (1-10): _____
```

### Conclusion:
```
[ ] ✅ Optimization successful - achieving 40-60% reduction
[ ] ⚠️ Partial success - some reduction but not optimal
[ ] ❌ Failed - no reduction or errors encountered
```

---

## 🚀 Next Steps

If successful:
- [ ] Monitor in production for 1 week
- [ ] Check Supabase usage dashboard daily
- [ ] Document any issues

If issues found:
- [ ] Report specific error messages
- [ ] Note which browsers/devices affected
- [ ] Consider rollback or adjustments

---

**Tested by:** _______________
**Date:** _______________
**Sign-off:** _______________
