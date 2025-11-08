# 🚨 SECURITY WARNING

## Exposed Credentials Removed

The following files previously contained **HARDCODED CREDENTIALS** and have been removed from the repository:

- ❌ `create-admin.js` - Contained Supabase service role key
- ❌ `create-admin-simple.js` - Contained Supabase service role key
- ❌ `create-dummy-data.js` - Contained hardcoded test passwords

## ⚠️ IMMEDIATE ACTIONS REQUIRED

### 1. Rotate Your Supabase Service Role Key

The service role key was exposed in the repository. **You MUST rotate it immediately**:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: **Settings → API**
3. Under "Service role key", click **"Generate new service role key"**
4. Copy the new key and store it securely
5. Update any CI/CD pipelines or services using the old key

**Why this is critical**: Anyone with the service role key has **complete administrative access** to your database, bypassing all Row Level Security policies.

### 2. Change All Hardcoded Passwords

The following accounts had hardcoded passwords in the repository:

- Admin account: `admin@smartpick.ge` - Password: `SmartPick2025!Admin`
- Test accounts: Multiple test users - Password: `SmartPick2025!`

**Actions**:
1. Log into admin dashboard
2. Change admin password immediately
3. Delete or reset all test accounts in production

### 3. Use Safe Script Going Forward

To create admin users safely, use the new script:

```bash
# Set environment variables (do NOT commit these!)
export SUPABASE_URL="your-project-url"
export SUPABASE_SERVICE_KEY="your-new-service-key"
export ADMIN_EMAIL="admin@yourdomain.com"
export ADMIN_PASSWORD="YourStrongPassword123!@#"

# Run the safe script
node create-admin.example.js
```

Or copy the example:
```bash
cp create-admin.example.js create-admin.js
# Edit create-admin.js with your credentials (it's .gitignored)
node create-admin.js
```

## 🔒 Best Practices Going Forward

1. **Never commit credentials** - Always use environment variables
2. **Use strong passwords** - Minimum 12 characters with mixed case, numbers, symbols
3. **Rotate secrets regularly** - Change API keys every 90 days
4. **Monitor for leaks** - Use tools like GitGuardian or GitHub secret scanning
5. **Review before commit** - Always check what you're committing with `git diff`

## 📞 Questions?

If you have questions about these security changes, please contact your security team or review the main security audit report.

---
**Date**: 2025-01-08
**Status**: Critical vulnerabilities patched
**Next Review**: 2025-02-08
