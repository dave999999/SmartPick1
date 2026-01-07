# Rate Limit Configuration Report
**Generated:** January 8, 2026  
**Location:** `supabase/functions/rate-limit/index.ts`

## Overview
All rate limits are enforced server-side via Supabase Edge Function with automatic 48-hour cleanup.

---

## Rate Limit Rules

### 1. **Login** 🔐
- **Limit:** 5 attempts
- **Window:** 15 minutes (900 seconds)
- **Cooldown:** 15 minutes after 5th attempt
- **Purpose:** Prevent brute force password attacks
- **Used in:** Login page, authentication flows

---

### 2. **Signup** 📝
- **Limit:** 3 attempts
- **Window:** 1 hour (3,600 seconds)
- **Cooldown:** 1 hour after 3rd attempt
- **Purpose:** Prevent spam account creation
- **Used in:** Registration page, user signup flow

---

### 3. **Reservation** 🎫
- **Limit:** 10 attempts
- **Window:** 1 hour (3,600 seconds)
- **Cooldown:** 1 hour after 10th attempt
- **Purpose:** Prevent spam reservations, bot abuse
- **Used in:** ReserveOffer page, reservation creation
- **Note:** This is the one causing your current testing issues

---

### 4. **Offer Create** ➕
- **Limit:** 20 attempts
- **Window:** 1 hour (3,600 seconds)
- **Cooldown:** 1 hour after 20th attempt
- **Purpose:** Prevent spam offer posting by partners
- **Used in:** Partner dashboard, offer creation

---

### 5. **Offer Delete** 🗑️
- **Limit:** 30 attempts
- **Window:** 1 hour (3,600 seconds)
- **Cooldown:** 1 hour after 30th attempt
- **Purpose:** Prevent abuse of deletion operations
- **Used in:** Partner dashboard, offer management

---

### 6. **Partner Application** 🤝
- **Limit:** 3 attempts
- **Window:** 24 hours (86,400 seconds)
- **Cooldown:** 24 hours after 3rd attempt
- **Purpose:** Prevent spam partner applications
- **Used in:** Partner application form

---

### 7. **Admin Action** ⚙️
- **Limit:** 100 attempts
- **Window:** 1 hour (3,600 seconds)
- **Cooldown:** 1 hour after 100th attempt
- **Purpose:** High limit for admin operations
- **Used in:** Admin dashboard actions

---

## Additional Client-Side Rate Limits

### Contact Form (Client-Only)
- **Limit:** 3 attempts per 10 minutes
- **Storage:** LocalStorage only (not server-enforced)
- **Location:** `src/pages/Contact.tsx`

---

## Automatic Cleanup

### Database Cleanup
- **Frequency:** Every request (opportunistic)
- **Retention:** 48 hours
- **Table:** `rate_limits`
- **Old Setting:** 30 days ❌
- **New Setting:** 48 hours ✅

### Why 48 Hours?
- Longest rate limit window is 24 hours (partner_application)
- 48 hours = 2x longest window (safety buffer)
- Prevents database bloat while keeping debug history

---

## Testing Recommendations

### During Development:
1. **Quick Reset:** Run `DELETE FROM rate_limits WHERE identifier = 'your-user-id';`
2. **Full Reset:** Run `DELETE FROM rate_limits;` (clears all users)
3. **Check Status:** Use [CHECK_RATE_LIMITS_NOW.sql](CHECK_RATE_LIMITS_NOW.sql)

### For Production:
- No manual cleanup needed - automatic 48h cleanup handles it
- Monitor `rate_limits` table size occasionally
- Consider adding pg_cron for scheduled cleanup (optional)

---

## Rate Limit Bypasses

### Fail-Open Strategy
If rate limit service is down, requests are **allowed** to prevent blocking legitimate users:
- Database errors → Allow
- Network errors → Allow  
- Edge function down → Allow

### Where It Fails Open:
- `checkServerRateLimit()` returns `{ allowed: true, remaining: 99 }` on errors
- Ensures service disruptions don't block users

---

## Current Issue (Your Testing)

### Reservation Rate Limit
- **Hit:** 10 reservations in 1 hour
- **Your Activity:** 10+ test reservations between 19:19-19:46 today
- **Additional:** 3 reservations from 12 hours ago (23:54-00:38 yesterday)
- **Solution:** Run [DELETE_ALL_OLD_RESERVATIONS.sql](DELETE_ALL_OLD_RESERVATIONS.sql)

### Why Old Records Still There?
- Old cleanup: 30 days retention
- New cleanup: 48 hours retention (just fixed)
- Records from 12 hours ago are < 48 hours → still valid

---

## Production Deployment Checklist

- [x] Edge Function updated to 48-hour cleanup
- [ ] Deploy Edge Function: `cd supabase/functions && npx supabase functions deploy rate-limit`
- [ ] Clear test data: Run `DELETE FROM rate_limits;`
- [ ] Test rate limits work correctly
- [ ] Monitor rate_limits table size for first week

---

## Implementation Files

1. **Server-Side:** [supabase/functions/rate-limit/index.ts](supabase/functions/rate-limit/index.ts)
2. **Client-Side:** [src/lib/rateLimiter-server.ts](src/lib/rateLimiter-server.ts)
3. **Database Table:** `rate_limits` (id, key, action, identifier, ip_address, created_at)
4. **Cleanup Script:** [DELETE_ALL_OLD_RESERVATIONS.sql](DELETE_ALL_OLD_RESERVATIONS.sql)
5. **Check Script:** [CHECK_RATE_LIMITS_NOW.sql](CHECK_RATE_LIMITS_NOW.sql)

---

## Summary Table

| Action | Limit | Window | Cooldown | Severity |
|--------|-------|--------|----------|----------|
| Login | 5 | 15 min | 15 min | 🔴 High |
| Signup | 3 | 1 hour | 1 hour | 🔴 High |
| Reservation | 10 | 1 hour | 1 hour | 🟡 Medium |
| Offer Create | 20 | 1 hour | 1 hour | 🟡 Medium |
| Offer Delete | 30 | 1 hour | 1 hour | 🟢 Low |
| Partner App | 3 | 24 hours | 24 hours | 🔴 High |
| Admin Action | 100 | 1 hour | 1 hour | 🟢 Low |

**Note:** Severity indicates how restrictive the limit is for normal users.
