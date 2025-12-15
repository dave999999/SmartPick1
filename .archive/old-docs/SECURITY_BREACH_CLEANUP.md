# 🚨 CRITICAL SECURITY BREACH - IMMEDIATE ACTION REQUIRED

## Overview
Multiple credentials were exposed in this repository and have been committed to git history. This document outlines the immediate actions required.

---

## 🔴 EXPOSED CREDENTIALS (All Must Be Rotated)

### 1. Bank of Georgia Payment Gateway Credentials
**Location:** `.env.example`, `supabase/functions/test-bog-oauth/index.ts`, `MANUAL_DEPLOYMENT_WITH_CREDENTIALS.md`

**Exposed Credentials:**
- `BOG_CLIENT_ID`: `10002951`
- `BOG_CLIENT_SECRET`: `***REMOVED_BOG_SECRET***`
- **AND** another set:
  - `BOG_CLIENT_ID`: `***REMOVED_BOG_ID_2***`
  - `BOG_CLIENT_SECRET`: `***REMOVED_BOG_SECRET_2***`

**Impact:** Anyone can create payment orders in your name, potentially stealing money or creating fraudulent transactions.

### 2. Supabase Service Role Key (Full Admin Access)
**Location:** `deploy-function-direct.ps1`, `DEEP_DIVE_SOLUTIONS_REPORT.md`

**Exposed Key:** `***REMOVED_SERVICE_KEY***`

**Impact:** Complete database access - read/write/delete ALL data, bypass RLS policies, create/delete users, access payment info.

### 3. Supabase Anon Keys (Public, but project ID exposed)
**Location:** `test-relist-simple.ps1`, `test-auto-relist.ps1`, `deploy-edge-function.bat`

**Project:** `***REMOVED_PROJECT_ID***`

**Impact:** Project ID exposed, enabling targeted attacks. While anon keys are meant to be public, having them in scripts reveals your project structure.

---

## ✅ IMMEDIATE ACTIONS REQUIRED

### Step 1: Rotate Bank of Georgia Credentials (URGENT - Within 1 Hour)

1. **Login to Bank of Georgia E-Commerce Portal**
   - URL: https://ecommerce.bog.ge (or contact your BOG representative)

2. **Revoke Compromised Credentials**
   - Navigate to API Credentials / OAuth Settings
   - Disable or delete the following Client IDs:
     - `10002951`
     - `***REMOVED_BOG_ID_2***`

3. **Generate New Credentials**
   - Create new OAuth Client ID and Secret
   - Download and store securely (use password manager)

4. **Update Your Production Environment**
   ```bash
   # In Supabase Dashboard → Edge Functions → Environment Variables
   BOG_CLIENT_ID=<new_client_id>
   BOG_CLIENT_SECRET=<new_client_secret>
   ```

5. **Update Local Environment**
   - Create `.env.local` file (NOT committed to git):
   ```env
   BOG_CLIENT_ID=<new_client_id>
   BOG_CLIENT_SECRET=<new_client_secret>
   ```

### Step 2: Rotate Supabase Service Role Key (URGENT - Within 1 Hour)

1. **Login to Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Select project: `***REMOVED_PROJECT_ID***`

2. **Navigate to Settings → API**

3. **Click "Reset service_role secret"**
   - This will immediately invalidate the old key

4. **Copy the New Service Role Key**

5. **Update Edge Functions Environment Variables**
   - Go to Edge Functions → Settings
   - Update `SUPABASE_SERVICE_ROLE_KEY` (if manually set)
   - Note: This is usually auto-provided by Supabase

6. **Update Any Local Scripts That Use It**
   - Do NOT hardcode it - use environment variables only

### Step 3: Clean Git History (Within 24 Hours)

⚠️ **WARNING:** This will rewrite git history and require force-push. All collaborators must re-clone.

#### Option A: Using BFG Repo-Cleaner (Recommended - Easier)

1. **Install BFG**
   ```powershell
   # Using Chocolatey
   choco install bfg-repo-cleaner

   # Or download from: https://rtyley.github.io/bfg-repo-cleaner/
   ```

2. **Create a Fresh Clone** (Mirror)
   ```powershell
   cd d:\v3\workspace
   git clone --mirror https://github.com/dave999999/SmartPick1.git smartpick-cleanup
   cd smartpick-cleanup
   ```

3. **Create Secrets File**
   Create `secrets.txt` with all exposed credentials (one per line):
   ```text
   10002951
   ***REMOVED_BOG_SECRET***
   ***REMOVED_BOG_ID_2***
   ***REMOVED_BOG_SECRET_2***
   ***REMOVED_SERVICE_KEY***
   ***REMOVED_ANON_KEY_1***
   ***REMOVED_PROJECT_ID***
   ```

4. **Run BFG to Remove Secrets**
   ```powershell
   bfg --replace-text secrets.txt smartpick-cleanup.git
   ```

