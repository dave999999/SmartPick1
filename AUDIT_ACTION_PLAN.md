# 🚨 SMARTPICK SECURITY ACTION PLAN
## Critical Vulnerability Remediation Roadmap
**Timeline:** 3 Weeks (15 Working Days)  
**Estimated Cost:** $10,000 - $15,000  
**Priority:** LAUNCH BLOCKER

---

## 📋 OVERVIEW

This action plan addresses the **5 critical security vulnerabilities** identified in the technical audit. Each fix includes:
- ✅ Implementation steps (with code)
- ✅ Testing procedures
- ✅ Rollback plan
- ✅ Estimated time/complexity

---

## 🗓️ WEEK 1: DATABASE & BACKEND SECURITY

### 🔴 DAY 1-2: FIX CRIT-01 - QR Code Replay Attack

**Severity:** CRITICAL (9.5/10)  
**Effort:** 2 days  
**Assignee:** Backend Developer

#### Problem
QR codes can be reused due to TOCTOU (Time-of-Check Time-of-Use) race condition between validation and status update.

#### Solution Steps

**Step 1: Add QR Scan Tracking to Database**

```sql
-- File: supabase/migrations/20260105_qr_scan_tracking.sql

-- Add columns to track QR code usage
ALTER TABLE reservations 
  ADD COLUMN qr_scanned_at TIMESTAMPTZ,
  ADD COLUMN qr_scan_count INTEGER DEFAULT 0,
  ADD COLUMN qr_last_scan_ip INET;

-- Add index for fast QR lookups
CREATE INDEX idx_reservations_qr_code_active 
  ON reservations(qr_code) 
  WHERE status = 'ACTIVE';

-- Add comment
COMMENT ON COLUMN reservations.qr_scanned_at IS 
  'Timestamp of first QR scan attempt (prevents replay attacks)';
```

**Step 2: Update Edge Function with Atomic Status Update**

```typescript
// File: supabase/functions/mark-pickup/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { reservation_id } = await req.json()
    
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create Supabase client with service role (for points transfer)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get client IP for tracking
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'

    // ATOMIC UPDATE: Mark as picked up ONLY if still ACTIVE
    const { data: reservation, error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'PICKED_UP',
        picked_up_at: new Date().toISOString(),
        qr_scanned_at: new Date().toISOString(), // NEW: Track scan time
        qr_scan_count: supabase.sql`qr_scan_count + 1`, // NEW: Increment counter
        qr_last_scan_ip: clientIp // NEW: Track IP
      })
      .eq('id', reservation_id)
      .eq('status', 'ACTIVE') // CRITICAL: Only update if ACTIVE
      .gt('expires_at', new Date().toISOString()) // Must not be expired
      .select('*, offer:offers(*)')
      .single()

    // If no rows updated, reservation already picked up or expired
    if (updateError || !reservation) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Reservation already picked up or expired'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Transfer points from escrow to partner (existing logic)
    // ... (keep existing points transfer code)

    return new Response(JSON.stringify({
      success: true,
      reservation
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

**Step 3: Add QR Scan Time Validation in Client**

```typescript
// File: src/lib/api/reservations.ts

export const validateQRCode = async (
  qrCode: string, 
  autoMarkAsPickedUp: boolean = false
): Promise<QRValidationResult> => {
  // ... existing code ...

  if (autoMarkAsPickedUp) {
    // First, check if QR was already scanned recently (prevent rapid replay)
    const { data: recentScan } = await supabase
      .from('reservations')
      .select('qr_scanned_at, status')
      .eq('qr_code', qrCode)
      .single()

    if (recentScan?.qr_scanned_at) {
      const scanTime = new Date(recentScan.qr_scanned_at)
      const now = new Date()
      const secondsSinceScan = (now.getTime() - scanTime.getTime()) / 1000

      // If scanned less than 5 seconds ago, likely replay attempt
      if (secondsSinceScan < 5 && recentScan.status === 'ACTIVE') {
        logger.warn('⚠️ Rapid QR replay detected', { qrCode, secondsSinceScan })
        return { 
          valid: false, 
          error: 'QR code already being processed. Please wait.' 
        }
      }

      // If already picked up, reject immediately
      if (recentScan.status !== 'ACTIVE') {
        return { 
          valid: false, 
          error: 'QR code already used or expired' 
        }
      }
    }

    // ... rest of existing pickup logic ...
  }
}
```

#### Testing Checklist

- [ ] Create reservation, scan QR → should succeed
- [ ] Immediately scan same QR again → should fail with "already used"
- [ ] Scan QR within 5 seconds → should fail with "being processed"
- [ ] Concurrent scans (2 devices) → only 1 succeeds
- [ ] Load test: 100 concurrent scans → verify no double-pickups

#### Rollback Plan
```sql
-- If issues arise, rollback columns
ALTER TABLE reservations 
  DROP COLUMN qr_scanned_at,
  DROP COLUMN qr_scan_count,
  DROP COLUMN qr_last_scan_ip;
