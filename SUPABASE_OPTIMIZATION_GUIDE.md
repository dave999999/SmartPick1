# SUPABASE RESOURCE OPTIMIZATION GUIDE

## Current Optimizations Implemented

### 1. Admin Dashboard Polling Strategy
**Before:** 60-second intervals, always active
**After:** 120-second intervals (2 minutes), paused when tab hidden
**Savings:** 50% reduction in polling + automatic pause = ~75% resource reduction

```typescript
// LiveMonitoring.tsx
- Poll interval: 120 seconds (was 60s)
- Automatic pause when tab hidden
- Automatic pause when different tab is active
- Immediate refresh when tab becomes visible
```

### 2. Efficient Database Queries

#### Head-Only Queries (Counts)
```typescript
// Uses COUNT(*) only, no data transfer
supabase.from('users').select('*', { count: 'exact', head: true })
```
**Benefit:** 
- No row data transferred (0 bytes vs potentially MBs)
- Only returns count integer
- Much faster execution

#### Filtered Queries at Database Level
```typescript
// Bad (transfers all data, filters client-side)
const { data } = await supabase.from('offers').select('*');
const active = data.filter(o => o.status === 'ACTIVE' && o.expires_at > now);

// Good (filters at database, minimal transfer)
const { count } = await supabase.from('offers')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'ACTIVE')
  .gt('expires_at', now);
```

#### Single-Column Queries
```typescript
// Only fetch what you need (smart_price column, not entire reservation)
supabase.from('reservations').select('smart_price')
  .gte('created_at', today)
  .eq('status', 'COMPLETED')
```

### 3. RPC Functions for Aggregations

#### Before (N queries):
```typescript
// 4 separate queries to get online counts
const webUsers = await supabase.from('user_presence').select('*').eq('platform', 'WEB');
const iosUsers = await supabase.from('user_presence').select('*').eq('platform', 'IOS');
// ... etc
```

#### After (1 RPC):
```typescript
// Single optimized query with database-level aggregation
const { data } = await supabase.rpc('get_online_stats');
// Returns: { total_online, web_online, ios_online, android_online }
```

**Savings:** 4x fewer queries, no data transfer, instant results

### 4. Presence Tracking System

#### Heartbeat Strategy
- **Interval:** 60 seconds (not 5 seconds!)
- **Auto-pause:** When tab hidden
- **Upsert:** Single efficient UPSERT operation
- **Auto-cleanup:** Stale records removed every 10 minutes

```sql
-- Efficient upsert operation
INSERT INTO user_presence (user_id, platform, last_seen, ...)
VALUES (...)
ON CONFLICT (user_id) DO UPDATE SET ...
```

#### Resource Usage
- **Per active user:** 1 query every 60 seconds = 60 queries/hour
- **100 users:** 6,000 queries/hour (well within Supabase limits)
- **With auto-pause:** Actual usage ~30-40% less due to tab hiding

### 5. Automatic Cleanup Functions

```sql
-- Runs via cron every 10 minutes
cleanup_stale_presence() -- Removes presence older than 10min
cleanup_old_audit_logs() -- Removes audit logs older than 90 days
```

**Benefit:** Keeps database small, maintains query performance

## Resource Usage Estimates

### Admin Dashboard (Single Admin)
- **Base:** 1 initial load = 6 queries
- **Polling:** Every 2 minutes = 30 polls/hour = 180 queries/hour
- **With tab hidden:** ~60 queries/hour (67% reduction)

### User Presence (100 Active Users)
- **Heartbeats:** 60 queries/hour per user = 6,000 queries/hour total
- **With pausing:** ~2,400-3,600 queries/hour (60% active tab rate)

### Total Estimated Usage (100 users, 3 admins)
- **Queries/hour:** ~2,500-4,000
- **Queries/day:** ~60,000-96,000
- **Monthly:** ~1.8M-2.9M queries

**Supabase Free Tier:** 500,000 requests/month (upgrade needed for scale)
**Supabase Pro Tier:** 5,000,000 requests/month (comfortable)

## Best Practices Implemented

### ✅ Use Head Queries for Counts
```typescript
// Don't fetch data you won't use
{ count: 'exact', head: true }
```

### ✅ Filter at Database Level
```typescript
// Push filters to PostgreSQL
.eq('status', 'ACTIVE')
.gt('expires_at', now)
```

