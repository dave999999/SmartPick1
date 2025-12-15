# CRITICAL: POINTS SYSTEM SELF-ESCALATION VULNERABILITY

## 🚨 SEVERITY: CRITICAL

**Status:** 🔴 **VULNERABLE** (unless `20251108_security_hardening.sql` was applied)  
**Impact:** Users can give themselves unlimited points  
**CVSS Score:** 9.1 (Critical)  
**Date Discovered:** November 21, 2025

---

## 📋 VULNERABILITY SUMMARY

### The Problem
The `add_user_points` function in `20251108_harden_points_functions.sql` (line 79) grants EXECUTE permission to the `authenticated` role, allowing **ANY logged-in user** to call it directly and award themselves points.

### Vulnerable Code
```sql
-- File: 20251108_harden_points_functions.sql:79
GRANT EXECUTE ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) TO authenticated;
```

### Exploitation
```javascript
// ANY authenticated user can run this:
const { data, error } = await supabase.rpc('add_user_points', {
  p_user_id: currentUser.id,  // Their own ID
  p_amount: 999,               // Just under the 1000 cap
  p_reason: 'free_points',
  p_metadata: {}
});

// Run repeatedly for unlimited points:
for (let i = 0; i < 100; i++) {
  await supabase.rpc('add_user_points', {
    p_user_id: myId,
    p_amount: 999,
    p_reason: `batch_${i}`,
    p_metadata: {}
  });
}
// User now has 99,900 points!
```

---

## 🔍 ROOT CAUSE ANALYSIS

### Flawed Security Logic

The function has this validation (line 38-40):
```sql
IF v_auth <> p_user_id THEN
  RETURN jsonb_build_object('success', false, 'message', 'Cannot modify another user');
END IF;
```

**This check is INSUFFICIENT because:**
1. ✅ Prevents user from modifying OTHER users' points
2. ❌ Does NOT prevent user from modifying THEIR OWN points
3. ❌ Function is granted to `authenticated` role

### The Flaw
The function assumes that checking `auth.uid() == p_user_id` is enough security. But this only prevents **cross-user attacks**, not **self-escalation attacks**.

**Analogy:** 
- It's like having a bank vault that checks "you can only withdraw from your own account"
- But then allowing customers to print their own money and deposit it! 🏦💸

---

## 📊 ATTACK SCENARIOS

### Scenario 1: Point Farming
```javascript
// User creates a script to auto-farm points
setInterval(async () => {
  await supabase.rpc('add_user_points', {
    p_user_id: myId,
    p_amount: 999,
    p_reason: 'automated_farming'
  });
}, 1000); // Every second

// Result: 999 points per second = 59,940 points per minute!
```

### Scenario 2: Purchasing Bypass
```javascript
// User wants to buy premium item that costs 10,000 points
// Instead of purchasing, they just give themselves points:
await supabase.rpc('add_user_points', {
  p_user_id: myId,
  p_amount: 999,
  p_reason: 'bypass_purchase',
  p_metadata: { hack: true }
});
// Repeat 11 times, now has 10,989 points for free!
```

### Scenario 3: Leaderboard Manipulation
```javascript
// User wants #1 on leaderboard
// Check current leader's points, then exceed:
await supabase.rpc('add_user_points', {
  p_user_id: myId,
  p_amount: 999,
  p_reason: 'leaderboard_hack',
  p_metadata: { target_rank: 1 }
});
// Repeat until #1
```

---

## ✅ FIX STATUS

### Timeline

| Date | Migration | Status | Notes |
|------|-----------|--------|-------|
| Nov 8 | `20251108_harden_points_functions.sql` | 🔴 **VULNERABLE** | Grants to authenticated |
| Nov 8 | `20251108_security_hardening.sql` | ✅ **FIXED** | Revokes authenticated, service_role only |
| Nov 8 | `20251108_security_hardening_v2.sql` | ✅ **FIXED** | Reinforces fix |
| Nov 9 | `20251109_final_fix_add_user_points.sql` | ✅ **SECURE** | Adds system operation flag |
| Nov 21 | `20251121_fix_points_escalation.sql` | ✅ **ENFORCEMENT** | Ensures fix applied |

