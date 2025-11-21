# ✅ Email Verification System - Deployment Checklist

## 📋 Pre-Deployment Checklist

### 1️⃣ Database Setup
- [ ] Open Supabase SQL Editor: `https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/sql`
- [ ] Copy contents of `supabase/migrations/20251121_email_verification_system.sql`
- [ ] Run migration in SQL Editor
- [ ] Verify tables created:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('email_verification_tokens', 'password_reset_tokens', 'email_rate_limits');
  ```
- [ ] Verify `users.is_email_verified` column exists:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'users' AND column_name = 'is_email_verified';
  ```

### 2️⃣ Resend Configuration
- [ ] Sign up at [resend.com](https://resend.com) (if not already)
- [ ] Go to [resend.com/domains](https://resend.com/domains)
- [ ] Click "Add Domain"
- [ ] Enter domain: `smartpick.ge`
- [ ] Add DNS records provided by Resend:
  - TXT record for verification
  - MX, SPF, DKIM records for deliverability
- [ ] Wait for verification (usually 5-10 minutes)
- [ ] Verify status shows ✅ "Verified"
- [ ] Go to [resend.com/api-keys](https://resend.com/api-keys)
- [ ] Confirm API key: `***REMOVED_API_KEY***`
- [ ] Test API key:
  ```powershell
  curl -X POST https://api.resend.com/emails `
    -H "Authorization: Bearer ***REMOVED_API_KEY***" `
    -H "Content-Type: application/json" `
    -d '{"from":"no-reply@smartpick.ge","to":"your@email.com","subject":"Test","html":"<p>Test</p>"}'
  ```

### 3️⃣ Edge Functions Deployment
- [ ] Install Supabase CLI (if not installed):
  ```powershell
  npm install -g supabase
  ```
- [ ] Login to Supabase:
  ```powershell
  supabase login
  ```
- [ ] Link to SmartPick project:
  ```powershell
  supabase link --project-ref ggzhtpaxnhwcilomswtm
  ```
- [ ] Deploy verify-email function:
  ```powershell
  supabase functions deploy verify-email
  ```
- [ ] Deploy password-reset function:
  ```powershell
  supabase functions deploy password-reset
  ```
- [ ] Verify deployment in Supabase Dashboard:
  - Go to: `https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/functions`
  - Check both functions show "Active" status
- [ ] Test Edge Function URLs:
  - Verify: `https://ggzhtpaxnhwcilomswtm.supabase.co/functions/v1/verify-email`
  - Reset: `https://ggzhtpaxnhwcilomswtm.supabase.co/functions/v1/password-reset`

### 4️⃣ Environment Variables

#### Local Development (.env.local)
- [ ] Open `.env.local` file
- [ ] Add these variables:
  ```env
  VITE_RESEND_API_KEY=***REMOVED_API_KEY***
  RESEND_FROM_EMAIL=no-reply@smartpick.ge
  VITE_PUBLIC_BASE_URL=http://localhost:5173
  ```
- [ ] Save file
- [ ] Restart dev server

#### Production (Vercel/Netlify/etc.)
- [ ] Go to hosting provider dashboard
- [ ] Add environment variables:
  | Variable | Value |
  |----------|-------|
  | `VITE_RESEND_API_KEY` | `***REMOVED_API_KEY***` |
  | `RESEND_FROM_EMAIL` | `no-reply@smartpick.ge` |
  | `VITE_PUBLIC_BASE_URL` | `https://www.smartpick.ge` |
- [ ] Redeploy application
- [ ] Verify environment variables are loaded

### 5️⃣ Dependencies
- [x] ✅ `crypto-js` installed
- [x] ✅ `@types/crypto-js` installed
- [ ] Verify in `package.json`:
  ```json
  "dependencies": {
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "@types/crypto-js": "^4.2.2"
  }
  ```

### 6️⃣ Code Integration

#### Update Signup Component
- [ ] Find your signup component (e.g., `src/components/Auth.tsx`)
- [ ] Add import:
  ```typescript
  import { sendVerificationEmail } from '@/lib/api/email-verification';
  import { useNavigate } from 'react-router-dom';
  ```
- [ ] After successful signup, add:
  ```typescript
  if (data.user) {
    await sendVerificationEmail(data.user.id, email, fullName);
    navigate('/verify-requested');
  }
  ```

#### Update Login Component
- [ ] Find your login component
- [ ] Add "Forgot Password" link:
  ```tsx
  <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
    Forgot password?
  </Link>
  ```

#### Update Profile Component (Optional)
- [ ] Show email verification status
- [ ] Add "Resend Verification" button if not verified

---

## 🧪 Testing Checklist

### Test 1: Email Verification Flow
- [ ] Create a new account with real email address
- [ ] Check inbox (and spam folder) for verification email
- [ ] Email should:
  - [ ] Come from `no-reply@smartpick.ge`
  - [ ] Have subject: "🎉 Verify Your Email - SmartPick"
  - [ ] Have green gradient design
  - [ ] Have "Verify Email Address" button
  - [ ] Show 30-minute expiry warning
- [ ] Click verification button
- [ ] Should redirect to `/verify-email?token=XXX`
- [ ] Should see loading spinner → success message
- [ ] Check database:
  ```sql
  SELECT is_email_verified FROM users WHERE email = 'your@email.com';
  -- Should return: true
  ```
- [ ] Check token was marked as used:
  ```sql
  SELECT used_at FROM email_verification_tokens WHERE user_id = 'USER_ID';
  -- Should have timestamp
  ```

### Test 2: Password Reset Flow
- [ ] Go to login page
- [ ] Click "Forgot password?" link
- [ ] Should redirect to `/forgot-password`
- [ ] Enter your email address
- [ ] Click "Send Reset Link"
- [ ] Check inbox for password reset email
- [ ] Email should:
  - [ ] Come from `no-reply@smartpick.ge`
  - [ ] Have subject: "🔐 Reset Your Password - SmartPick"
  - [ ] Have orange gradient design
  - [ ] Have "Reset Password" button
  - [ ] Show security warning
- [ ] Click reset button
- [ ] Should redirect to `/reset-password?token=XXX`
- [ ] Enter new password (min 6 characters)
- [ ] Re-enter to confirm
- [ ] Click "Reset Password"
- [ ] Should see success message
- [ ] Should auto-redirect to login after 3 seconds
- [ ] Try logging in with new password
- [ ] Login should succeed

### Test 3: Rate Limiting
- [ ] Go to signup page
- [ ] Create 3 test accounts rapidly with same email domain
- [ ] Each should receive verification email
- [ ] Try creating 4th account
- [ ] Should see error: "Rate limit exceeded. Please try again in 15 minutes."
- [ ] Verify in database:
  ```sql
  SELECT * FROM email_rate_limits WHERE email = 'test@example.com';
  -- Should show attempts = 3
  ```
- [ ] Wait 15 minutes OR manually reset:
  ```sql
  DELETE FROM email_rate_limits WHERE email = 'test@example.com';
  ```

### Test 4: Token Expiration
- [ ] Create account
- [ ] Get verification email
- [ ] **DO NOT** click link immediately
- [ ] Wait 31 minutes
- [ ] Click verification link
- [ ] Should see error: "Verification token has expired. Please request a new one."

### Test 5: Invalid Token
- [ ] Go to: `/verify-email?token=invalid_token_12345`
- [ ] Should see error: "Invalid or expired verification token"

### Test 6: Duplicate Token Use
- [ ] Create account
- [ ] Click verification link (should work first time)
- [ ] Click same verification link again
- [ ] Should see error: "Invalid or expired verification token"
- [ ] Token should have `used_at` timestamp in database

### Test 7: Email Deliverability
- [ ] Send test emails to different providers:
  - [ ] Gmail
  - [ ] Outlook
  - [ ] Yahoo
  - [ ] Corporate email
- [ ] Check if emails land in inbox (not spam)
- [ ] Check if HTML renders correctly
- [ ] Check if buttons work
- [ ] Test on mobile email clients

### Test 8: Mobile Responsiveness
- [ ] Open `/verify-email` on mobile
- [ ] Should be fully responsive
- [ ] Open `/reset-password` on mobile
- [ ] Should be fully responsive
- [ ] Open `/forgot-password` on mobile
- [ ] Should be fully responsive

---

## 🔍 Post-Deployment Verification

### Database Health
- [ ] Check table sizes:
  ```sql
  SELECT 
    'email_verification_tokens' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE used_at IS NULL) as unused_tokens,
    COUNT(*) FILTER (WHERE expires_at < NOW() AND used_at IS NULL) as expired_tokens
  FROM email_verification_tokens
  UNION ALL
  SELECT 
    'password_reset_tokens',
    COUNT(*),
    COUNT(*) FILTER (WHERE used_at IS NULL),
    COUNT(*) FILTER (WHERE expires_at < NOW() AND used_at IS NULL)
  FROM password_reset_tokens;
  ```

### Email Delivery Stats (Resend Dashboard)
- [ ] Go to [resend.com/emails](https://resend.com/emails)
- [ ] Check delivery rate (should be >95%)
- [ ] Check bounce rate (should be <5%)
- [ ] Check recent sends for errors

### Edge Function Health
- [ ] Go to Supabase Dashboard → Edge Functions
- [ ] Check invocation count
- [ ] Check error rate (should be <5%)
- [ ] Review recent logs for any issues

### User Verification Rate
- [ ] Check how many users have verified:
  ```sql
  SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN is_email_verified THEN 1 ELSE 0 END) as verified_users,
    ROUND(100.0 * SUM(CASE WHEN is_email_verified THEN 1 ELSE 0 END) / COUNT(*), 2) as verification_rate_percent
  FROM users;
  ```

---

## 🛡️ Security Verification

- [ ] Verify RLS policies are active:
  ```sql
  SELECT tablename, policyname, cmd, permissive, roles, qual 
  FROM pg_policies 
  WHERE tablename IN ('email_verification_tokens', 'password_reset_tokens', 'email_rate_limits');
  ```
- [ ] Test that users can't see other users' tokens
- [ ] Test that expired tokens are rejected
- [ ] Test that used tokens are rejected
- [ ] Test rate limiting works correctly
- [ ] Test that password reset doesn't reveal if email exists

---

## 🔧 Maintenance Setup

### Schedule Token Cleanup (Recommended)
If you have `pg_cron` extension:
```sql
SELECT cron.schedule(
    'cleanup-expired-tokens',
    '0 3 * * *',
    $$SELECT cleanup_expired_tokens()$$
);
```

Or set up manual cleanup:
- [ ] Add to calendar: Run `SELECT cleanup_expired_tokens();` weekly
- [ ] Or create GitHub Action to run it daily

### Monitoring Setup
- [ ] Set up Resend webhook for delivery status (optional)
- [ ] Add alerts for Edge Function errors in Supabase
- [ ] Monitor database table sizes
- [ ] Track user verification rate over time

---

## 📊 Success Metrics

After 1 week of running:
- [ ] Email delivery rate > 95%
- [ ] Bounce rate < 5%
- [ ] User verification rate > 70%
- [ ] No Edge Function errors
- [ ] No database performance issues

---

## 🐛 Troubleshooting Guide

### Issue: Emails Not Sending

**Check:**
1. Resend API key is correct
2. Domain is verified in Resend
3. Check Resend logs for errors
4. Check browser console for API errors

**Test:**
```powershell
# Test Resend API directly
curl -X POST https://api.resend.com/emails `
  -H "Authorization: Bearer ***REMOVED_API_KEY***" `
  -H "Content-Type: application/json" `
  -d '{"from":"no-reply@smartpick.ge","to":"your@email.com","subject":"Test","html":"<p>Test</p>"}'
```

### Issue: Edge Functions Return 500

**Check:**
1. Functions are deployed: `supabase functions list`
2. Check Edge Function logs in Supabase dashboard
3. Verify Supabase environment variables

**View Logs:**
```powershell
supabase functions logs verify-email
supabase functions logs password-reset
```

### Issue: Token Not Found

**Check:**
```sql
-- Find token
SELECT * FROM email_verification_tokens WHERE token = 'YOUR_TOKEN';
SELECT * FROM password_reset_tokens WHERE token = 'YOUR_TOKEN';

-- Check if expired
SELECT token, expires_at, expires_at < NOW() as is_expired 
FROM email_verification_tokens 
WHERE token = 'YOUR_TOKEN';
```

### Issue: Rate Limit During Testing

**Reset:**
```sql
DELETE FROM email_rate_limits WHERE email = 'test@example.com';
```

---

## ✅ Final Sign-Off

- [ ] Database migration applied successfully
- [ ] Both Edge Functions deployed and active
- [ ] Domain verified in Resend dashboard
- [ ] Environment variables configured (local + production)
- [ ] All 8 test scenarios passed
- [ ] Signup flow integrated with email verification
- [ ] Login page has "Forgot Password" link
- [ ] Email deliverability tested across providers
- [ ] Mobile responsiveness verified
- [ ] Security checks passed
- [ ] Monitoring set up
- [ ] Maintenance scheduled

---

## 🎉 System Status

Once all items above are checked:

**✅ EMAIL VERIFICATION SYSTEM IS LIVE!**

Users can now:
- Verify their email addresses after signup
- Reset their passwords via email
- Receive secure, rate-limited emails
- Enjoy beautiful, responsive email templates

---

## 📞 Support

For issues:
1. Check `EMAIL_VERIFICATION_SYSTEM_COMPLETE.md` for detailed guide
2. Check `EMAIL_API_REFERENCE.md` for code examples
3. Review Resend logs: [resend.com/emails](https://resend.com/emails)
4. Check Supabase Edge Function logs
5. Query database tables for debugging

---

**Deployed by**: [Your Name]  
**Date**: [Deployment Date]  
**Project**: SmartPick Email Verification System  
**Status**: Ready for Production ✅
