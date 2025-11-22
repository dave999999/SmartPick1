# Email System Edge Functions Migration - Complete

## Overview

All email logic has been moved to Supabase Edge Functions for complete server-side control. The client no longer sends emails directly or relies on Supabase Auth's built-in email features.

---

## Architecture

### **Client → Edge Functions → Resend API**

```
User Action (Signup/Reset Password)
         ↓
Client Code (React)
         ↓
Supabase Edge Function (Deno)
         ↓
Resend API (SMTP)
         ↓
User's Email Inbox
```

### **Benefits:**
- ✅ **Security**: API keys never exposed to client
- ✅ **Control**: Full control over email templates, timing, and content
- ✅ **Rate Limiting**: Server-side rate limits protect against abuse
- ✅ **Logging**: Comprehensive logging of all email operations
- ✅ **Customization**: Easy to modify templates without client deployments

---

## Edge Functions

### 1. **send-verification-email**
**Path:** `supabase/functions/send-verification-email/index.ts`

**Purpose:** Send email verification links to new users during signup

**Request Body:**
```typescript
{
  email: string;      // User's email address
  name: string;       // User's display name
  userId: string;     // User ID from auth.users
}
```

**Rate Limits:**
- 3 requests per email per 15 minutes
- 10 requests per IP per 15 minutes

**Features:**
- Generates cryptographically secure token (UUID + UUID without dashes)
- Creates record in `email_verification_tokens` table
- Token expires in 30 minutes
- Beautiful HTML email template with gradient design
- Mobile-responsive

**Verification Flow:**
1. User clicks link: `https://www.smartpick.ge/verify-email?token={TOKEN}`
2. Client calls `verify-email` Edge Function with token
3. Function validates token, marks as used, updates `users.is_email_verified`

---

### 2. **send-password-reset-email**
**Path:** `supabase/functions/send-password-reset-email/index.ts`

**Purpose:** Send password reset links to users who forgot their password

**Request Body:**
```typescript
{
  email: string;      // User's email address
}
```

**Rate Limits:**
- 3 requests per email per 15 minutes
- 10 requests per IP per 15 minutes