```

---

### 🔴 DAY 3: FIX CRIT-05 - Offer Quantity Race Condition

**Severity:** CRITICAL (8.5/10)  
**Effort:** 1 day  
**Assignee:** Backend Developer

#### Problem
Multiple users can reserve last item simultaneously, causing overselling.

#### Solution Steps

**Step 1: Add Database Constraint**

```sql
-- File: supabase/migrations/20260105_prevent_negative_inventory.sql

-- Prevent negative inventory at database level
ALTER TABLE offers 
  ADD CONSTRAINT check_quantity_non_negative 
  CHECK (quantity_available >= 0);

-- Add comment
COMMENT ON CONSTRAINT check_quantity_non_negative ON offers IS 
  'Prevents overselling by rejecting updates that would make quantity negative';
```

**Step 2: Update create_reservation_atomic Function**

```sql
-- File: supabase/migrations/20260105_fix_reservation_atomic.sql

CREATE OR REPLACE FUNCTION create_reservation_atomic(
  p_offer_id UUID,
  p_quantity INTEGER,
  p_qr_code TEXT,
  p_total_price NUMERIC,
  p_expires_at TIMESTAMPTZ
)
RETURNS TABLE(
  id UUID,
  offer_id UUID,
  customer_id UUID,
  partner_id UUID,
  qr_code TEXT,
  quantity INTEGER,
  total_price NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_partner_id UUID;
  v_new_reservation_id UUID;
  v_updated_rows INTEGER;
BEGIN
  -- Get current user ID
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get partner ID from offer
  SELECT partner_id INTO v_partner_id
  FROM offers
  WHERE offers.id = p_offer_id;

  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- ATOMIC UPDATE: Decrement quantity ONLY if enough available
  UPDATE offers
  SET 
    quantity_available = quantity_available - p_quantity,
    updated_at = NOW()
  WHERE offers.id = p_offer_id
    AND quantity_available >= p_quantity  -- CRITICAL: Check before decrement
    AND status = 'ACTIVE'
    AND expires_at > NOW();

  -- Check if update succeeded
  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  
  IF v_updated_rows = 0 THEN
    -- Either insufficient quantity or offer expired/inactive
    RAISE EXCEPTION 'Insufficient quantity or offer no longer available';
  END IF;

  -- Create reservation (quantity already decremented atomically)
  INSERT INTO reservations (
    offer_id,
    customer_id,
    partner_id,
    qr_code,
    quantity,
    total_price,
    status,
    expires_at
  )
  VALUES (
    p_offer_id,
    v_customer_id,
    v_partner_id,
    p_qr_code,
    p_quantity,
    p_total_price,
    'ACTIVE',
    p_expires_at
  )
  RETURNING reservations.id INTO v_new_reservation_id;

  -- Return created reservation
  RETURN QUERY
  SELECT 
    r.id,
    r.offer_id,
    r.customer_id,
    r.partner_id,
    r.qr_code,
    r.quantity,
    r.total_price,
    r.status::TEXT,
    r.created_at,
    r.expires_at
  FROM reservations r
  WHERE r.id = v_new_reservation_id;

EXCEPTION
  WHEN check_violation THEN
    RAISE EXCEPTION 'Insufficient quantity available';
  WHEN OTHERS THEN
    RAISE;
END;
$$;
```

#### Testing Checklist

- [ ] Offer has quantity=1, 10 users reserve → only 1 succeeds
- [ ] Verify error message: "Insufficient quantity available"
- [ ] Check offers table: quantity_available never negative
- [ ] Load test: 1000 concurrent reservations → no overselling

---

### 🔴 DAY 4-5: FIX CRIT-03 - Points System Race Condition

**Severity:** CRITICAL (9.2/10)  
**Effort:** 2 days  
**Assignee:** Backend Developer

#### Problem
Concurrent point transactions can corrupt user balance.

#### Solution Steps

**Step 1: Use PostgreSQL Advisory Locks**

```sql
-- File: supabase/migrations/20260105_fix_points_race_condition.sql

CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
  v_caller_role TEXT;
  v_lock_id BIGINT;
BEGIN
  -- Security check: Only service_role can modify points
  SELECT current_setting('request.jwt.claims', true)::json->>'role' 
    INTO v_caller_role;

  IF v_caller_role != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only backend can modify points';
  END IF;

  -- CRITICAL: Acquire advisory lock for this user (prevents concurrent updates)
  -- Convert UUID to bigint for lock (use hashtext for deterministic conversion)
  v_lock_id := ('x' || substring(p_user_id::text from 1 for 15))::bit(60)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_id);

  -- Now safe to read and update (lock held until transaction ends)
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id;

  -- Create user_points row if doesn't exist
  IF v_current_balance IS NULL THEN
    INSERT INTO user_points (user_id, balance)
    VALUES (p_user_id, GREATEST(p_amount, 0))
    ON CONFLICT (user_id) DO UPDATE 
    SET balance = user_points.balance + p_amount
    RETURNING balance INTO v_new_balance;
    
    v_current_balance := 0;
  ELSE
    -- Update balance atomically
    v_new_balance := v_current_balance + p_amount;
    
    -- Prevent negative balance
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient points (current: %, requested: %)', 
        v_current_balance, ABS(p_amount);
    END IF;

    UPDATE user_points
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Log transaction
  INSERT INTO point_transactions (
    user_id, 
    change, 
    reason, 
    balance_before, 
    balance_after, 
    metadata
  )
  VALUES (
    p_user_id, 
    p_amount, 
    p_reason, 
    v_current_balance, 
    v_new_balance, 
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  -- Advisory lock automatically released at end of transaction

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'transaction_id', v_transaction_id,
    'change', p_amount
  );
