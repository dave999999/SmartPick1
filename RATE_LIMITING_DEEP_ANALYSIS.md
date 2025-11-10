# 🔐 RATE LIMITING DEEP ANALYSIS & RECOMMENDATIONS
**Date:** November 11, 2025  
**Application:** SmartPick.ge  

---

## 📊 CURRENT STATE ANALYSIS

### ✅ **What's Implemented:**

#### **1. Client-Side Rate Limiting** (`src/lib/rateLimiter.ts`)
- **Storage:** localStorage
- **Limits:**
  - Login: 5 attempts / 15 minutes
  - Signup: 3 attempts / hour
  - Reservation: 10 / hour

**Code Review:**
```typescript
// ❌ PROBLEM: Easily bypassed
private storageKey = 'smartpick_rate_limits';

// User can bypass by:
// 1. localStorage.clear()
// 2. Using incognito mode
// 3. Clearing browser data
// 4. Using different browsers
```

#### **2. Server-Side Rate Limiting** (`src/lib/rateLimiter-server.ts`)
- **Method:** Calls Supabase Edge Function
- **Storage:** Database table `rate_limits`
- **Edge Function:** `supabase/functions/rate-limit/index.ts`

**Code Review:**
```typescript
// ✅ GOOD: Calls server for validation
export async function checkServerRateLimit(action, identifier) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/rate-limit`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action, identifier })
    }
  );
  // ⚠️ Fails open on error (allows request)
  if (!response.ok) {
    return { allowed: true, remaining: 99 }; // Security vs Availability
  }
}
```

#### **3. Edge Function Implementation** (`supabase/functions/rate-limit/index.ts`)
```typescript
// ✅ EXCELLENT: Proper implementation
- IP tracking (cf-connecting-ip, x-forwarded-for)
- Database-backed (rate_limits table)
- Configurable limits per action
- Automatic cleanup of old records
- Fail-open strategy (prevents service disruption)
```

---

## 🔍 WHERE IT'S USED (Current Coverage)

### ✅ **Protected Endpoints:**

1. **AuthDialog.tsx** (Lines 77, 89, 203, 215)
   ```typescript
   // Login
   const clientRateLimit = await checkRateLimit('login', signInEmail);
   const serverRateLimit = await checkServerRateLimit('login', signInEmail);
   
   // Signup
   const clientRateLimit = await checkRateLimit('signup', signUpEmail);
   const serverRateLimit = await checkServerRateLimit('signup', signUpEmail);
   ```
   ✅ **Status:** FULLY PROTECTED (both client + server checks)

2. **ReservationModal.tsx** (Lines 168, 178)
   ```typescript
   const clientRateLimit = await checkRateLimit('reservation', user.id);
   const serverRateLimit = await checkServerRateLimit('reservation', user.id);
   ```
   ✅ **Status:** FULLY PROTECTED

---

### ❌ **UNPROTECTED Critical Endpoints:**

#### **1. Offer Creation** (PartnerDashboard.tsx - Line 425)
```typescript
// ❌ NO RATE LIMITING
const handleCreateOffer = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsCreatingOffer(true);
  
  // Direct database insert - no rate limit check!
  const { data, error } = await supabase
    .from('offers')
    .insert(insertData);
}
```

**Risk:** Partner can spam database with unlimited offers
**Impact:** Database bloat, potential DoS, storage costs

---

#### **2. Offer Deletion** (PartnerDashboard.tsx)
```typescript
// ❌ NO RATE LIMITING
const handleDeleteOffer = async (offerId: string) => {
  await supabase
    .from('offers')
    .delete()
    .eq('id', offerId);
}
```

**Risk:** Malicious partner can delete/recreate offers rapidly
**Impact:** Database load, audit log pollution

---

#### **3. Partner Application** (PartnerApplication.tsx - Line 684)
```typescript
// ❌ NO RATE LIMITING
const handleSubmit = async (e: React.FormEvent) => {
  // Direct insert - no checks
  const { data, error } = await supabase
    .from('partners')
    .insert(partnerData);
}
```

**Risk:** Spam applications, database flooding
**Impact:** Admin overwhelm, database performance

---

#### **4. Admin Operations** (AdminDashboard.tsx, AdminPanel.tsx)
```typescript
// ❌ NO RATE LIMITING on:
- Approving partners
- Rejecting applications
- Manual points adjustments
- User status changes
```

**Risk:** Compromised admin account = unlimited damage
**Impact:** System-wide manipulation

---

#### **5. Points Purchase** (BuyPointsModal.tsx)
```typescript
// ❌ NO RATE LIMITING
// User can attempt to buy points repeatedly
```

**Risk:** Payment processing abuse, transaction spam
**Impact:** Payment gateway costs, potential fraud

---

## 🎯 DETAILED RECOMMENDATIONS

### **IMMEDIATE FIXES (This Week)**

#### **1. Add Rate Limiting to Offer Creation**

**File:** `src/pages/PartnerDashboard.tsx`

```typescript
// ADD THIS IMPORT
import { checkServerRateLimit, recordClientAttempt } from '@/lib/rateLimiter-server';

