# 🚨 CRITICAL SECURITY FIXES - IMPLEMENTATION PLAN

**Priority:** CRITICAL - Deploy within 48 hours  
**Est. Time:** 6-8 hours  
**Risk Level:** HIGH (exposing secrets to 1000+ users)

---

## ISSUE #1: Exposed Resend API Key ❌ CRITICAL

### Current State
```typescript
// src/lib/api/email-verification.ts:33
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
```

**Problem:** `VITE_*` variables are embedded in client bundle → anyone can extract

### Fix Implementation

#### Step 1: Update Client Code (Remove API Key Usage)
**File:** `src/lib/api/email-verification.ts`

```typescript
// REMOVE lines 33-56 (sendEmailViaResend function using RESEND_API_KEY)
// REPLACE with Edge Function calls:

export async function sendVerificationEmail(email: string, userId: string) {
  const { data, error } = await supabase.functions.invoke('send-verification-email', {
    body: { email, userId }
  });
  
  if (error) throw error;
  return data;
}
```

#### Step 2: Verify Edge Function Exists (Already Done ✅)
**File:** `supabase/functions/send-verification-email/index.ts`
- Already exists with proper secret handling
- Uses `Deno.env.get('RESEND_API_KEY')` ✅
- Properly secured ✅

#### Step 3: Update All Callers
**Files to update:**
- `src/lib/supabase.ts` (signUpWithEmail) - ✅ Already uses Edge Function
- `src/lib/api/email-verification.ts` - Remove client-side sending
- `src/components/AuthDialog.tsx` - Verify uses Supabase Auth flow

#### Step 4: Remove from Environment Types
**File:** `src/vite-env.d.ts`
```typescript
// REMOVE this line:
// readonly VITE_RESEND_API_KEY: string  // ❌ Delete

// Already has correct comment:
// ⚠️ REMOVED: VITE_RESEND_API_KEY (security fix - was exposing secret) ✅
```

#### Step 5: Rotate API Key (Post-Deploy)
1. Generate new Resend API key
2. Update in Supabase Dashboard → Edge Functions → Secrets
3. Delete old API key from Resend dashboard
4. Update any CI/CD secrets

---

## ISSUE #2: Exposed BOG Payment Secret ❌ CRITICAL

### Current State
```typescript
// src/lib/payments/bog.ts:309
clientSecret: getEnv('BOG_CLIENT_SECRET') || '',
```

**Problem:** Bank OAuth secret exposed → unauthorized payments possible

### Fix Implementation

#### Step 1: Remove Client-Side BOG Logic
**File:** `src/lib/payments/bog.ts`

**Current:** 300+ lines of BOG payment logic in client code  
**Target:** Remove entire class, replace with API calls

```typescript
// REPLACE entire file with API wrapper:
import { supabase } from '@/lib/supabase';

export interface PaymentSession {
  session_id: string;
  payment_url: string;
  status: 'pending' | 'completed' | 'failed';
}

export async function createPaymentSession(
  amount: number,
  orderId: string,
  description: string
): Promise<PaymentSession> {
  const { data, error } = await supabase.functions.invoke('bog-create-session', {
    body: { amount, orderId, description }
  });
  
  if (error) throw new Error(`Payment session failed: ${error.message}`);
  return data;
}

export async function checkPaymentStatus(sessionId: string) {
  const { data, error } = await supabase.functions.invoke('bog-check-status', {
    body: { sessionId }
  });
  
  if (error) throw new Error(`Status check failed: ${error.message}`);
  return data;
}

// Webhook handling stays server-side ✅ (already correct)
```

#### Step 2: Update All Payment Flows
**Files to update:**
- `src/pages/RewardsStore.tsx` - Use new API
- `src/pages/Profile.tsx` - Use new API
- Any other files using `BOGPaymentGateway`

#### Step 3: Remove from Environment
**File:** `src/vite-env.d.ts`
```typescript
// REMOVE:
readonly BOG_CLIENT_SECRET: string  // ❌ Delete
readonly BOG_CLIENT_ID: string      // ❌ Delete (if exposed)
```