### Was the Vulnerability Fixed?

**YES, IF** you applied migrations after `20251108_security_hardening.sql`

Migration order (alphabetically):
1. `20251108_harden_points_functions.sql` ← 🔴 Grants to authenticated (VULNERABLE)
2. `20251108_security_hardening.sql` ← ✅ Revokes authenticated (FIXED)
3. `20251108_security_hardening_v2.sql` ← ✅ Reinforces fix

Since `security_hardening.sql` runs **AFTER** `harden_points_functions.sql` alphabetically, the fix was applied in the same migration batch.

### Current Status

**If you applied all Nov 8 migrations:** ✅ **SECURE**  
**If you only applied some Nov 8 migrations:** 🔴 **CHECK IMMEDIATELY**

---

## 🔍 HOW TO VERIFY

### Quick SQL Check (30 seconds)

Run this in Supabase SQL Editor:
```sql
SELECT 
  p.proname as function_name,
  array_agg(
    pg_catalog.pg_get_userbyid(acl.grantee) || ': ' || acl.privilege_type
  ) as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN LATERAL (
  SELECT 
    (aclexplode(p.proacl)).grantee,
    (aclexplode(p.proacl)).privilege_type
) acl ON true
WHERE n.nspname = 'public' 
  AND p.proname = 'add_user_points'
GROUP BY p.proname;
```

**Expected result (SECURE):**
```
function_name   | permissions
----------------|------------------
add_user_points | {postgres: EXECUTE, service_role: EXECUTE}
```

**Vulnerable result (URGENT FIX NEEDED):**
```
function_name   | permissions
----------------|------------------
add_user_points | {postgres: EXECUTE, authenticated: EXECUTE, service_role: EXECUTE}
                  ^^^^^^^^^^^^^^^^^^^^^ THIS IS THE VULNERABILITY!
```

### Function Body Check
```sql
SELECT pg_get_functiondef(p.oid) 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'add_user_points';
```

**Should contain:**
```sql
IF v_caller_role != 'service_role' AND COALESCE(v_is_system_op, 'false') != 'true' THEN
  RAISE EXCEPTION 'Permission denied: only backend can modify points';
END IF;
```

**Should NOT contain (vulnerable version):**
```sql
IF v_auth <> p_user_id THEN
  RETURN jsonb_build_object('success', false, 'message', 'Cannot modify another user');
END IF;
```

---

## 🛡️ COMPREHENSIVE FIX

### Option 1: Apply Enforcement Migration (Recommended)
```bash
# Apply the comprehensive fix
# File: supabase/migrations/20251121_fix_points_escalation.sql
```

This migration:
1. ✅ Revokes ALL permissions from authenticated/anon/public
2. ✅ Grants ONLY to service_role
3. ✅ Updates function with stricter role checking
4. ✅ Ensures wrapper functions exist for user actions
5. ✅ Validates amount limits (max 10,000)
6. ✅ Prevents negative balance
7. ✅ Logs all security fixes

### Option 2: Manual Fix (Quick)
```sql
-- Run this immediately if vulnerable:
REVOKE ALL ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM authenticated;
REVOKE ALL ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) TO service_role;
```

---

## 📈 IMPACT ASSESSMENT

### If Exploited

#### Business Impact
- 💰 **Economic:** Users could bypass point purchases (lost revenue)
- 🏆 **Gamification:** Leaderboards become meaningless
- ⚖️ **Fairness:** Legitimate users disadvantaged
- 🔒 **Trust:** Platform integrity compromised

#### Technical Impact
- 📊 **Data Integrity:** Point balances corrupted
- 🚨 **Detection:** Hard to distinguish legitimate vs. fake points
- 🔄 **Recovery:** Would need point balance audit & rollback
- 📜 **Audit Trail:** `point_transactions` table would show suspicious patterns

### Detection Indicators
```sql
-- Find suspicious point additions (self-awarded)
SELECT 
  user_id,
  COUNT(*) as transaction_count,
  SUM(change) as total_points_added,
  array_agg(DISTINCT reason) as reasons
FROM point_transactions
WHERE change > 0
  AND reason NOT IN ('referral_bonus', 'achievement_claimed', 'reservation_completed')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
HAVING COUNT(*) > 20 OR SUM(change) > 10000
ORDER BY total_points_added DESC;
```

