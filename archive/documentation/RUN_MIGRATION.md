# Run Database Migration - Make Description Optional

This guide shows you how to make the `description` field optional for partners.

## 🚀 Quick Method: Run in Supabase Dashboard

### Step 1: Go to Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your **SmartPick project**
3. Click on **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Paste and Run Migration

Copy and paste this SQL:

```sql
-- Make description column optional in partners table
ALTER TABLE partners
ALTER COLUMN description DROP NOT NULL;

-- Add comment to document this is optional
COMMENT ON COLUMN partners.description IS 'Optional business description';
```

### Step 3: Execute

1. Click **Run** (or press Ctrl+Enter)
2. ✅ Should see: "Success. No rows returned"

### Step 4: Verify

Run this to verify the change:

```sql
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'partners' AND column_name = 'description';
```

You should see `is_nullable = 'YES'`

## 🔄 Alternative Method: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
npx supabase login

# Link your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migration to production
npx supabase db push
```

## ✅ After Running Migration

The description field will now be optional when adding partners:
- ✅ Can leave description empty
- ✅ Won't get "null value in column 'description'" error
- ✅ Partners can be added with or without descriptions

## 📝 What This Changes

**Before:**
```
description: REQUIRED (error if empty)
```

**After:**
```
description: OPTIONAL (can be empty)
```

---

**Created:** 2025-01-02
