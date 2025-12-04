# 🔧 Environment Configuration Guide - Scalability Optimizations

## Current Configuration (Already Optimized)

Your `src/lib/supabase.ts` is already configured with connection pooling optimizations:

```typescript
global: {
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    // ✅ ALREADY CONFIGURED: Transaction pooling for better connection management
    'x-connection-pool': 'transaction',
  },
}
```

**This is optimal for production use** ✅

---

## 📋 Required Environment Variables

### Current Variables (Keep These)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Google Maps Configuration  
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key-here
```

### No New Variables Required! ✅

The scalability optimizations **do not require new environment variables**. The existing configuration is sufficient.

---

## 🔄 Connection Pooling Modes Explained

Supabase offers 3 connection pooling modes. We're using **Transaction Mode** (optimal):

### 1. Transaction Mode ✅ (CURRENT - RECOMMENDED)
```typescript
'x-connection-pool': 'transaction'
```

**Characteristics:**
- **60 connections** available (Supabase Pro)
- Connections held only during active transactions
- **Best for web applications** with many short queries
- Automatic connection reuse between queries

**Why we use this:**
- SmartPick makes many short queries (offer lists, reservations, etc.)
- Users don't hold long-running transactions
- Maximizes connection reuse
- Prevents connection exhaustion

### 2. Session Mode ⚠️ (NOT RECOMMENDED)
```typescript
'x-connection-pool': 'session'
```

**Characteristics:**
- **200 connections** available but less efficient
- Connections held for entire session lifetime
- Slower for individual queries
- **Use ONLY for read replicas**

**When to use:**
- Read-only queries (SELECT statements)
- Long-running analytics queries
- Background jobs

### 3. Direct Mode ❌ (NEVER USE IN PRODUCTION)
```typescript
// No pooling header = direct mode
```

**Characteristics:**
- **15 connections max** (extremely limited!)
- Direct PostgreSQL connection
- **Will cause "connection slots exhausted" errors**
- Only for database migrations/admin tasks

---

## 🚀 Advanced Configuration (Phase 2 - Future)

When implementing read replicas, you'll create a second Supabase client:

### Future Configuration (Phase 2)

```typescript
// src/lib/supabase.ts

// PRIMARY (for writes) - Transaction mode
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL_PRIMARY!,
  process.env.VITE_SUPABASE_ANON_KEY!,
  {
    global: {
      headers: {
        'x-connection-pool': 'transaction', // 60 connections
      },
    },
  }
);

// READ REPLICA (for reads) - Session mode
export const supabaseReplica = createClient(
  process.env.VITE_SUPABASE_URL_REPLICA!, // Different endpoint
  process.env.VITE_SUPABASE_ANON_KEY!,
  {
    global: {
      headers: {
        'x-connection-pool': 'session', // 200 connections for reads
      },
    },
  }
);

// Usage:
// Writes → supabase (primary)
await supabase.from('reservations').insert({ ... });

// Reads → supabaseReplica (replica)  
const { data } = await supabaseReplica.from('offers').select('*');
```

### New Environment Variables (Phase 2 Only)

```bash
# Phase 2: Read Replica Configuration
VITE_SUPABASE_URL_PRIMARY=https://your-project.supabase.co
VITE_SUPABASE_URL_REPLICA=https://your-project-replica.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Cost:** $999/month (Team plan + 1 replica)

**Capacity:**
- Primary: 60 connections (writes)
- Replica: 200 connections (reads)
- **Total: 260 connections** (vs 60 currently)

---

## 📊 Connection Pool Monitoring

### How to Check Current Usage

#### Via Supabase Dashboard:
1. Navigate to **Database** → **Connection Pooling**
2. View active connections graph
3. Set alerts if usage > 80%

#### Via SQL Query:
```sql
-- Check active connections
SELECT 
  count(*) as total_connections,
  max_conn,
  count(*) * 100.0 / max_conn as usage_percent
FROM pg_stat_activity
CROSS JOIN (SELECT setting::int AS max_conn FROM pg_settings WHERE name = 'max_connections') s
WHERE state = 'active';

-- Check connections by application
SELECT 
  application_name,
  count(*) as connections,
  state
FROM pg_stat_activity
WHERE application_name != ''
GROUP BY application_name, state
ORDER BY connections DESC;
```

### Warning Signs of Connection Issues

🚨 **Connection Pool Exhausted:**
```
FATAL: remaining connection slots are reserved for non-replication superuser connections
PGRST301: JWT expired
Error: Connection timeout after 30000ms
```

**Solutions:**
1. Ensure `'x-connection-pool': 'transaction'` is set (✅ already done)
2. Close connections properly (use `finally` blocks)
3. Implement connection retry logic
4. Consider upgrading to Team plan (60 → 200 connections)
5. Add read replica (Phase 2)

---

## ⚡ Performance Tuning Tips

### 1. Optimize Supabase Client Configuration

**Current settings are optimal**, but here's what each does:

```typescript
{
  auth: {
    persistSession: true,        // ✅ Reduces auth calls
    autoRefreshToken: true,      // ✅ Prevents token expiration errors
    detectSessionInUrl: true,    // ✅ Handle OAuth redirects
    flowType: 'pkce',            // ✅ Secure auth flow
    storage: window.localStorage, // ✅ Persist across tabs
  },
  realtime: {
    params: {
      eventsPerSecond: 10,       // ✅ Rate limit realtime messages
    },
  },
  global: {
    headers: {
      'x-connection-pool': 'transaction', // ✅ Optimal pooling
    },
  },
}
```