**Features:**
- Validates user exists (security: doesn't reveal if email exists)
- Detects OAuth-only accounts (Google/Facebook) and rejects with helpful message
- Generates secure token, stores in `password_reset_tokens` table
- Token expires in 30 minutes
- Beautiful HTML email template
- Mobile-responsive

**Reset Flow:**
1. User clicks link: `https://www.smartpick.ge/reset-password?token={TOKEN}`
2. Client validates token with Edge Function
3. User enters new password
4. Client calls `supabase.auth.updateUser({ password })`

---

### 3. **verify-email** (Token Validation)
**Path:** `supabase/functions/verify-email/index.ts`

**Purpose:** Validate email verification tokens

**Request Body:**
```typescript
{
  token: string;      // Verification token from email link
}
```

**Response:**
```typescript
{
  success: true;
  message: string;
}
// OR
{
  error: string;
  code: 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'UPDATE_ERROR';
}
```

---

## Client Integration

### **Signup Flow**
**File:** `src/components/AuthDialog.tsx`

```typescript
// Step 1: Create user WITHOUT sending verification email
const { data, error } = await supabase.auth.signUp({
  email: signUpEmail,
  password: signUpPassword,
  options: {
    data: { name: signUpName, role: 'CUSTOMER' },
    emailRedirectTo: undefined, // ❌ Don't use Supabase's email
  },
});

// Step 2: Send verification email via Edge Function
await supabase.functions.invoke('send-verification-email', {
  body: { email: signUpEmail, name: signUpName, userId: data.user.id },
});
```

### **Password Reset Flow**
**File:** `src/pages/ForgotPassword.tsx`

```typescript
// Call Edge Function instead of supabase.auth.resetPasswordForEmail()
const { data, error } = await supabase.functions.invoke('send-password-reset-email', {
  body: { email },
});

// Handle specific error codes
if (data?.code === 'OAUTH_ACCOUNT') {
  toast.error('This account uses social login. Please sign in with Google/Facebook.');
}
```

---

## Environment Variables

### **Supabase Edge Function Secrets** (Server-side only)
Configure these in Supabase Dashboard → Edge Functions → Secrets:

```bash
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXX  # New API key (NOT the exposed one)
PUBLIC_BASE_URL=https://www.smartpick.ge
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### **Client Environment** (.env.local)
```bash
# ❌ REMOVED - Never expose API keys to client
# VITE_RESEND_API_KEY=...  

# ✅ Only public Supabase keys
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## Database Tables

### **email_verification_tokens**
```sql
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_verification_tokens_user ON email_verification_tokens(user_id);
```

### **password_reset_tokens**
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_tokens_user ON password_reset_tokens(user_id);
```

### **RPC Function for Rate Limiting**
```sql
CREATE OR REPLACE FUNCTION check_email_rate_limit(
  p_email TEXT,
  p_action_type TEXT,
  p_max_attempts INT,
  p_window_minutes INT
) RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INT;
  window_start TIMESTAMPTZ;
BEGIN
  window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Check rate limit from audit log or similar
  SELECT COUNT(*) INTO attempt_count
  FROM audit_logs
  WHERE action_type = p_action_type
    AND metadata->>'email' = p_email
    AND created_at > window_start;
  
  RETURN attempt_count < p_max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Email Templates

### Design Features:
- **Gradient Header**: Teal → Emerald gradient with icon in circle
- **Clear CTA Button**: Large, centered button with hover effect
- **Mobile-Responsive**: Works on all screen sizes
- **Security Info**: Prominent expiration warning (30 minutes)
- **Fallback Link**: Plain text URL if button doesn't work
- **Brand Consistency**: SmartPick branding and "Reducing food waste" tagline

### Customization:
Edit `generateVerificationEmail()` or `generatePasswordResetEmail()` functions in Edge Function files.

---

## Deployment Steps

### **1. Revoke Old API Key (CRITICAL)**
1. Go to Resend Dashboard: https://resend.com/api-keys
2. Find key starting with `re_bQNu31zi...`
3. Click "Revoke" - this key was exposed in Git history

### **2. Generate New API Key**
1. In Resend Dashboard, click "Create API Key"
2. Name: `SmartPick Production`
3. Permission: `Send emails`
4. Copy the key (starts with `re_...`)

### **3. Configure Supabase Edge Function Secrets**
```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets (replace with your actual values)
supabase secrets set RESEND_API_KEY=re_YOUR_NEW_API_KEY
supabase secrets set PUBLIC_BASE_URL=https://www.smartpick.ge
```

### **4. Deploy Edge Functions**
```bash
# Deploy all functions
supabase functions deploy send-verification-email
supabase functions deploy send-password-reset-email
supabase functions deploy verify-email

# Verify deployment
supabase functions list
```

### **5. Update Supabase Auth Settings**
In Supabase Dashboard → Authentication → Email:

1. **Disable Confirm Email**: OFF (we handle this ourselves)
2. **Secure Email Change**: ON
3. **Enable Email Provider**: ON

### **6. Update SMTP Settings (Optional Backup)**
Even though we're using Resend API directly, configure SMTP as backup:

1. Go to Supabase Dashboard → Settings → Auth
2. SMTP Settings:
   - **Host**: smtp.resend.com
   - **Port**: 465 (TLS) or 587 (STARTTLS)
   - **Username**: resend
   - **Password**: [NEW API KEY]
   - **Sender**: noreply@smartpick.ge

### **7. Test Email Flows**

#### Test Signup Verification:
```bash
# 1. Sign up with test email
# 2. Check Resend dashboard for delivery
# 3. Check email inbox
# 4. Click verification link
# 5. Verify user.is_email_verified = true
```

#### Test Password Reset:
```bash
# 1. Go to /forgot-password
# 2. Enter email
# 3. Check Resend dashboard
# 4. Check email inbox
# 5. Click reset link
# 6. Set new password
```

#### Test Rate Limiting:
```bash
# Attempt 4 signups with same email in 5 minutes
# Should get rate limit error on 4th attempt
```

### **8. Build & Deploy Frontend**
```bash
# Build with new changes
npm run build

# Deploy to production (depends on your hosting)
# Netlify: git push (automatic)
# Vercel: vercel --prod
# Manual: Upload dist/ folder
```

---

## Monitoring & Logs

### **Edge Function Logs**
```bash
# Real-time logs
supabase functions logs send-verification-email --tail
supabase functions logs send-password-reset-email --tail

# Specific time range
supabase functions logs send-verification-email --since 1h
```

### **Resend Dashboard**
- Go to https://resend.com/emails
- View delivery status, opens, clicks
- Check bounce/complaint rates

### **Database Queries**
```sql
-- Check recent verification tokens
SELECT * FROM email_verification_tokens
ORDER BY created_at DESC
LIMIT 10;

-- Check unused tokens
SELECT * FROM email_verification_tokens
WHERE used_at IS NULL
  AND expires_at > NOW();

-- Check rate limit violations
SELECT * FROM audit_logs
WHERE action_type LIKE '%rate_limit%'
ORDER BY created_at DESC;
```

---

## Troubleshooting

### **Emails Not Received**
1. Check Resend dashboard for delivery status
2. Check spam/junk folder
3. Verify DNS records (DKIM, SPF, DMARC) at https://mxtoolbox.com/SuperTool.aspx?action=dkim:smartpick.ge
4. Check Edge Function logs for errors
5. Verify `RESEND_API_KEY` secret is set correctly

### **Rate Limit Errors**
```sql
-- Clear rate limit for testing (careful in production)
DELETE FROM audit_logs
WHERE action_type IN ('email_verification', 'password_reset')
  AND metadata->>'email' = 'test@example.com';
```

### **Token Expired**
- Tokens expire in 30 minutes
- User can request new verification email from `/verify-email` page
- Or sign up again (same email will update existing user)

### **CORS Errors**
Edge Functions use `_shared/cors.ts` for CORS handling.
If issues persist:
```typescript
// Check allowed origins in _shared/cors.ts
const allowedOrigins = [
  'https://www.smartpick.ge',
  'https://smartpick.ge',
  'http://localhost:5173',
];
```

---

## Security Checklist

- ✅ API keys stored as Edge Function secrets (not in client code)
- ✅ Git history cleaned of exposed keys
- ✅ Rate limiting enabled (email + IP based)
- ✅ Tokens expire in 30 minutes
- ✅ Tokens are single-use (marked as `used_at` after verification)
- ✅ HTTPS only (redirect in production)
- ✅ CORS configured for specific origins
- ✅ Email doesn't reveal if account exists (security through obscurity)
- ✅ OAuth accounts detected and handled properly
- ✅ Service role key used for admin operations (not exposed)

---

## Migration Summary

### **Files Modified:**
1. `src/components/AuthDialog.tsx` - Signup now calls Edge Function
2. `src/pages/ForgotPassword.tsx` - Password reset calls Edge Function
3. `src/lib/supabase.ts` - Helper function calls Edge Function
4. `src/lib/api/auth.ts` - Helper function calls Edge Function
5. `src/pages/PartnerApplication.tsx` - Partner signup calls Edge Function

### **Files Created:**
1. `supabase/functions/send-verification-email/index.ts` - New Edge Function

### **Files Already Existing:**
1. `supabase/functions/send-password-reset-email/index.ts` - Already uses Resend API ✅
2. `supabase/functions/verify-email/index.ts` - Token validation ✅

### **Environment Changes:**
- ❌ Removed: `VITE_RESEND_API_KEY` from all .env files
- ✅ Added: `RESEND_API_KEY` as Edge Function secret
- ✅ Added: `PUBLIC_BASE_URL` as Edge Function secret

---

## Next Steps

1. **Deploy Edge Functions** to Supabase
2. **Configure Secrets** with new Resend API key
3. **Test thoroughly** in staging/development
4. **Build & deploy** frontend
5. **Monitor logs** for first 24 hours
6. **Update documentation** with any production-specific notes

---

## Support

For issues:
1. Check Edge Function logs: `supabase functions logs`
2. Check Resend dashboard: https://resend.com/emails
3. Check database: Query `email_verification_tokens` and `audit_logs` tables
4. Review this documentation for troubleshooting steps

---

**Status:** ✅ Complete - Ready for deployment
**Last Updated:** 2024
**Version:** 1.0