### ✅ Use RPC for Complex Aggregations
```sql
-- Single optimized query beats multiple round-trips
CREATE FUNCTION get_stats() RETURNS TABLE (...)
```

### ✅ Batch Related Queries
```typescript
// Use Promise.all() for parallel queries
await Promise.all([query1, query2, query3])
```

### ✅ Implement Visibility-Based Pausing
```typescript
// Don't poll when user isn't looking
if (document.hidden || !isActive) return;
```

### ✅ Use Longer Polling Intervals
```typescript
// 2-5 minutes for dashboards (not 5 seconds!)
const interval = 120000; // 2 minutes
```

### ✅ Auto-Cleanup Stale Data
```sql
-- Keep database lean via scheduled jobs
DELETE FROM table WHERE created_at < NOW() - INTERVAL '90 days'
```

## Monitoring Usage

### Supabase Dashboard
1. Go to **Settings** → **Usage**
2. Check:
   - Database Queries
   - Bandwidth
   - Storage
   - Realtime Connections

### Set Up Alerts
1. **Settings** → **Billing** → **Usage Alerts**
2. Set thresholds:
   - 70% of query limit
   - 80% of bandwidth limit
   - 90% of storage limit

## Scaling Strategies

### When Usage Gets High

#### 1. Increase Polling Intervals
```typescript
// Dashboard: 2 min → 5 min
const interval = 300000;

// Presence: 60s → 120s
const HEARTBEAT_INTERVAL = 120000;
```

#### 2. Use Serverless Functions
Move aggregations to Edge Functions:
```typescript
// Client calls edge function (1 request)
// Edge function does N internal queries (doesn't count toward limit)
fetch('https://your-project.supabase.co/functions/v1/get-stats')
```

#### 3. Implement Caching
```typescript
// Cache results for 30 seconds
const cache = new Map();
if (cache.has('stats') && Date.now() - cache.get('stats').time < 30000) {
  return cache.get('stats').data;
}
```

#### 4. Use Database Views
```sql
-- Pre-computed views for complex queries
CREATE MATERIALIZED VIEW daily_stats AS ...
REFRESH MATERIALIZED VIEW daily_stats; -- Via cron
```

## Cost Comparison

### Naive Implementation (No Optimizations)
- Admin polls every 10s: 360 queries/hour
- Presence every 5s: 72,000 queries/hour (100 users)
- No pausing: Always active
- **Total:** ~75,000 queries/hour = 1.8M/day = 54M/month 💰💰💰

### Optimized Implementation (Current)
- Admin polls every 2 min with pausing: 30-60 queries/hour
- Presence every 60s with pausing: 2,400-3,600 queries/hour
- **Total:** ~3,000 queries/hour = 72K/day = 2.1M/month ✅

**Savings:** 96% reduction in query volume!

## Deployment Checklist

- [x] Create presence tracking table (`CREATE_REALTIME_PRESENCE_TRACKING.sql`)
- [x] Implement efficient admin polling (LiveMonitoring.tsx)
- [x] Create presence heartbeat hook (usePresenceTracking.ts)
- [ ] Deploy SQL to Supabase
- [ ] Add presence hook to App.tsx
- [ ] Set up cron job for cleanup_stale_presence() (every 10 min)
- [ ] Set up cron job for cleanup_old_audit_logs() (daily)
- [ ] Monitor usage for 24 hours
- [ ] Adjust intervals if needed

## Next Steps

1. **Deploy SQL migration**
   ```bash
   # In Supabase SQL Editor
   Run: CREATE_REALTIME_PRESENCE_TRACKING.sql
   ```

2. **Add presence tracking to app**
   ```typescript
   // src/App.tsx or main layout
   import { usePresenceTracking } from '@/hooks/usePresenceTracking';
   
   function App() {
     usePresenceTracking(); // ✨ Auto-tracks presence
     return <YourApp />;
   }
   ```

3. **Set up Supabase Cron Jobs**
   - Go to Database → Cron
   - Add job: `cleanup_stale_presence()` every 10 minutes
   - Add job: `cleanup_old_audit_logs(90)` daily at 2 AM

4. **Monitor usage**
   - Check Supabase Usage dashboard daily for 1 week
   - Adjust intervals if approaching limits
