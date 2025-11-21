# Auto-Relist Offers - Setup Instructions

## Overview
This feature allows partners to automatically relist their offers every day during business hours. Admins can enable this on a per-offer basis.

## What Was Implemented

### 1. Database Migration
**File:** `supabase/migrations/20251117_add_auto_relist_feature.sql`
- Adds `auto_relist_enabled` boolean column to offers table
- Adds `last_relisted_at` timestamp column to track relisting
- Creates index for efficient querying

### 2. Admin UI Enhancement
**File:** `src/components/admin/PartnersManagement.tsx`
- Added "Edit" button for each offer in partner view
- Created Edit Offer dialog with:
  - Title field
  - Description field
  - Price field
  - Quantity field
  - **Auto-Relist Daily toggle** (main feature)
- When enabled, offers will be automatically relisted during business hours

### 3. Edge Function
**File:** `supabase/functions/auto-relist-offers/index.ts`
- Scans all offers with `auto_relist_enabled = true`
- Checks partner business hours
- Only relists during open hours (or anytime for 24h businesses)
- Prevents duplicate relisting on same day
- Updates `last_relisted_at` timestamp

## Setup Instructions

### Step 1: Run the Migration
1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Run the migration file: `supabase/migrations/20251117_add_auto_relist_feature.sql`

### Step 2: Deploy the Edge Function

#### Option A: Using Supabase CLI
```bash
# Make sure you're logged in
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy auto-relist-offers
```

#### Option B: Using the Deploy Script
```bash
# Run the deployment batch file
deploy-edge-function.bat
```

### Step 3: Set Up Daily Cron Job

#### Using Supabase Cron Extension (Recommended)
1. Go to Supabase Dashboard → Database → Extensions
2. Enable `pg_cron` extension
3. Run this SQL to create the daily job:

```sql
-- Create a cron job that runs every hour
SELECT cron.schedule(
  'auto-relist-offers-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/auto-relist-offers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);
```

Replace `your-project-ref` with your actual Supabase project reference.

#### Using External Cron Service
Alternatively, use a service like:
- **Cron-job.org** (free)
- **EasyCron**
- **GitHub Actions**

Set up a daily HTTP POST request to:
```
https://your-project-ref.supabase.co/functions/v1/auto-relist-offers
```

With header:
```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

## How It Works

### For Partners
1. Admin navigates to Partners Management
2. Clicks on a partner to view their offers
3. Clicks Edit button on any offer
4. Enables "Auto-Relist Daily" toggle
5. Saves changes

### For Users (Automatic)
1. Every hour (or as configured), the cron job triggers
2. Edge function checks all offers with auto-relist enabled
3. For each offer:
   - Checks if already relisted today → Skip if yes
   - Checks partner's business hours
   - If within business hours → Updates `last_relisted_at`
4. This ensures offers stay fresh and visible daily

## Business Hours Logic
- **24-hour businesses**: Offers relisted anytime
- **Regular hours**: Only relisted between `open_time` and `close_time`
- **Already relisted today**: Skipped to prevent duplicates

## Testing

### Test the Edge Function Manually
```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/auto-relist-offers \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Check Logs
```bash
supabase functions logs auto-relist-offers
```

## Monitoring
- Check `last_relisted_at` column in offers table
- Review Edge Function logs in Supabase Dashboard
- Check cron job execution history

## Notes
- Offers are only relisted if `status = 'ACTIVE'`
- Partner must have `status = 'APPROVED'`
- Timezone handling uses UTC (adjust in Edge Function if needed)
- Function uses Service Role Key for database access
