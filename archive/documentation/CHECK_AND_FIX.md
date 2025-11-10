# 403 ERROR - YOU MUST RUN SQL IN SUPABASE DASHBOARD

## THE PROBLEM
You are getting a 403 error because Row Level Security policies are missing on the offers table.

## THE SOLUTION (REQUIRES YOUR ACTION)
I **CANNOT** run SQL commands against your Supabase database from this platform.
You **MUST** do it manually by following these steps:

---

## STEP-BY-STEP INSTRUCTIONS

### 1. Open Supabase SQL Editor
Click this link: https://***REMOVED_PROJECT_ID***.supabase.co/project/***REMOVED_PROJECT_ID***/sql/new

### 2. Copy This Entire SQL Script
```sql
-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Remove old policies
DROP POLICY IF EXISTS "Partners can create offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can view own offers" ON public.offers;
DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can update own offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can delete own offers" ON public.offers;

-- Create new policies
CREATE POLICY "Partners can create offers" ON public.offers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = partner_id AND partners.user_id = auth.uid() AND partners.status = 'APPROVED'));

CREATE POLICY "Partners can view own offers" ON public.offers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = offers.partner_id AND partners.user_id = auth.uid()));

CREATE POLICY "Public can view active offers" ON public.offers FOR SELECT TO anon, authenticated
USING (status = 'ACTIVE' AND expires_at > NOW());

CREATE POLICY "Partners can update own offers" ON public.offers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = offers.partner_id AND partners.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = partner_id AND partners.user_id = auth.uid()));

CREATE POLICY "Partners can delete own offers" ON public.offers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.partners WHERE partners.id = offers.partner_id AND partners.user_id = auth.uid()));

-- Verify
SELECT 'RLS Status:' as info, tablename, rowsecurity FROM pg_tables WHERE tablename = 'offers';
SELECT 'Policies:' as info, policyname, cmd FROM pg_policies WHERE tablename = 'offers';
```

### 3. Paste Into SQL Editor
Paste the entire script into the Supabase SQL Editor

### 4. Click RUN
Click the green "RUN" button

### 5. Check Results
You should see:
- RLS Status: offers table with rowsecurity = true
- Policies: 5 policies listed

### 6. Test
Try creating an offer again - the 403 error should be gone!

---

## ALTERNATIVE: Check Your Partner Status
If you've already run the SQL above and still get 403, your partner might not be APPROVED.

Run this in Supabase SQL Editor:
```sql
SELECT business_name, status FROM public.partners WHERE user_id = auth.uid();
```

If status is 'PENDING', run:
```sql
UPDATE public.partners SET status = 'APPROVED' WHERE user_id = auth.uid();
```

---

## WHY THIS HAPPENS
- Row Level Security (RLS) is enabled on the offers table
- But the INSERT policy is missing
- Without the policy, Supabase blocks ALL insert operations with 403
- The SQL script creates the missing policies

---

## SUMMARY
1. Go to: https://***REMOVED_PROJECT_ID***.supabase.co/project/***REMOVED_PROJECT_ID***/sql/new
2. Copy the SQL script above
3. Paste and click RUN
4. Try creating an offer again
5. 403 error will be GONE ✅
