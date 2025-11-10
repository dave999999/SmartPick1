# ChatGPT Prompt for Supabase Signup Trigger Issue

Copy and paste this entire prompt into ChatGPT:

---

I'm having a critical issue with user signups in my Supabase/PostgreSQL database. When users try to sign up, I get a 500 error: "Database error saving new user" from the Supabase Auth API.

## The Problem

**Error Message:**
```
POST https://***REMOVED_PROJECT_ID***.supabase.co/auth/v1/signup 500 (Internal Server Error)
AuthApiError: Database error saving new user
```

**What I Know:**
- ✅ Signups work perfectly when I disable ALL triggers on the `users` table
- ❌ Signups fail when triggers are enabled
- I have TWO triggers that run on user signup:
  1. `create_user_stats_trigger` (calls `init_user_stats()`)
  2. `create_user_points_trigger` (calls `init_user_points()`)

## My Database Schema

### Users Table (simplified)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'USER',
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id),
  penalty_count INT DEFAULT 0,
  penalty_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### User Stats Table (for gamification)
```sql
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_reservations INT DEFAULT 0,
  total_money_saved DECIMAL(10, 2) DEFAULT 0.00,
  favorite_category TEXT,
  most_visited_partner_id UUID,
  current_streak_days INT DEFAULT 0,
  longest_streak_days INT DEFAULT 0,
  last_activity_date DATE,
  total_referrals INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### User Points Table (for SmartPoints system)
```sql
CREATE TABLE user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 100 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  change INT NOT NULL,
  reason TEXT NOT NULL,
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Current Trigger Implementations

### Trigger 1: Create User Stats
```sql
CREATE OR REPLACE FUNCTION init_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO user_stats (user_id, last_activity_date)
    VALUES (NEW.id, CURRENT_DATE)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user_stats for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_user_stats_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION init_user_stats();
```

### Trigger 2: Create User Points
```sql
CREATE OR REPLACE FUNCTION init_user_points()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO user_points (user_id, balance)
    VALUES (NEW.id, 100)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
    VALUES (NEW.id, 100, 'registration', 0, 100, jsonb_build_object('welcome_bonus', true));
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user_points for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_user_points_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION init_user_points();
```

## RLS (Row Level Security) Policies

All three tables have RLS enabled:

**user_stats:**
- Users can view their own stats: `auth.uid() = user_id`
- Service role can modify: `auth.role() = 'service_role'`

**user_points:**
- Users can view their own points: `auth.uid() = user_id`
- Service role can modify: `auth.role() = 'service_role'`

**point_transactions:**
- Users can view their own transactions: `auth.uid() = user_id`
- Service role can insert: `auth.role() = 'service_role'`

## What I've Tried

1. ✅ Added error handling with BEGIN...EXCEPTION blocks
2. ✅ Added `ON CONFLICT DO NOTHING` to prevent duplicate key errors
3. ✅ Added `SECURITY DEFINER` to functions
4. ✅ Verified all tables exist
5. ✅ Verified all columns exist
6. ❌ Signups still fail when triggers are enabled

## Key Observations

- When I run this, signups work:
  ```sql
  ALTER TABLE users DISABLE TRIGGER create_user_stats_trigger;
  ALTER TABLE users DISABLE TRIGGER create_user_points_trigger;
  ```

- When I run this, signups fail again:
  ```sql
  ALTER TABLE users ENABLE TRIGGER create_user_stats_trigger;
  ALTER TABLE users ENABLE TRIGGER create_user_points_trigger;
  ```

- Even with error handling, the triggers seem to block the entire signup process

## What I Need Help With

1. **Why are the triggers blocking signups despite error handling?** The EXCEPTION block should catch errors and let the signup continue, but it doesn't.

2. **Could RLS policies be blocking the trigger functions?** Even though I have `SECURITY DEFINER`, maybe the policies are still enforced?

3. **Is there a better way to structure these triggers?** Should they be BEFORE triggers instead of AFTER? Should I use different timing?

4. **How can I make these triggers truly non-blocking?** I need user signups to ALWAYS succeed, even if stats/points creation fails.

5. **What's the best practice for this pattern?** Creating related records (stats, points) when a user signs up is common - what's the PostgreSQL/Supabase recommended approach?

## Additional Context

- Using Supabase (PostgreSQL 15)
- Frontend: React + TypeScript
- Auth: Supabase Auth API
- This is a production app with existing users
- Tables were created via migrations and already have data
- The gamification migration was run successfully (tables exist)

## Ideal Solution

I want both triggers to:
- ✅ Run automatically when users sign up
- ✅ Create stats and points records
- ✅ NEVER block the signup process, even if they fail
- ✅ Log warnings/errors if something goes wrong
- ✅ Work with Supabase Auth's automatic user creation

Please provide:
1. Diagnosis of why current triggers fail
2. Corrected trigger/function code
3. Any necessary RLS policy changes
4. Alternative approaches if triggers aren't the right solution

Thank you!