5. **Clean and Garbage Collect**
   ```powershell
   cd smartpick-cleanup.git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

6. **Force Push** (⚠️ Destructive - Coordinate with team)
   ```powershell
   git push --force
   ```

#### Option B: Using git filter-repo (More Powerful)

1. **Install git-filter-repo**
   ```powershell
   pip install git-filter-repo
   ```

2. **Create Fresh Clone**
   ```powershell
   cd d:\v3\workspace
   git clone https://github.com/dave999999/SmartPick1.git smartpick-cleanup
   cd smartpick-cleanup
   ```

3. **Create Replacement File** (`replacements.txt`):
   ```text
   literal:10002951==>REDACTED_BOG_CLIENT_ID
   literal:***REMOVED_BOG_SECRET***==>REDACTED_BOG_SECRET
   literal:***REMOVED_BOG_ID_2***==>REDACTED_BOG_CLIENT_ID_2
   literal:***REMOVED_BOG_SECRET_2***==>REDACTED_BOG_SECRET_2
   regex:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+==>REDACTED_JWT_TOKEN
   literal:***REMOVED_PROJECT_ID***==>REDACTED_PROJECT_ID
   ```

4. **Run Filter**
   ```powershell
   git filter-repo --replace-text replacements.txt --force
   ```

5. **Add Remote Back** (filter-repo removes it)
   ```powershell
   git remote add origin https://github.com/dave999999/SmartPick1.git
   ```

6. **Force Push**
   ```powershell
   git push --force --all
   git push --force --tags
   ```

### Step 4: Notify Collaborators

After force-pushing, all collaborators must:

```powershell
cd d:\v3\workspace\shadcn-ui
git fetch origin
git reset --hard origin/main
```

### Step 5: Monitor for Suspicious Activity

1. **Check Supabase Logs**
   - Dashboard → Logs → Look for unusual API calls
   - Check for unauthorized data access

2. **Check BOG Transaction History**
   - Review recent payment orders
   - Look for unauthorized transactions

3. **Review User Activity**
   - Check for new admin accounts created
   - Look for unusual database modifications

---

## 📋 VERIFICATION CHECKLIST

- [ ] BOG credentials rotated in portal
- [ ] BOG credentials updated in Supabase Edge Functions
- [ ] Supabase service role key rotated
- [ ] Local `.env.local` updated with new credentials
- [ ] Git history cleaned with BFG or filter-repo
- [ ] Force pushed to GitHub
- [ ] All collaborators notified and re-cloned
- [ ] `.gitignore` verified to exclude `.env*` files (except `.env.example` and `.env.production`)
- [ ] No hardcoded credentials remain in codebase (search completed)
- [ ] Monitoring set up for suspicious activity
- [ ] Security incident documented

---

## 🔒 PREVENTION MEASURES (Applied)

### Files Updated to Remove Hardcoded Credentials:
1. ✅ `.env.example` - Replaced with placeholders
2. ✅ `supabase/functions/test-bog-oauth/index.ts` - Removed from error messages
3. ✅ `MANUAL_DEPLOYMENT_WITH_CREDENTIALS.md` - Credentials removed and marked as rotated
4. ✅ `deploy-edge-function.bat` - Keys removed, commented out
5. ✅ `DEEP_DIVE_SOLUTIONS_REPORT.md` - Service role key redacted
6. ✅ `test-relist-simple.ps1` - Now uses environment variables
7. ✅ `test-auto-relist.ps1` - Now uses environment variables
8. ✅ `deploy-function-direct.ps1` - Now uses environment variables

### `.gitignore` Current Status:
```gitignore
# Environment variables (CRITICAL: Never commit these!)
.env
.env.*
.env.local
.env.development
.env.captcha

# DO commit these files (they have no real secrets, only feature flags)
!.env.example
!.env.production
```

This is CORRECT - maintains security while allowing example files.

---

## 🆘 IF YOU NEED HELP

1. **Bank of Georgia Support**
   - Contact your BOG account manager immediately
   - Explain credentials were compromised and need emergency rotation

2. **Supabase Support**
   - Visit: https://supabase.com/dashboard/support
   - Or email: support@supabase.io
   - Mention: "Service role key compromised, rotated, need security audit"

3. **GitHub Security**
   - If the repo was public, contact GitHub Support
   - They can help scan for credential usage in the wild

---

## 📊 RISK ASSESSMENT

| Credential Type | Severity | Exposure Time | Potential Damage |
|----------------|----------|---------------|------------------|
| BOG Client Secret | 🔴 CRITICAL | Unknown | Financial fraud, unauthorized payments |
| Supabase Service Key | 🔴 CRITICAL | Unknown | Complete data breach, user data theft |
| Project ID | 🟡 MEDIUM | Unknown | Targeted attacks, API abuse |
| Anon Keys | 🟢 LOW | N/A | Minimal (designed to be public) |

---

## ✅ STATUS: Files Cleaned, History Must Still Be Purged

All credential references have been removed from the current codebase, but they still exist in git history. 

**You MUST complete Step 3 (Clean Git History) to fully remediate this breach.**