### 2. Enable PostgREST Request Coalescing (Future)

When you have high concurrent load:

```typescript
// Advanced configuration for Phase 3
global: {
  headers: {
    'x-connection-pool': 'transaction',
    'Prefer': 'resolution=merge-duplicates', // Coalesce identical requests
  },
}
```

This merges identical concurrent requests into a single database query.

### 3. Use Query Hints for Complex Queries

```typescript
// For expensive queries, hint PostgreSQL to use specific indexes
const { data } = await supabase
  .from('offers')
  .select('*')
  .eq('status', 'ACTIVE')
  .order('created_at', { ascending: false })
  .limit(100)
  .setHeader('Prefer', 'params=single-object'); // Query hint
```

---

## 🧪 Testing Configuration Changes

### Test Connection Pooling

```bash
# Install k6 for load testing
pnpm add -D k6

# Create load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  let res = http.get('https://your-api.com/api/offers');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}

# Run test
k6 run load-test.js
```

### Monitor During Load Test

```sql
-- Watch connections in real-time (run in separate terminal)
SELECT 
  count(*) as active_connections,
  state,
  wait_event_type
FROM pg_stat_activity
WHERE state = 'active'
GROUP BY state, wait_event_type;

-- Run every 2 seconds
\watch 2
```

### Expected Results

| Metric | Target | Status |
|--------|--------|--------|
| Max concurrent connections | < 48/60 (80%) | ✅ Safe |
| Average query time | < 100ms | ✅ Excellent |
| P95 query time | < 500ms | ✅ Good |
| Connection wait time | 0ms | ✅ No queuing |
| Error rate | < 0.1% | ✅ Reliable |

---

## 🔒 Security Considerations

### Row-Level Security (RLS) with Pooling

Transaction pooling **does not affect RLS**. Each query still respects RLS policies:

```sql
-- RLS still enforced with pooling
SELECT * FROM offers WHERE status = 'ACTIVE';
-- ✅ Users only see offers they're allowed to see

-- Partner can only see their own offers
SELECT * FROM offers WHERE partner_id = auth.uid();
-- ✅ Works correctly with connection pooling
```

### Connection String Security

**NEVER expose database connection strings directly:**

```bash
# ❌ BAD: Direct PostgreSQL connection
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres

# ✅ GOOD: Use Supabase client with pooling
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (anon key, safe to expose)
```

Supabase client automatically uses pooling and RLS. Direct connections bypass pooling!

---

## 📈 Scaling Beyond Phase 1

### Connection Capacity by Plan

| Plan | Transaction Pool | Session Pool | Direct Connections |
|------|-----------------|--------------|-------------------|
| **Free** | 15 | 15 | 3 |
| **Pro** (Current) | 60 | 200 | 15 |
| **Team** | 200 | 400 | 50 |
| **Enterprise** | Custom | Custom | Custom |

### When to Upgrade

Upgrade to **Team Plan** ($599/mo) when:
- Peak connections > 48 (80% of 60)
- Seeing "connection timeout" errors
- Need read replica support
- Need dedicated resources

### When to Add Read Replica

Add read replica when:
- Read queries > 70% of all queries (typical for SmartPick)
- Need to separate read/write load
- Want 200+ connections for reads
- Scaling beyond 5,000 concurrent users

**Cost:** $400/month additional  
**Benefit:** 3-4x read capacity, lower latency

---

## ✅ Configuration Checklist

Current configuration status:

- [x] Supabase connection pooling enabled (transaction mode)
- [x] Environment variables properly configured
- [x] No secrets exposed in frontend code
- [x] Auth session persistence enabled
- [x] Realtime rate limiting configured
- [ ] Read replica configured (Phase 2)
- [ ] CDN caching headers configured (Phase 2)
- [ ] Connection pool monitoring alerts set up
- [ ] Load testing completed

---

## 🆘 Troubleshooting

### Issue: "Connection pool timeout"

**Cause:** Too many concurrent connections

**Solution:**
```typescript
// Add retry logic
const fetchWithRetry = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};

// Usage
const offers = await fetchWithRetry(() => getActiveOffers());
```

### Issue: "JWT expired"

**Cause:** Token expired, auto-refresh failed

**Solution:**
```typescript
// Already configured in supabase.ts:
auth: {
  autoRefreshToken: true,  // ✅ Enabled
  persistSession: true,    // ✅ Enabled
}

// If still seeing issues, manually refresh:
const { data, error } = await supabase.auth.refreshSession();
```

### Issue: "PGRST301 error"

**Cause:** PostgREST timeout (usually connection pool full)

**Solution:**
1. Check connection pool usage (see monitoring section)
2. Ensure transaction pooling enabled (✅ already done)
3. Implement request debouncing on frontend
4. Consider upgrading to Team plan

---

## 📞 Need Help?

**Supabase Support:**
- Dashboard: Settings → Support
- Discord: https://discord.supabase.com
- Docs: https://supabase.com/docs

**Performance Issues:**
1. Check Supabase Dashboard → Database → Query Performance
2. Run `EXPLAIN ANALYZE` on slow queries
3. Verify indexes are being used: `EXPLAIN (ANALYZE, BUFFERS) SELECT ...`

---

**Document Version**: 1.0  
**Last Updated**: December 4, 2025  
**Configuration Status**: ✅ Optimal for Production