END;
$$;

-- Apply same fix to deduct_user_points
CREATE OR REPLACE FUNCTION deduct_user_points(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deduct = add negative amount
  RETURN add_user_points(p_user_id, -p_amount, p_reason, p_metadata);
END;
$$;
```

#### Testing Checklist

- [ ] User has 100 points, 2 concurrent claims of 50 each → only 1 succeeds
- [ ] Verify final balance correct (100 - 50 = 50, not corrupted)
- [ ] Load test: 100 concurrent point operations → no balance corruption
- [ ] Check point_transactions log: all transactions recorded correctly

---

## 🗓️ WEEK 2: API & AUTHORIZATION SECURITY

### 🔴 DAY 6-7: FIX CRIT-02 - IDOR on Reservations

**Severity:** CRITICAL (8.8/10)  
**Effort:** 2 days  
**Assignee:** Backend Developer

#### Problem
Any authenticated user can view any reservation if they know the ID.

#### Solution Steps

**Step 1: Update RLS Policies**

```sql
-- File: supabase/migrations/20260105_fix_reservations_rls.sql

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS reservations_select ON reservations;
DROP POLICY IF EXISTS reservations_select_all ON reservations;

-- Create strict policies: Only owner or partner can view

-- Policy 1: Customers see their own reservations
CREATE POLICY reservations_select_customer ON reservations
  FOR SELECT
  USING (customer_id = auth.uid());

-- Policy 2: Partners see reservations for their offers
CREATE POLICY reservations_select_partner ON reservations
  FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  );

