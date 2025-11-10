# 🔒 Security Testing Checklist
## SmartPick.ge - Penetration Testing Guide

Use this checklist to validate security implementations and test for common vulnerabilities.

## 🔐 Authentication Testing

### ✅ Password Security
- [ ] Test password minimum length (12 characters)
- [ ] Test password complexity requirements
- [ ] Try common weak passwords (should fail)
- [ ] Test maximum password length (128+ characters)
- [ ] Verify password is not visible in network logs
- [ ] Test password reset flow

### ✅ CAPTCHA Testing
- [ ] Verify CAPTCHA appears on signup
- [ ] Verify CAPTCHA appears on signin
- [ ] Try submitting form without solving CAPTCHA (should fail)
- [ ] Verify CAPTCHA token expires after use
- [ ] Test CAPTCHA on multiple failed login attempts

### ✅ Rate Limiting
- [ ] Make 6 login attempts rapidly (should block after 5)
- [ ] Wait 15 minutes and try again (should work)
- [ ] Make 4 signup attempts in one hour (should block after 3)
- [ ] Try bypassing by clearing localStorage (document if works)
- [ ] Test from incognito mode (document if works)

### ✅ Session Management
- [ ] Verify session persists after browser close
- [ ] Test session timeout (should logout after inactivity)
- [ ] Verify token refresh works
- [ ] Try using expired session token (should fail)
- [ ] Test logout clears all session data

## 🗄️ Database Security Testing

### ✅ Row-Level Security (RLS)
```sql
-- Test as regular user
SELECT * FROM users WHERE role = 'ADMIN'; -- Should return empty
UPDATE users SET role = 'ADMIN' WHERE id = auth.uid(); -- Should fail
UPDATE offers SET partner_id = 'OTHER_PARTNER_ID' WHERE id = 'OFFER_ID'; -- Should fail
SELECT * FROM reservations WHERE customer_id != auth.uid(); -- Should return empty
```

### ✅ SQL Injection Testing
Test these inputs in all form fields:
```
' OR '1'='1
'; DROP TABLE users; --
<script>alert('XSS')</script>
../../etc/passwd
${7*7}
{{7*7}}
```

Expected: All should be safely escaped or rejected.

### ✅ Points System Security
- [ ] Try calling `add_user_points` from browser console (should fail)
- [ ] Try modifying points via direct database query (should fail without service role)
- [ ] Create reservation and verify points deducted
- [ ] Cancel reservation and verify points refunded correctly
- [ ] Try creating reservation with insufficient points (should fail)

## 🌐 API Security Testing

### ✅ Authorization Testing
Test unauthorized access:
```bash
# Try accessing partner endpoints as customer
GET /api/partner/offers
GET /api/admin/partners

# Try modifying other users' data
POST /api/reservations (with other user's customer_id)
PUT /api/offers/:id (for offer you don't own)
DELETE /api/partners/:id (as non-admin)
```

### ✅ Input Validation
Test boundary conditions:
```json
{
  "title": "A", // Too short (min 3)
  "title": "A".repeat(200), // Too long
  "smart_price": -10, // Negative
  "smart_price": 999999999, // Too large
  "quantity": 0, // Zero
  "quantity": -5, // Negative
  "description": "<script>alert('xss')</script>", // XSS
  "email": "notanemail", // Invalid format
  "phone": "abc123", // Invalid format
}
```

### ✅ File Upload Security
- [ ] Try uploading .exe file (should reject)
- [ ] Try uploading file > 5MB (should reject)
- [ ] Try uploading .php file renamed to .jpg (should reject)
- [ ] Upload valid image (should succeed)
- [ ] Try uploading as customer (should fail - partners only)
- [ ] Verify uploaded files are not executable

## 🔓 XSS Testing

Test in all text input fields:
```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg onload=alert('XSS')>
javascript:alert('XSS')
<iframe src="javascript:alert('XSS')">
```

Check these locations:
- [ ] Offer title
- [ ] Offer description
- [ ] Partner name
- [ ] User profile name
- [ ] Comments/reviews
- [ ] Search query

## 🚫 CSRF Testing

Test state-changing operations without proper tokens:
```bash
# Try creating offer from external site
curl -X POST https://smartpick.ge/api/offers \
  -H "Cookie: session=..." \
  -d '{"title":"Test"}'

# Try deleting reservation
curl -X DELETE https://smartpick.ge/api/reservations/123 \
  -H "Cookie: session=..."
```

## 🔐 Sensitive Data Exposure

### ✅ Check Network Traffic
Using browser DevTools:
- [ ] Verify HTTPS on all requests
- [ ] Check for passwords in request URLs
- [ ] Check for tokens in request URLs
- [ ] Verify sensitive data not in error messages
- [ ] Check for API keys in responses