#### Step 4: Verify Edge Functions Complete
**Files:** `supabase/functions/bog-*`
- `bog-create-session/index.ts` - ✅ Exists, uses Deno.env
- `bog-webhook/index.ts` - ✅ Exists, properly secured
- `bog-check-status/index.ts` - Create if missing

#### Step 5: Rotate Credentials (Post-Deploy)
1. Login to BOG E-Commerce Portal
2. Generate new OAuth Client ID + Secret
3. Update in Supabase Secrets
4. Delete old credentials

---

## ISSUE #3: Add Input Validation ⚠️ HIGH PRIORITY

### Implementation

#### Step 1: Install Dependencies
```bash
pnpm add zod dompurify
pnpm add -D @types/dompurify
```

#### Step 2: Create Validation Schemas
**File:** `src/lib/validation/schemas.ts` (NEW)

```typescript
import { z } from 'zod';

// User schemas
export const emailSchema = z.string().email().max(255);
export const passwordSchema = z.string().min(8).max(128);
export const nameSchema = z.string().min(2).max(100).trim();
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/);

// Offer schemas
export const offerTitleSchema = z.string().min(5).max(100).trim();
export const offerDescriptionSchema = z.string().max(500).trim();
export const priceSchema = z.number().positive().max(10000);
export const quantitySchema = z.number().int().positive().max(1000);

export const createOfferSchema = z.object({
  title: offerTitleSchema,
  description: offerDescriptionSchema,
  smart_price: priceSchema,
  original_price: priceSchema,
  quantity_available: quantitySchema,
  category: z.enum(['FOOD', 'BAKERY', 'GROCERY', 'RESTAURANT', 'CAFE', 'OTHER']),
});

// Partner schemas
export const updatePartnerSchema = z.object({
  business_name: z.string().min(2).max(200).trim(),
  phone: phoneSchema.optional(),
  description: z.string().max(1000).trim().optional(),
  address: z.string().max(500).trim().optional(),
});

// Sanitize HTML
import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML
    ALLOWED_ATTR: []
  });
}
```

#### Step 3: Apply to All User Inputs
**Files to update:**
1. `src/pages/PartnerDashboardV3.tsx` - Offer creation
2. `src/pages/PartnerApplication.tsx` - Partner profile
3. `src/components/AuthDialog.tsx` - Registration
4. `src/pages/Profile.tsx` - Profile updates
5. `src/pages/ReserveOffer.tsx` - Reservation inputs

**Example Usage:**
```typescript
// Before
const createOffer = async (data: any) => {
  await supabase.from('offers').insert(data); // ❌ No validation
};

// After
import { createOfferSchema, sanitizeHtml } from '@/lib/validation/schemas';

const createOffer = async (data: unknown) => {
  // Validate
  const validated = createOfferSchema.parse(data);
  
  // Sanitize
  validated.description = sanitizeHtml(validated.description);
  
  // Insert
  await supabase.from('offers').insert(validated);
};
```

---

## ISSUE #4: Add Missing Rate Limits ⚠️ HIGH PRIORITY

### Implementation

#### Step 1: Add Rate Limits to Unprotected Endpoints
**File:** `src/lib/api/offers.ts`

```typescript
import { checkServerRateLimit } from './rateLimit';

export async function createOffer(partnerId: string, offerData: any) {
  // Check rate limit: 20 offers per day
  const rateCheck = await checkServerRateLimit(
    'create-offer',
    partnerId,
    20,
    86400
  );
  
  if (!rateCheck.allowed) {
    throw new Error('Rate limit: Maximum 20 offers per day');
  }
  
  // ... existing logic
}
```

#### Step 2: Add to All Authenticated Actions
**Endpoints to protect:**
- Offer creation: 20/day per partner
- Profile updates: 10/hour per user
- Image uploads: 50/day per user
- Notification sends: 100/hour per user
- Search queries: 100/hour per user (prevent scraping)

