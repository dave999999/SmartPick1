# 📧 Email Verification API Quick Reference

## 🎯 Functions Available

### 1. `sendVerificationEmail()`
Send email verification to user after signup.

```typescript
import { sendVerificationEmail } from '@/lib/api/email-verification';

await sendVerificationEmail(
  userId: string,      // Supabase auth user ID
  email: string,       // User's email address
  userName?: string    // Optional: User's full name
);
```

**Rate Limit**: 3 emails per 15 minutes  
**Throws**: Error with message if rate limit exceeded

---

### 2. `sendPasswordResetEmail()`
Send password reset link to user.

```typescript
import { sendPasswordResetEmail } from '@/lib/api/email-verification';

await sendPasswordResetEmail(
  email: string  // User's email address
);
```

**Rate Limit**: 3 emails per 15 minutes  
**Security**: Silent success if email doesn't exist (prevents enumeration)  
**Throws**: Error with message if rate limit exceeded

---

### 3. `verifyEmailWithToken()`
Verify user's email with token (called from frontend).

```typescript
import { verifyEmailWithToken } from '@/lib/api/email-verification';

const result = await verifyEmailWithToken(
  token: string  // Token from URL query parameter
);

// Returns: { success: true, message: string }
```

**Used by**: `/verify-email` page  
**Edge Function**: `verify-email`

---

### 4. `resetPasswordWithToken()`
Reset user's password with token (called from frontend).

```typescript
import { resetPasswordWithToken } from '@/lib/api/email-verification';

const result = await resetPasswordWithToken(
  token: string,       // Token from URL query parameter
  newPassword: string  // New password (min 6 chars)
);

// Returns: { success: true, message: string }
```

**Used by**: `/reset-password` page  
**Edge Function**: `password-reset`

---

## 🛣️ Routes Added

| Route | Component | Purpose |
|-------|-----------|---------|
| `/verify-email` | `VerifyEmail.tsx` | Email verification landing page |
| `/reset-password` | `ResetPassword.tsx` | Password reset form |
| `/forgot-password` | `ForgotPassword.tsx` | Request password reset |
| `/verify-requested` | `VerifyRequested.tsx` | Success message after signup |

---

## 🔗 Integration Examples

### Example 1: Add to Signup Flow

```tsx
// In your signup component
import { sendVerificationEmail } from '@/lib/api/email-verification';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const handleSignup = async (email: string, password: string, fullName: string) => {
  try {
    // 1. Create Supabase auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (error) throw error;

    // 2. Send verification email
    if (data.user) {
      try {
        await sendVerificationEmail(data.user.id, email, fullName);
        toast.success('Account created! Check your email to verify.');
        navigate('/verify-requested');
      } catch (emailError) {
        // Account created but email failed - still redirect
        console.error('Failed to send verification email:', emailError);
        toast.warning('Account created, but verification email failed. Contact support.');
        navigate('/profile');
      }
    }
  } catch (error) {
    console.error('Signup error:', error);
    toast.error('Failed to create account');
  }
};
```

---

### Example 2: Add to Login Page

```tsx
// In your login component
import { Link } from 'react-router-dom';

<form onSubmit={handleLogin}>
  <Input type="email" placeholder="Email" />
  <Input type="password" placeholder="Password" />
  
  <div className="flex justify-between items-center">
    <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
      Forgot password?
    </Link>
  </div>
  
  <Button type="submit">Log In</Button>
</form>
```

---

### Example 3: Show Verification Status in Profile

```tsx
// In UserProfile.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/api/email-verification';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const [isEmailVerified, setIsEmailVerified] = useState(false);
const [isResending, setIsResending] = useState(false);

useEffect(() => {
  const fetchVerificationStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('is_email_verified')
        .eq('id', user.id)
        .single();
      setIsEmailVerified(data?.is_email_verified || false);
    }
  };
  fetchVerificationStatus();
}, []);

const handleResendVerification = async () => {
  setIsResending(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      await sendVerificationEmail(user.id, user.email!, profile?.full_name);
      toast.success('Verification email sent! Check your inbox.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      toast.error('Too many attempts. Try again in 15 minutes.');
    } else {
      toast.error('Failed to send verification email');
    }
  } finally {
    setIsResending(false);
  }
};

// In your JSX
{!isEmailVerified && (
  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
    <p className="text-yellow-800 mb-2">
      ⚠️ Your email is not verified. Some features may be limited.
    </p>
    <Button
      onClick={handleResendVerification}
      disabled={isResending}
      size="sm"
      variant="outline"
    >
      {isResending ? 'Sending...' : 'Resend Verification Email'}
    </Button>
  </div>
)}
```

---

### Example 4: Restrict Actions for Unverified Users

```tsx
// In ReserveOffer.tsx or any component that requires verification
const handleReservation = async () => {
  // Check if email is verified
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('is_email_verified')
      .eq('id', user.id)
      .single();
    
    if (!profile?.is_email_verified) {
      toast.error('Please verify your email before making reservations');
      navigate('/profile');
      return;
    }
  }
  
  // Proceed with reservation...
};
```