const handleCreateOffer = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ✅ ADD RATE LIMITING
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const rateLimit = await checkServerRateLimit('offer_create', user.id);
  if (!rateLimit.allowed) {
    toast.error(rateLimit.message || 'Too many offers created. Please wait.', {
      icon: <Shield className="w-4 h-4" />,
    });
    recordClientAttempt('offer_create', user.id);
    return;
  }
  
  setIsCreatingOffer(true);
  // ... rest of code
}
```

**Update Edge Function:** `supabase/functions/rate-limit/index.ts`
```typescript
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'login': { maxAttempts: 5, windowSeconds: 900 },
  'signup': { maxAttempts: 3, windowSeconds: 3600 },
  'reservation': { maxAttempts: 10, windowSeconds: 3600 },
  'offer_create': { maxAttempts: 20, windowSeconds: 3600 }, // ✅ ADD THIS
  'offer_delete': { maxAttempts: 10, windowSeconds: 3600 }, // ✅ ADD THIS
  'partner_application': { maxAttempts: 2, windowSeconds: 86400 }, // ✅ ADD THIS (2 per day)
  'admin_action': { maxAttempts: 100, windowSeconds: 3600 }, // ✅ ADD THIS
}
```

---

#### **2. Protect Partner Application**

**File:** `src/pages/PartnerApplication.tsx`

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ✅ ADD RATE LIMITING (very strict - 2 applications per day)
  const { data: { user } } = await supabase.auth.getUser();
  const identifier = user?.id || signUpEmail; // Use email if not authenticated
  
  const rateLimit = await checkServerRateLimit('partner_application', identifier);
  if (!rateLimit.allowed) {
    toast.error('You have reached the application limit. Please wait 24 hours.', {
      icon: <Shield className="w-4 h-4" />,
      duration: 5000
    });
    return;
  }
  
  // ... rest of code
}
```

---

#### **3. Add Admin Action Rate Limiting**

**File:** `src/pages/AdminPanel.tsx`

```typescript
const handleApprovePartner = async (partnerId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  // ✅ Prevent compromised admin from mass-approving
  const rateLimit = await checkServerRateLimit('admin_action', user.id);
  if (!rateLimit.allowed) {
    toast.error('Too many admin actions. Please slow down.', {
      icon: <Shield className="w-4 h-4" />,
    });
    return;
  }
  
  // ... approval logic
}
```

---

### **MEDIUM PRIORITY (Next 2 Weeks)**

#### **1. Implement Redis for Rate Limiting**

**Problem:** Database lookups for every rate limit check add latency

**Solution:** Use Upstash Redis (Vercel-compatible)

```typescript
// Install: pnpm add @upstash/redis

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function checkRateLimitRedis(action: string, identifier: string) {
  const key = `ratelimit:${action}:${identifier}`;
  const config = RATE_LIMITS[action];
  
  // Increment counter
  const count = await redis.incr(key);
  
  // Set expiry on first request
  if (count === 1) {
    await redis.expire(key, config.windowSeconds);
  }
  
  const allowed = count <= config.maxAttempts;
  const remaining = Math.max(0, config.maxAttempts - count);
  
  return { allowed, remaining };
}
```

**Benefits:**
- ⚡ Sub-millisecond response times
- 🌍 Global edge caching
- 💰 Serverless pricing model
- 🔄 Automatic key expiration

---

#### **2. Add IP-Based Rate Limiting for Unauthenticated Users**

**Problem:** Users can bypass auth-based limits by creating multiple accounts

**Solution:** Add IP tracking for critical endpoints

```typescript
// In Edge Function
const clientIp = req.headers.get('cf-connecting-ip') || 
                 req.headers.get('x-forwarded-for') || 
                 'unknown';

// Combine user ID + IP for stronger protection
const key = `${action}:${identifier}:${clientIp}`;
```

**Critical for:**
- Signup endpoint (prevent account creation spam)
- Login endpoint (prevent brute force)
- Password reset (prevent enumeration attacks)

---

#### **3. Implement Sliding Window Rate Limiting**

**Problem:** Current implementation uses fixed windows (can be gamed)

**Example:**
```
Fixed Window Problem:
- 09:00:00 - 09:59:59: 5 attempts allowed
- User makes 5 attempts at 09:59:50
- 10:00:00 - new window starts
- User makes 5 more attempts at 10:00:01
- Result: 10 attempts in 11 seconds!
```

**Solution: Sliding Window**
```typescript
// Store timestamps of each attempt
const attempts = await redis.zrange(key, '-inf', now - windowMs);
const recentCount = attempts.length;

if (recentCount >= maxAttempts) {
  return { allowed: false };
}

// Add current timestamp
await redis.zadd(key, { score: now, member: `${now}:${uuid()}` });
await redis.expire(key, windowMs / 1000);
```

---

### **ADVANCED FEATURES (Future Enhancement)**

#### **1. Adaptive Rate Limiting**

