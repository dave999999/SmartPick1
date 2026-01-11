# 🔧 FIX: Achievement Claim Error (404 Not Found)

**Date**: January 8, 2026  
**Error**: `POST /rest/v1/rpc/claim_achievement 404 (Not Found)`  
**Cause**: Function signature mismatch between frontend and database

---

## 🐛 Problem

### Error Message
```
PGRST202: Could not find the function public.claim_achievement(p_achievement_id) in the schema cache
Hint: Perhaps you meant to call public.claim_achievement(p_achievement_id, p_points_reward, p_user_id)
```

### Root Cause
A recent migration ([20251225_fix_function_search_path_warnings.sql](supabase/migrations/20251225_fix_function_search_path_warnings.sql#L332)) changed the function signature:

**Frontend expects**:
```typescript
// src/lib/gamification-api.ts:204
supabase.rpc('claim_achievement', { p_achievement_id: achievementId })
```

**Database has**:
```sql
-- Requires 3 parameters
CREATE FUNCTION claim_achievement(
  p_user_id UUID,
  p_achievement_id TEXT,
  p_points_reward INT
)
```

**Mismatch**: Frontend passes 1 parameter, database expects 3.

---

## ✅ Solution

Restore the single-parameter version that uses `auth.uid()` for security:

### File Created
**[FIX_CLAIM_ACHIEVEMENT_SIGNATURE.sql](FIX_CLAIM_ACHIEVEMENT_SIGNATURE.sql)**

This script:
1. Drops the 3-parameter version
2. Restores the TEXT-only version: `claim_achievement(p_achievement_id TEXT)`
3. Uses `auth.uid()` to get the current user (secure)
4. Sets `app.is_system_operation` flag for points
5. Grants permission to `authenticated` role

---

## 🚀 How to Apply

### Step 1: Run SQL Script
```bash
# 1. Open Supabase Dashboard → SQL Editor
# 2. Paste contents of FIX_CLAIM_ACHIEVEMENT_SIGNATURE.sql
# 3. Click "Run"
# 4. Wait 5 seconds
# 5. Verify success message
```

### Step 2: Test Achievement Claim
```bash
# 1. Open your app
# 2. Navigate to Achievements tab
# 3. Click "Claim" on an unlocked achievement
# 4. Should see: "+50 points! 🎉" (no error)
```

---

## 🔍 Technical Details

### Function Signature (Restored)
```sql
CREATE FUNCTION claim_achievement(p_achievement_id TEXT)
RETURNS JSONB
```

### Security
- Uses `auth.uid()` to get current user ID
- Users can **only** claim their own achievements
- Auto-checks achievements before claiming (unlocks if eligible)
- Sets system flag to allow `add_user_points` call

### Return Value
```json
{
  "success": true,
  "awarded_now": true,
  "reward_points": 50,
  "balance": "150"
}
```

### Workflow
1. User clicks "Claim" button
2. Frontend calls: `claim_achievement({ p_achievement_id: 'first_order' })`
3. Function checks: Is user authenticated?
4. Function runs: `check_user_achievements(auth.uid())` (auto-unlock)
5. Function checks: Is achievement unlocked? Already claimed?
6. Function awards points: `add_user_points(user_id, 50, 'achievement', {...})`
7. Function marks claimed: `UPDATE user_achievements SET reward_claimed = true`
8. Returns success + new balance

---

## 📊 Why This Happened

### Timeline
1. **Original**: `claim_achievement(p_achievement_id TEXT)` ✅ Working
2. **Dec 25**: Migration to fix search_path warnings
3. **Migration changed signature** to 3 parameters for consistency
4. **Frontend not updated** to pass all 3 parameters
5. **Result**: 404 error when claiming

### Why 3 Parameters Was Wrong
```sql
-- This requires frontend to pass user_id and points_reward:
claim_achievement(p_user_id UUID, p_achievement_id TEXT, p_points_reward INT)

-- Problem 1: Frontend doesn't know user_id (it's in auth context)
-- Problem 2: Frontend doesn't know points_reward (it's in achievement_definitions)
-- Problem 3: Security risk - frontend could pass ANY user_id
```

### Why 1 Parameter Is Correct
```sql
-- This uses auth.uid() for security:
claim_achievement(p_achievement_id TEXT)

-- Benefit 1: User ID comes from auth context (secure)
-- Benefit 2: Points come from achievement_definitions (consistent)
-- Benefit 3: Frontend only passes achievement ID (simple)
```

---

## ✅ Verification

After running the fix, verify:

```sql
-- Check function signature
SELECT 
  routine_name,
  data_type as return_type,
  string_agg(parameter_name || ' ' || data_type, ', ') as parameters
FROM information_schema.routines
LEFT JOIN information_schema.parameters USING (specific_name)
WHERE routine_schema = 'public'
  AND routine_name = 'claim_achievement'
GROUP BY routine_name, data_type;
```

**Expected output:**
| routine_name | return_type | parameters |
|--------------|-------------|------------|
| claim_achievement | jsonb | p_achievement_id text |

---

## 🎯 Expected Behavior After Fix

### In Browser Console (Before Fix)
```
❌ POST /rest/v1/rpc/claim_achievement 404 (Not Found)
❌ RPC error claiming achievement: [object Object]
❌ Could not find function claim_achievement(p_achievement_id)
```

### In Browser Console (After Fix)
```
✅ Claiming achievement: first_order
✅ Claim successful: { success: true, awarded_now: true, reward_points: 50 }
🎉 +50 points!
```

### In UI (Before Fix)
- Click "Claim" button
- No feedback (error in console)
- Achievement stays "unclaimed"
- Points not awarded

### In UI (After Fix)
- Click "Claim" button
- Toast shows: "+50 points! 🎉"
- Achievement shows "✓ Claimed"
- Points added to balance
- Achievement counter updates

---

## 📝 Summary

**Status**: ✅ **READY TO APPLY**  
**Risk**: 🟢 **LOW** (Restores previous working version)  
**Testing**: ⚠️ **REQUIRED** (Test claim in browser after applying)  
**Rollback**: Easy (previous version in git history)

**Next Steps**:
1. Run [FIX_CLAIM_ACHIEVEMENT_SIGNATURE.sql](FIX_CLAIM_ACHIEVEMENT_SIGNATURE.sql) in Supabase
2. Test achievement claim in browser
3. Verify no 404 errors in console
4. Verify points are awarded correctly
