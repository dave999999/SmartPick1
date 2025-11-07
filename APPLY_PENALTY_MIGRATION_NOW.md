# Apply Penalty System Migration

## URGENT: Run this migration immediately

The penalty system requires additional columns in the `users` table that don't exist in your production database yet.

### Steps to apply:

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
   - Or navigate: Dashboard → SQL Editor → New Query

2. **Copy and run this SQL**:
   ```sql
   -- Add penalty system columns to users table
   ALTER TABLE public.users
   ADD COLUMN IF NOT EXISTS penalty_count INTEGER DEFAULT 0;

   ALTER TABLE public.users
   ADD COLUMN IF NOT EXISTS penalty_until TIMESTAMP WITH TIME ZONE;

   ALTER TABLE public.users
   ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

   ALTER TABLE public.users
   ADD COLUMN IF NOT EXISTS last_penalty_at TIMESTAMP WITH TIME ZONE;

   -- Add comments
   COMMENT ON COLUMN public.users.penalty_count IS 'Number of times user failed to pick up reserved items';
   COMMENT ON COLUMN public.users.penalty_until IS 'Timestamp when current penalty expires (null if no active penalty)';
   COMMENT ON COLUMN public.users.is_banned IS 'Permanent ban flag (only admin can remove)';
   COMMENT ON COLUMN public.users.last_penalty_at IS 'Timestamp of last penalty application';

   -- Create indexes
   CREATE INDEX IF NOT EXISTS idx_users_penalty_until ON public.users(penalty_until) WHERE penalty_until IS NOT NULL;
   CREATE INDEX IF NOT EXISTS idx_users_is_banned ON public.users(is_banned) WHERE is_banned = true;

   -- Add no-show tracking to reservations
   ALTER TABLE public.reservations
   ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;

   COMMENT ON COLUMN public.reservations.no_show IS 'True if customer did not show up to pick up the item';

   -- Update existing users
   UPDATE public.users SET penalty_count = 0 WHERE penalty_count IS NULL;
   UPDATE public.users SET is_banned = false WHERE is_banned IS NULL;
   ```

3. **Click "Run"**

4. **Verify**: You should see "Success. No rows returned"

5. **Test**: Try the "Didn't Show Up" button again

---

### What this migration does:

- Adds `penalty_count` (tracks no-show offenses)
- Adds `penalty_until` (temporary ban expiry timestamp)
- Adds `is_banned` (permanent ban flag)
- Adds `last_penalty_at` (when last penalty was applied)
- Adds `no_show` flag to reservations table
- Creates efficient indexes for penalty queries
- Sets default values for existing users

### Penalty escalation:

1. **1st offense**: 30 minutes suspension
2. **2nd offense**: 90 minutes suspension
3. **3rd offense**: 24 hours suspension
4. **4th+ offense**: Permanent ban (requires admin to lift)