---

## 🔒 Security Features

### Rate Limiting
- **Max 3 emails per 15 minutes** per email address per action type
- Enforced at database level via `check_email_rate_limit()` function
- Prevents abuse and email bombing

### Token Security
- **64-character hex tokens** generated via crypto-js
- **30-minute expiration** (configurable in SQL)
- **One-time use**: Tokens marked as `used_at` after consumption
- **IP and User-Agent logging** for audit trail

### Email Validation
- Silent success for password reset if email doesn't exist
- Prevents email enumeration attacks
- Rate limiting applies even for non-existent emails

---

## 🧪 Testing Commands

### Test Rate Limiting
```typescript
// Send 4 emails rapidly
for (let i = 0; i < 4; i++) {
  try {
    await sendVerificationEmail(userId, 'test@example.com', 'Test User');
    console.log(`Email ${i + 1} sent`);
  } catch (error) {
    console.error(`Email ${i + 1} failed:`, error.message);
  }
}
// Expected: First 3 succeed, 4th fails with "Rate limit exceeded"
```

### Check Verification Status
```sql
-- In Supabase SQL Editor
SELECT email, is_email_verified 
FROM users 
WHERE email = 'test@example.com';
```

### View Active Tokens
```sql
-- See all active verification tokens
SELECT user_id, token, expires_at, created_at
FROM email_verification_tokens
WHERE used_at IS NULL
  AND expires_at > NOW();

-- See all active reset tokens
SELECT user_id, token, expires_at, created_at
FROM password_reset_tokens
WHERE used_at IS NULL
  AND expires_at > NOW();
```

### Check Rate Limits
```sql
-- View current rate limit status
SELECT email, action_type, attempts, last_attempt
FROM email_rate_limits
WHERE window_start > NOW() - INTERVAL '15 minutes';
```

### Reset Rate Limit (for testing)
```sql
-- Remove rate limit for specific email
DELETE FROM email_rate_limits WHERE email = 'test@example.com';
```

---

## 🐛 Error Handling

### Rate Limit Error
```typescript
try {
  await sendVerificationEmail(userId, email, name);
} catch (error) {
  if (error instanceof Error && error.message.includes('Rate limit')) {
    toast.error('Too many verification emails sent. Please try again in 15 minutes.');
  } else {
    toast.error('Failed to send verification email');
  }
}
```

### Token Errors
```typescript
try {
  await verifyEmailWithToken(token);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('expired')) {
      toast.error('Verification link expired. Please request a new one.');
    } else if (error.message.includes('Invalid')) {
      toast.error('Invalid verification link');
    } else {
      toast.error('Verification failed');
    }
  }
}
```

---

## 📊 Monitoring Queries

### Email Delivery Stats
Check Resend dashboard: [resend.com/emails](https://resend.com/emails)

### Database Health
```sql
-- Count active tokens
SELECT 
  (SELECT COUNT(*) FROM email_verification_tokens WHERE used_at IS NULL) as active_verification_tokens,
  (SELECT COUNT(*) FROM password_reset_tokens WHERE used_at IS NULL) as active_reset_tokens,
  (SELECT COUNT(*) FROM email_rate_limits WHERE window_start > NOW() - INTERVAL '15 minutes') as active_rate_limits;

-- Find expired but not cleaned up tokens
SELECT COUNT(*) 
FROM email_verification_tokens 
WHERE expires_at < NOW() AND used_at IS NULL;
```

### User Verification Stats
```sql
-- How many users have verified emails?
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN is_email_verified THEN 1 ELSE 0 END) as verified_users,
  ROUND(100.0 * SUM(CASE WHEN is_email_verified THEN 1 ELSE 0 END) / COUNT(*), 2) as verification_rate
FROM users;
```

---

## 🎯 Quick Checklist

Before deploying to production:

- [ ] Install `crypto-js` and `@types/crypto-js`
- [ ] Apply database migration `20251121_email_verification_system.sql`
- [ ] Deploy both Edge Functions (`verify-email`, `password-reset`)
- [ ] Add `VITE_RESEND_API_KEY` to `.env.local`
- [ ] Add `VITE_PUBLIC_BASE_URL` to `.env.local`
- [ ] Verify domain in Resend dashboard
- [ ] Test signup flow with email verification
- [ ] Test password reset flow
- [ ] Test rate limiting (3 emails max)
- [ ] Add routes to `App.tsx` (already done ✅)
- [ ] Add "Forgot Password" link to login page
- [ ] Show verification status in profile page

---

## 📞 Support

For issues or questions:
- Check `EMAIL_VERIFICATION_SYSTEM_COMPLETE.md` for full documentation
- Review Resend logs: [resend.com/emails](https://resend.com/emails)
- Check Supabase Edge Function logs in dashboard
- Review database tables: `email_verification_tokens`, `password_reset_tokens`, `email_rate_limits`