### ✅ Check Browser Storage
```javascript
// Check localStorage
console.log(localStorage);

// Check sessionStorage
console.log(sessionStorage);

// Check cookies
console.log(document.cookie);
```

Should NOT contain:
- Passwords
- Service role keys
- Unencrypted sensitive data

## 🎭 Business Logic Testing

### ✅ Reservation System
- [ ] Try creating > 3 quantity (should fail)
- [ ] Try creating > 1 active reservation (should fail)
- [ ] Try reserving expired offer (should fail)
- [ ] Try reserving sold out offer (should fail)
- [ ] Cancel reservation and verify quantity restored
- [ ] Try using someone else's QR code (should fail)

### ✅ Partner System
- [ ] Try creating offer as pending partner (should fail)
- [ ] Try creating > max slots offers (should fail)
- [ ] Try setting price higher than original (should fail)
- [ ] Try creating offer in the past (should fail)
- [ ] Try scanning QR code for wrong partner (should fail)

### ✅ Points System
- [ ] Try spending more points than balance (should fail)
- [ ] Create and cancel reservation rapidly (race condition test)
- [ ] Try claiming same achievement twice (should fail)
- [ ] Try using invalid referral code (should fail gracefully)
- [ ] Verify points transaction history accuracy

## 🔒 Admin Security

### ✅ Admin Access Control
- [ ] Try accessing /admin as customer (should redirect)
- [ ] Try accessing /admin as partner (should redirect)
- [ ] Verify admin can see all data
- [ ] Verify admin actions are logged
- [ ] Try escalating privileges as non-admin (should fail)

### ✅ Admin Operations
- [ ] Approve partner application
- [ ] Reject partner application
- [ ] Adjust user points
- [ ] Delete offer
- [ ] Ban user
- Verify each creates audit log entry

## 📱 Client-Side Security

### ✅ Browser Security
- [ ] Check Content-Security-Policy header
- [ ] Check X-Frame-Options header
- [ ] Check X-Content-Type-Options header
- [ ] Verify HSTS header (Strict-Transport-Security)
- [ ] Test subresource integrity for CDN resources

### ✅ Service Worker
- [ ] Verify no sensitive data cached
- [ ] Test cache invalidation on logout
- [ ] Verify service worker updates properly

## 🌐 Infrastructure Security

### ✅ DNS and SSL
```bash
# Check SSL certificate
openssl s_client -connect smartpick.ge:443 -servername smartpick.ge

# Check DNS records
dig smartpick.ge

# Check security headers
curl -I https://smartpick.ge
```

### ✅ Subdomain Takeover
- [ ] Check for dangling DNS records
- [ ] Verify Vercel domain ownership
- [ ] Test for subdomain enumeration

## 🐛 Fuzzing Tests

### Automated Testing Tools
```bash
# Install tools
npm install -g zap-cli sqlmap

# Run OWASP ZAP scan
zap-cli quick-scan https://smartpick.ge

# Test SQLi (be careful - only test on your own site)
sqlmap -u "https://smartpick.ge/api/offers?category=BAKERY" --batch

# Directory enumeration
dirsearch -u https://smartpick.ge -e *

# Subdomain enumeration  
subfinder -d smartpick.ge
```

## 📊 Testing Scorecard

| Category | Tests Passed | Tests Failed | Risk Level |
|----------|--------------|--------------|------------|
| Authentication | __/10 | __/10 | High |
| Authorization | __/8 | __/8 | Critical |
| Input Validation | __/12 | __/12 | High |
| XSS Prevention | __/6 | __/6 | High |
| SQL Injection | __/5 | __/5 | Critical |
| CSRF Protection | __/4 | __/4 | Medium |
| Session Management | __/6 | __/6 | High |
| API Security | __/8 | __/8 | High |
| File Uploads | __/6 | __/6 | Medium |
| Business Logic | __/10 | __/10 | High |

**Total Score: ___/75**

## 🚨 Vulnerability Reporting

If you discover a vulnerability:

1. **Do NOT** publicly disclose it
2. Email security team immediately
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

## 📝 Testing Log Template

```markdown
## Test Session: [Date]
Tester: [Name]
Duration: [Time]

### Tests Completed:
- [x] Test name - PASS
- [ ] Test name - FAIL (details...)

### Vulnerabilities Found:
1. **[Severity]** Description
   - Location: 
   - Impact:
   - Recommendation:

### Notes:
[Additional observations]
```

---

**Last Updated:** November 10, 2025  
**Next Review:** After critical fixes implemented
