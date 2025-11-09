# 🎮 Gamification Quick Start - 4 Steps Only!

## What You Need to Do

### 1️⃣ Run SQL Scripts (3 minutes)

**A. Create Tables & Functions:**
1. Open: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql/new
2. Paste **ALL of** `RESTORE_GAMIFICATION.sql` → Click **Run**
3. ✅ Should see: "GAMIFICATION SYSTEM RESTORED!"

**B. Add Purchase Functions:**
1. Click "New Query" again
2. Paste **ALL of** `ADD_PURCHASE_FUNCTIONS.sql` → Click **Run**
3. ✅ Should see: "PURCHASE FUNCTIONS ADDED!"

### 2️⃣ Login to Supabase CLI (1 minute)
```powershell
supabase login
```
(Opens browser for auth)

### 3️⃣ Link & Deploy Edge Function (2 minutes)
```powershell
supabase link --project-ref ***REMOVED_PROJECT_ID***
supabase functions deploy mark-pickup
```

### 4️⃣ Refresh Browser
```
Hard refresh: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
```

## ✅ Done!

Code already pushed to GitHub ✅  
Vercel auto-deployed ✅  
Frontend ready ✅  

## 🧪 Test It Works

**For Users:**
1. Go to Profile → Wallet tab
2. Should see SmartPoints balance and "Buy Points" button ✅
3. Recent transactions showing ✅

**For Partners:**
1. Go to Partner Dashboard
2. Should see partner points balance ✅
3. Can purchase offer slots with points ✅
4. Mark reservation as "Picked Up" → Points awarded! 🎉

---

**Full instructions:** See `DEPLOY_GAMIFICATION.md`