-- Policy 3: Admins see all reservations
CREATE POLICY reservations_select_admin ON reservations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Apply same restrictions to UPDATE/DELETE operations
CREATE POLICY reservations_update_customer ON reservations
  FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY reservations_delete_admin ON reservations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
```

**Step 2: Update Client API to Handle RLS Errors**

```typescript
// File: src/lib/api/reservations.ts

export const getReservationById = async (
  reservationId: string
): Promise<Reservation | null> => {
  if (isDemoMode) return null;

  try {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        offer:offers(*),
        partner:partners(*)
      `)
      .eq('id', reservationId)
      .single();

    if (error) {
      // RLS will return no rows if user doesn't have access
      if (error.code === 'PGRST116') {
        logger.warn('Access denied to reservation:', reservationId);
        return null; // Don't leak existence of reservation
      }
      throw error;
    }

    return data as Reservation;
  } catch (error) {
    logger.error('Failed to fetch reservation:', error);
    return null;
  }
};
```

#### Testing Checklist

- [ ] User A creates reservation → User B cannot view it (returns 404)
- [ ] Partner can view reservations for their offers only
- [ ] Admin can view all reservations
- [ ] Direct API call with stolen ID → returns empty result
- [ ] Check network logs: no data leakage in error messages

---

### 🔴 DAY 8-9: FIX CRIT-04 - Admin Privilege Escalation

**Severity:** CRITICAL (9.8/10)  
**Effort:** 2 days  
**Assignee:** Senior Backend Developer

#### Problem
Admin role checked via database query, vulnerable if JWT secret leaked.

#### Solution Steps

**Step 1: Move Admin Role to JWT Custom Claims**

```sql
-- File: supabase/migrations/20260105_admin_jwt_claims.sql

-- Create function to populate JWT custom claims
CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_role TEXT;
  claims JSONB;
BEGIN
  -- Get user role from users table
  SELECT role INTO user_role
  FROM public.users
  WHERE id = (event->>'user_id')::UUID;

  -- Build custom claims
  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(COALESCE(user_role, 'CUSTOMER')));

  -- Return updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auth.custom_access_token_hook TO supabase_auth_admin;
```

**Step 2: Update RLS Policies to Check JWT Claims**

```sql
-- File: supabase/migrations/20260105_rls_jwt_claims.sql

-- Example: Update partners policy to check JWT claim
DROP POLICY IF EXISTS partners_delete_combined ON partners;

CREATE POLICY partners_delete_admin ON partners
  FOR DELETE
  USING (
    -- Check JWT claim directly (no DB query)
    (current_setting('request.jwt.claims', true)::jsonb->>'user_role') = 'ADMIN'
  );

-- Apply to all admin-only policies across all tables
-- (offers, users, partners, reservations, etc.)
```

**Step 3: Add IP Whitelist for Admin Actions**

```sql
-- File: supabase/migrations/20260105_admin_ip_whitelist.sql

-- Create IP whitelist table
CREATE TABLE admin_allowed_ips (
  ip INET PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add your office/VPN IPs
INSERT INTO admin_allowed_ips (ip, description) VALUES
  ('203.0.113.0/24', 'Office network'),
  ('198.51.100.0/24', 'VPN network');

-- Create function to check IP
CREATE OR REPLACE FUNCTION is_admin_from_allowed_ip()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_ip INET;
  is_allowed BOOLEAN;
BEGIN
  -- Get client IP from connection
  client_ip := inet_client_addr();

  -- Check if IP is in whitelist
  SELECT EXISTS (
    SELECT 1 FROM admin_allowed_ips
    WHERE client_ip <<= ip -- IP is within allowed subnet
  ) INTO is_allowed;

  RETURN is_allowed;
END;
$$;

-- Update admin policies to require IP whitelist
CREATE POLICY partners_delete_admin_with_ip ON partners
  FOR DELETE
  USING (
    (current_setting('request.jwt.claims', true)::jsonb->>'user_role') = 'ADMIN'
    AND is_admin_from_allowed_ip()
  );
```

#### Testing Checklist

- [ ] Admin login → JWT contains `user_role: 'ADMIN'`
- [ ] Admin from allowed IP → can delete offers
- [ ] Admin from random IP → deletion blocked
- [ ] Regular user with forged JWT → blocked by signature verification
- [ ] Rotate JWT secret in Supabase dashboard → old tokens invalidated

---

## 🗓️ WEEK 3: MOBILE & TESTING

### 🟠 DAY 10: FIX HIGH-01 - Android WebView Debugging

**Severity:** HIGH (7.8/10)  
**Effort:** 0.5 days  
**Assignee:** Mobile Developer

#### Solution

```java
// File: android/app/src/main/java/ge/smartpick/app/MainActivity.java

package ge.smartpick.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // SECURITY FIX: Only enable debugging in debug builds
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        } else {
            WebView.setWebContentsDebuggingEnabled(false); // Production = disabled
        }
        
        createNotificationChannels();
    }
    
    // ... rest of code
}
```

**Testing:**
- [ ] Build debug APK → WebView debugging enabled
- [ ] Build release APK → WebView debugging disabled
- [ ] Verify in chrome://inspect → production app not listed

---

### 🟠 DAY 11: FIX HIGH-03 - CSRF Token Enforcement

**Severity:** HIGH (7.2/10)  
**Effort:** 1 day  
**Assignee:** Backend Developer

#### Solution

```typescript
// File: supabase/functions/mark-pickup/index.ts

serve(async (req) => {
  try {
    // STEP 1: Validate CSRF token
    const csrfToken = req.headers.get('X-CSRF-Token')
    if (!csrfToken) {
      return new Response(JSON.stringify({ error: 'CSRF token required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // STEP 2: Get user ID from JWT
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401
      })
    }

    // STEP 3: Validate CSRF token in database
    const { data: tokenData } = await supabase
      .from('csrf_tokens')
      .select('*')
      .eq('token', csrfToken)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!tokenData) {
      return new Response(JSON.stringify({ error: 'Invalid or expired CSRF token' }), {
        status: 403
      })
    }

    // STEP 4: Proceed with pickup (existing logic)
    // ...
  } catch (error) {
    // ...
  }
})
```

---

### 🧪 DAY 12-14: SECURITY TESTING

**Effort:** 3 days  
**Assignee:** QA Engineer + Security Consultant

#### Test Plan

**Day 12: Manual Security Testing**
- [ ] Test QR replay attack (automated rapid scans)
- [ ] Test concurrent reservations (10+ users, 1 item)
- [ ] Test IDOR (enumerate reservation IDs)
- [ ] Test admin privilege escalation (forged JWTs)
- [ ] Test SQL injection on all input fields

**Day 13: Automated Testing**
```bash
# Run E2E security tests
npm run test:e2e:security

# Run load tests
k6 run tests/load/concurrent-reservations.js

# Run OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://staging.smartpick.ge
```

**Day 14: Penetration Testing**
- Hire external security consultant ($2,000 - $5,000)
- Provide audit report + recommendations
- Retest critical vulnerabilities

---

### 📋 DAY 15: PRODUCTION DEPLOYMENT

**Effort:** 1 day  
**Assignee:** DevOps + Lead Developer

#### Deployment Checklist

**Pre-Deployment:**
- [ ] All 5 critical fixes merged to `main` branch
- [ ] All tests passing (unit + E2E + security)
- [ ] Database migrations tested on staging
- [ ] Rollback plan documented
- [ ] Team briefed on deployment

**Deployment Steps:**

```bash
# 1. Backup production database
supabase db dump > backup-$(date +%Y%m%d).sql

# 2. Apply migrations (in order)
supabase db push

# 3. Deploy Edge Functions
supabase functions deploy mark-pickup
supabase functions deploy rate-limit
supabase functions deploy csrf-token

# 4. Deploy web app (auto via Vercel)
git push origin main

# 5. Deploy Android app
cd android
./gradlew bundleRelease
# Upload to Google Play Console (internal testing first)

# 6. Monitor for 24 hours
# Watch error rates, response times, user complaints
```

**Post-Deployment:**
- [ ] Verify QR scans working (test on staging first)
- [ ] Check error logs (Sentry)
- [ ] Monitor reservation success rate
- [ ] Test admin functions work correctly
- [ ] Smoke test: Create reservation + pickup

---

## 📊 PROGRESS TRACKING

### Completion Checklist

#### Week 1: Backend Security
- [ ] CRIT-01: QR Replay Protection ✅
- [ ] CRIT-05: Offer Quantity Race Condition ✅
- [ ] CRIT-03: Points System Race Condition ✅

#### Week 2: API & Authorization
- [ ] CRIT-02: IDOR Fix ✅
- [ ] CRIT-04: Admin Privilege Escalation ✅

#### Week 3: Mobile & Testing
- [ ] HIGH-01: Android WebView Debugging ✅
- [ ] HIGH-03: CSRF Enforcement ✅
- [ ] Security Testing ✅
- [ ] Production Deployment ✅

### Daily Standup Questions
1. What did I complete yesterday?
2. What am I working on today?
3. Any blockers or security concerns?

---

## 💰 BUDGET BREAKDOWN

| Item | Cost | Timeline |
|------|------|----------|
| Backend Developer (15 days @ $800/day) | $12,000 | Week 1-3 |
| Mobile Developer (0.5 days @ $800/day) | $400 | Day 10 |
| QA Engineer (3 days @ $600/day) | $1,800 | Day 12-14 |
| Security Consultant (pen-test) | $3,000 | Day 14 |
| **TOTAL** | **$17,200** | 3 weeks |

**Cost Optimization:**
- Use in-house developers: Save $8,000
- Skip external pen-test (do internally): Save $3,000
- **Minimum Budget:** $6,200 (1 developer, 3 weeks)

---

## 🚨 RISK MITIGATION

### If Timeline Slips

**Priority Order (if must cut scope):**
1. 🔴 **MUST FIX:** CRIT-01, CRIT-05 (QR + inventory) - 3 days
2. 🟠 **SHOULD FIX:** CRIT-02, CRIT-03 (IDOR + points) - 3 days
3. 🟡 **CAN DEFER:** CRIT-04 (admin security) - 2 days

**Minimum Viable Security (1 week):**
- Fix QR replay (Day 1-2)
- Fix inventory race (Day 3)
- Fix IDOR (Day 4-5)
- Deploy + test (Day 6-7)

### Emergency Rollback

```sql
-- If critical bug found after deployment
-- Rollback all migrations
supabase db reset --db-url "postgresql://..."

-- Restore from backup
psql -h db.supabase.co -U postgres -d postgres < backup-20260105.sql

-- Redeploy previous app version
vercel rollback
```

---

## 📞 SUPPORT & ESCALATION

**Technical Issues:**
- Lead Developer: [your-email]
- Supabase Support: https://supabase.com/support

**Security Incidents:**
- Security Team: security@smartpick.ge
- Emergency: [phone-number]

---

## ✅ DEFINITION OF DONE

A fix is considered COMPLETE when:
1. ✅ Code implemented and reviewed
2. ✅ Unit tests passing (>80% coverage)
3. ✅ E2E tests passing
4. ✅ Security test passed (manual + automated)
5. ✅ Deployed to staging and verified
6. ✅ Documentation updated
7. ✅ Rollback plan tested
8. ✅ Team trained on new behavior

---

## 📚 REFERENCES

- [Technical Audit Report](./AUDIT_TECHNICAL_SECURITY_REPORT.md)
- [QA Test Checklist](./AUDIT_QA_TEST_CHECKLIST.md)
- [Supabase Security Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Action Plan Version:** 1.0  
**Created:** January 5, 2026  
**Owner:** SmartPick Engineering Team  
**Status:** 🟡 IN PROGRESS

---

## 🎯 NEXT STEPS

1. **Assign tasks** to developers (use this plan as sprint backlog)
2. **Create GitHub issues** for each CRIT fix
3. **Schedule daily standups** (15 min, 9 AM)
4. **Set up staging environment** for testing
5. **Begin Week 1 work** (QR replay protection)

**Let's ship secure code! 🚀**
