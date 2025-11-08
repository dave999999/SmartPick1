# Emergency Auth Test - Restore Instructions

## What was changed
Added temporary debugging flags to `.env.local`:
- `VITE_DISABLE_SW=true` - Disables service worker (no caching)
- `VITE_BLOCK_USER_UPSERT=true` - Blocks users.upsert calls (prevents 409)
- `VITE_DEBUG_USER_UPSERT=true` - Logs upsert attempts

## Testing steps
1. Build is complete with flags enabled (build version: 20251107235041)
2. Deploy to Vercel:
   - If using Vercel CLI: `vercel --prod`
   - If using git integration: Vercel will auto-deploy from latest commit
3. Test signup/login with a new user
4. Check browser console for:
   - `[DEBUG] users.upsert is currently blocked (no-op)` on page load
   - No POST requests to `/rest/v1/users?on_conflict=id`
   - Any `[DEBUG] Detected users.upsert` messages (share stack if appears)

## How to restore for production
After testing confirms login works:

### Option 1: Remove test flags (recommended)
Edit `.env.local` and delete these lines:
```bash
# ========================================
# EMERGENCY AUTH TEST FLAGS (TEMPORARY)
# Remove these after testing signup/login
# ========================================

# Disable service worker to ensure fresh bundle loads (no caching)
VITE_DISABLE_SW=true

# Block any users.upsert calls to prevent 409 conflicts
VITE_BLOCK_USER_UPSERT=true

# Log stack traces when users.upsert is attempted
VITE_DEBUG_USER_UPSERT=true
```

### Option 2: Quick restore via PowerShell
Run this command in the project root:
```powershell
(Get-Content .env.local) | Select-String -Pattern 'VITE_(DISABLE_SW|BLOCK_USER_UPSERT|DEBUG_USER_UPSERT)' -NotMatch | Set-Content .env.local.restored; Move-Item -Force .env.local.restored .env.local
```

Then rebuild and deploy:
```powershell
pnpm build
git add -A
git commit -m "Restore production env (remove auth test flags)"
git push
```

## Note
`.env.local` is gitignored, so these changes won't be committed. You need to set environment variables in Vercel dashboard if you want them to persist across deployments:
- Go to: https://vercel.com/dave999999/smartpick/settings/environment-variables
- For production testing, add the three VITE_* flags there temporarily
- Remove them after testing completes
