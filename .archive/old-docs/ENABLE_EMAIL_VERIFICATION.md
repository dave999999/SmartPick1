# 📧 Enable Email Verification in Supabase

## Problem
Users are not receiving verification emails after signup because **email confirmation is disabled by default in Supabase**.

## Solution: Enable Email Confirmation in Supabase Dashboard

### Step 1: Go to Authentication Settings
1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **SmartPick**
3. Navigate to: **Authentication** → **Providers** (left sidebar)

### Step 2: Configure Email Provider
1. Click on **Email** provider
2. Scroll down to find **"Confirm email"** toggle
3. **Enable** the "Confirm email" option
4. Click **Save**

### Step 3: Configure Email Templates (Optional but Recommended)
1. Go to **Authentication** → **Email Templates** (left sidebar)
2. Click on **"Confirm signup"** template
3. Customize the email template if needed:
   - Subject: `Confirm your SmartPick account`
   - Body: You can customize the message or use the default

### Step 4: Test Email Sending

#### Option A: Use Supabase's Built-in Email Service (Recommended for testing)
- No configuration needed
- Limited to 3 emails per hour per user in free tier
- Good for development and testing

#### Option B: Configure Custom SMTP (Recommended for production)
1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Enable **Enable Custom SMTP**
4. Configure your email provider:
   ```
   SMTP Host: smtp.gmail.com (for Gmail)
   SMTP Port: 587
   Sender email: your-email@gmail.com
   Sender name: SmartPick
   Username: your-email@gmail.com
   Password: [App Password - see below]
   ```

#### For Gmail SMTP (if using option B):
1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Generate an **App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "SmartPick Supabase"
   - Copy the generated 16-character password
4. Use this App Password in Supabase SMTP settings

### Step 5: Verify Configuration
1. Try signing up with a test email on your site
2. Check your email inbox (including spam folder)
3. You should receive a "Confirm your email" message
4. Click the confirmation link

### Step 6: Configure Email Redirect URL
The code already includes the correct redirect URL:
```typescript
emailRedirectTo: `${window.location.origin}/verify-email`
```

Make sure your Supabase project has this URL whitelisted:
1. Go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   - For development: `http://localhost:5173/verify-email`
   - For production: `https://smartpick.ge/verify-email`

## Current Status in Code ✅

The SmartPick application is already configured correctly:

1. ✅ **Sign up with email verification**:
   ```typescript
   await supabase.auth.signUp({
     email: signUpEmail,
     password: signUpPassword,
     options: {
       emailRedirectTo: `${window.location.origin}/verify-email`
     }
   });
   ```

2. ✅ **Prominent confirmation UI** showing after signup
3. ✅ **Warning message** about email configuration
4. ✅ **Verify-email page** exists to handle the redirect

## Troubleshooting

### Problem: Still not receiving emails after enabling
**Solutions:**
1. Check spam/junk folder
2. Wait 2-3 minutes (Supabase queues emails)
3. Check Supabase logs: **Authentication** → **Logs**
4. Verify "Confirm email" is enabled and saved
5. Try with a different email address

### Problem: Email confirmation link doesn't work
**Solutions:**
1. Check redirect URLs are whitelisted in Supabase
2. Verify the verify-email page exists and is accessible
3. Check browser console for errors

### Problem: "Email rate limit exceeded"
**Solutions:**
1. Wait 1 hour before retrying
2. Use a different email address
3. Configure custom SMTP for higher limits

## Quick Test Command

After enabling, test with this SQL query in Supabase SQL Editor:

```sql
-- Check if email confirmation is required
SELECT * FROM auth.config WHERE parameter = 'email_confirm_required';

-- Check recent signup attempts
SELECT email, created_at, confirmed_at, email_confirmed_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;
```

## Production Recommendations

For production (smartpick.ge):
1. ✅ Enable email confirmation
2. ✅ Configure custom SMTP (Gmail, SendGrid, or AWS SES)
3. ✅ Customize email templates with SmartPick branding
4. ✅ Add production URL to redirect whitelist
5. ✅ Monitor email delivery in Supabase logs

## Support

If emails are still not working after following these steps:
1. Check Supabase Status: https://status.supabase.com/
2. Contact Supabase Support from dashboard
3. Temporarily allow users to sign in without email confirmation (not recommended for production)

---

**Note:** The warning message in the signup flow will automatically disappear once users start receiving emails successfully.