---

## 🔐 SECURITY BEST PRACTICES

### ❌ WRONG: Direct User Access to Points Functions
```sql
-- NEVER DO THIS:
GRANT EXECUTE ON FUNCTION add_user_points TO authenticated;
```

### ✅ CORRECT: Wrapper Pattern
```sql
-- Points functions: service_role ONLY
REVOKE ALL ON FUNCTION add_user_points FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_user_points TO service_role;

-- User-facing wrapper with validation
CREATE FUNCTION claim_achievement(achievement_id TEXT)
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Verify user's identity
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  
  -- 2. Validate business logic (already unlocked? already claimed?)
  IF is_already_claimed(auth.uid(), achievement_id) THEN
    RAISE EXCEPTION 'Already claimed';
  END IF;
  
  -- 3. Call privileged function (works because SECURITY DEFINER)
  PERFORM add_user_points(auth.uid(), 100, 'achievement');
END;
$$;

-- Users can ONLY call the wrapper
GRANT EXECUTE ON FUNCTION claim_achievement TO authenticated;
```

### Security Layers
1. **Permission Layer:** Revoke direct access from users
2. **Validation Layer:** Wrapper functions verify eligibility
3. **Execution Layer:** SECURITY DEFINER to call privileged functions
4. **Audit Layer:** Log all point transactions with metadata

---

## 📝 RECOMMENDATIONS

### Immediate (Critical)
1. ✅ **Verify** current function permissions (run SQL check above)
2. ✅ **Apply** enforcement migration if vulnerable
3. ✅ **Audit** point_transactions table for suspicious activity
4. ✅ **Monitor** for unusual point balance spikes

### Short-term (Important)
1. 🔍 **Review** ALL functions granted to authenticated role
2. 🧪 **Test** that user-facing features still work (claim achievements, etc.)
3. 📊 **Implement** rate limiting on point-related operations
4. 🚨 **Set up** alerts for rapid point accumulation

### Long-term (Strategic)
1. 📚 **Document** security patterns for future functions
2. 🧪 **Create** security test suite (try to exploit functions)
3. 👥 **Train** team on SECURITY DEFINER best practices
4. 🔄 **Schedule** quarterly security audits

---

## 🔗 RELATED SECURITY ISSUES

### Other Functions to Audit
```sql
-- Find all functions granted to authenticated
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE has_function_privilege('authenticated', p.oid, 'execute')
  AND n.nspname = 'public'
  AND p.proname LIKE '%point%'
ORDER BY p.proname;
```

### Similar Patterns to Fix
- `deduct_user_points` - Same vulnerability if granted to authenticated
- `transfer_points` - Could allow unauthorized transfers
- `add_partner_points` - Partner self-escalation risk
- Any function that modifies balances/currency/credits

---

## 📅 TIMELINE

- **Nov 8, 2025 (AM):** Vulnerable function created (`harden_points_functions.sql`)
- **Nov 8, 2025 (PM):** Fix applied (`security_hardening.sql`)
- **Nov 9, 2025:** Additional security (`final_fix_add_user_points.sql`)
- **Nov 21, 2025:** Vulnerability rediscovered during audit
- **Nov 21, 2025:** Enforcement migration created
- **Status:** ✅ **LIKELY FIXED** (if all Nov 8 migrations applied)

---

## 📞 ACTION REQUIRED

### For Database Administrators
1. Run verification SQL immediately
2. Apply enforcement migration if vulnerable
3. Audit recent point transactions
4. Report findings to security team

### For Developers
1. Review this document
2. Understand SECURITY DEFINER pattern
3. Apply pattern to future functions
4. Never grant direct access to balance-modifying functions

### For Security Team
1. Assess blast radius (how many users affected?)
2. Check logs for exploitation attempts
3. Consider point balance rollback if exploited
4. Update security guidelines

---

**Report Generated:** November 21, 2025  
**Severity:** CRITICAL  
**Requires Immediate Action:** YES (if vulnerable)  
**Estimated Fix Time:** 5 minutes  
**Verification Method:** SQL query (30 seconds)