#### Step 3: Add IP-Based Rate Limiting
**File:** `src/lib/rateLimiter-server.ts` (enhance existing)
```typescript
// Add IP fingerprinting for anonymous users
export async function checkAnonymousRateLimit(
  action: string,
  maxAttempts: number = 10
): Promise<boolean> {
  const ip = await getUserIP(); // From request headers
  return checkServerRateLimit(action, ip, maxAttempts, 3600);
}
```

---

## ISSUE #5: Set Up Error Monitoring 📊 HIGH PRIORITY

### Implementation

#### Step 1: Configure Sentry
**File:** `src/main.tsx`

```typescript
import * as Sentry from '@sentry/react';

// Initialize Sentry before React
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    beforeSend(event) {
      // Strip sensitive data
      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.Cookie;
        delete event.request.headers['Set-Cookie'];
      }
      
      // Strip phone numbers, emails from messages
      if (event.message) {
        event.message = event.message
          .replace(/\+?[1-9]\d{9,14}/g, '[PHONE]')
          .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');
      }
      
      return event;
    },
    
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
  });
}
```

#### Step 2: Add Error Boundaries
**File:** `src/components/ErrorBoundary.tsx` (enhance existing)
```typescript
import * as Sentry from '@sentry/react';

export const ErrorBoundary = Sentry.withErrorBoundary(ErrorFallback, {
  fallback: <ErrorFallbackUI />,
  showDialog: true,
});
```

#### Step 3: Add Performance Monitoring
```typescript
// Wrap router
const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouter(
  createBrowserRouter
);

const router = sentryCreateBrowserRouter(routes);
```

#### Step 4: Add Custom Instrumentation
```typescript
// Track critical operations
Sentry.addBreadcrumb({
  category: 'reservation',
  message: 'User reserved offer',
  level: 'info',
  data: { offerId, userId }
});
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Remove `VITE_RESEND_API_KEY` from all client code
- [ ] Remove `BOG_CLIENT_SECRET` from all client code
- [ ] Add input validation to all forms
- [ ] Add rate limiting to unprotected endpoints
- [ ] Configure Sentry with DSN
- [ ] Test all flows in staging environment
- [ ] Run security audit with npm audit
- [ ] Check bundle size (target: <10MB)

### Deployment Steps
1. Deploy code changes
2. Verify Edge Functions working
3. Monitor Sentry for errors (first hour)
4. Check application logs
5. Verify rate limits working (test with scripts)

### Post-Deployment
- [ ] Rotate Resend API key
- [ ] Rotate BOG credentials
- [ ] Update documentation
- [ ] Send security update notification
- [ ] Monitor for 24 hours

---

## ROLLBACK PLAN

If issues detected:
1. Revert to previous commit
2. Redeploy immediately
3. Investigate issue
4. Fix and redeploy

**Git tag before deployment:** `pre-security-fix-v1.2.2`

---

## ESTIMATED TIMELINE

| Task | Time | Priority |
|------|------|----------|
| Remove Resend API key | 1 hour | CRITICAL |
| Remove BOG secrets | 2 hours | CRITICAL |
| Add validation (Zod) | 2 hours | HIGH |
| Add rate limits | 1 hour | HIGH |
| Configure Sentry | 1 hour | HIGH |
| Testing | 2 hours | CRITICAL |
| **Total** | **9 hours** | |

**Target Completion:** Within 48 hours

---

## SUCCESS CRITERIA

✅ No secrets in client bundle (verify with bundle analyzer)  
✅ All user inputs validated  
✅ All endpoints rate-limited  
✅ Sentry capturing errors  
✅ Zero production incidents during deployment  
✅ Bundle size reduced by 30%+  

---

## NOTES

- Keep old API keys valid for 7 days (grace period)
- Monitor Sentry closely first 24 hours
- Prepare user communication if issues found
- Document all changes in CHANGELOG.md