Adjust limits based on user behavior:

```typescript
interface UserTrustLevel {
  level: 'new' | 'trusted' | 'vip';
  limits: {
    reservation: number;
    offer_create: number;
  }
}

// New users: Strict limits
// Trusted users (>10 successful reservations): Higher limits
// VIP users: Even higher limits

const getUserTrustLevel = async (userId: string): Promise<UserTrustLevel> => {
  const stats = await getUserStats(userId);
  
  if (stats.total_reservations >= 50) {
    return { level: 'vip', limits: { reservation: 20, offer_create: 50 } };
  }
  if (stats.total_reservations >= 10) {
    return { level: 'trusted', limits: { reservation: 15, offer_create: 30 } };
  }
  return { level: 'new', limits: { reservation: 10, offer_create: 20 } };
}
```

---

#### **2. Anomaly Detection**

Flag suspicious patterns:

```typescript
interface AnomalyDetection {
  rapidFireReservations: boolean; // 5+ in 60 seconds
  unusualHours: boolean; // Activity at 3 AM local time
  geoVelocity: boolean; // Login from different countries within minutes
  patternMatch: boolean; // Matches known bot behavior
}

// Automatically increase rate limiting if anomalies detected
if (hasAnomalies) {
  applyStrictRateLimit(userId);
  notifySecurityTeam(userId, anomalies);
}
```

---

#### **3. Rate Limit Headers**

Return standard headers for transparency:

```typescript
// Response headers
{
  'X-RateLimit-Limit': '10',
  'X-RateLimit-Remaining': '7',
  'X-RateLimit-Reset': '1699714800', // Unix timestamp
  'Retry-After': '3600' // Seconds until reset
}
```

Frontend can display to users:
```tsx
<Alert>
  You have {remaining} reservations remaining this hour.
  Resets in {formatDistanceToNow(resetAt)}.
</Alert>
```

---

## 📋 IMPLEMENTATION CHECKLIST

### **Week 1: Critical Endpoints**
- [ ] Add rate limiting to offer creation
- [ ] Add rate limiting to offer deletion
- [ ] Add rate limiting to partner applications
- [ ] Add rate limiting to admin actions
- [ ] Update Edge Function with new action types
- [ ] Test all protected endpoints
- [ ] Deploy to production

### **Week 2: Infrastructure**
- [ ] Set up Upstash Redis account
- [ ] Migrate rate limiting to Redis
- [ ] Implement IP-based tracking
- [ ] Add rate limit headers
- [ ] Update documentation
- [ ] Monitor performance improvements

### **Week 3: Advanced Features**
- [ ] Implement sliding window algorithm
- [ ] Add user trust levels
- [ ] Create admin dashboard for rate limit monitoring
- [ ] Set up alerts for rate limit violations
- [ ] Implement anomaly detection (basic)

### **Week 4: Testing & Optimization**
- [ ] Load testing (simulate attacks)
- [ ] Measure latency impact
- [ ] Fine-tune limits based on real usage
- [ ] Document security posture
- [ ] Security audit of rate limiting system

---

## 🚨 SECURITY IMPACT ASSESSMENT

### **Before Fixes:**
```
Attack Vector: Offer Spam
- Attacker creates 1000 offers in 1 minute
- Database: 1000 rows added
- Storage: 1000 images uploaded
- Cost: $$$
- Mitigation: NONE ❌
```

### **After Fixes:**
```
Attack Vector: Offer Spam
- Attacker attempts 1000 offers
- First 20 succeed in 1 hour
- Remaining 980 blocked by rate limiter
- Database: 20 rows added (manageable)
- Cost: Controlled ✅
```

**Risk Reduction:** 98%

---

## 💡 MONITORING & ALERTING

Set up monitoring for:

1. **Rate Limit Violations**
   ```sql
   -- Track blocked requests
   SELECT action, identifier, COUNT(*)
   FROM rate_limits
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY action, identifier
   HAVING COUNT(*) > 50
   ```

2. **Anomalous Patterns**
   - Single user hitting multiple rate limits
   - Sudden spike in rate limit violations
   - Geographic anomalies

3. **Performance Metrics**
   - Rate limit check latency
   - Redis hit rate
   - Database query times

---

## 🎯 CONCLUSION

**Current Status:** ⚠️ **PARTIAL PROTECTION**
- Authentication: ✅ Protected
- Reservations: ✅ Protected
- Offers: ❌ Unprotected
- Admin Actions: ❌ Unprotected
- Partner Applications: ❌ Unprotected

**After Implementation:** ✅ **COMPREHENSIVE PROTECTION**
- All critical endpoints protected
- Redis-backed for performance
- Adaptive limits based on trust
- Real-time monitoring

**Estimated Effort:** 3-4 weeks for full implementation
**Priority:** HIGH - Should be completed within 1 month

---

**Next Steps:**
1. Review this document with team
2. Prioritize fixes based on risk
3. Implement Week 1 changes immediately
4. Set up Redis infrastructure
5. Monitor and iterate based on real-world usage
