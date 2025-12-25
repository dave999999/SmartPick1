# 🚀 ADVANCED NOTIFICATION SYSTEM - DEPLOYMENT GUIDE

## Overview

This guide walks you through deploying the "self-driving" notification system with:
- ✅ Anti-spam batching (groups notifications every 5 minutes)
- ✅ Passive confirmation flow (asks partner instead of auto-punishing)
- ✅ Trust scores (0-100 reliability indicator)
- ✅ Context-aware messages (⭐ high trust, ⚠️ low trust)
- ✅ Smart per-partner config (silent hours, custom thresholds)

---

## STEP 1: Database Schema Update

### 1.1 Execute SQL Migration

Open Supabase SQL Editor and run:

```bash
File: STEP1_SMART_NOTIFICATION_SCHEMA.sql
```

This creates:
- `notification_queue` table (batching)
- `user_reliability` table (trust scores)
- `confirmation_status_enum` type
- Partner smart config columns
- Helper function `update_user_reliability_score()`
- `notification_context` view

### 1.2 Verify Tables Created

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('notification_queue', 'user_reliability');

-- Check partner columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'partners' 
AND column_name IN ('low_stock_threshold', 'batching_enabled', 'silent_hours');

-- Check enum created
SELECT enum_range(NULL::confirmation_status_enum);
```

Expected output:
```
notification_queue
user_reliability

low_stock_threshold
batching_window_minutes
batching_enabled
silent_hours

{none,pending_partner,confirmed,denied}
```

---

## STEP 2: Deploy Edge Functions

### 2.1 Deploy Passive Confirmation Function

```bash
cd supabase/functions
supabase functions deploy detect-missed-scans
```

**What it does:**
- Runs every hour via cron
- Finds reservations where QR not scanned
- Asks partner via Telegram inline buttons
- Auto-confirms after 24h (benefit of doubt)

### 2.2 Deploy Batching Function

```bash
supabase functions deploy flush-notification-queue
```

**What it does:**
- Runs every 5 minutes via cron
- Groups pending notifications by partner
- Sends summaries ("🚀 5 New Orders, 1 Cancellation")
- Respects silent hours

### 2.3 Update Telegram Webhook (Already Done)

The telegram-webhook function has been updated to handle inline button callbacks:
- `confirm_pickup:{reservation_id}` → Marks as picked up
- `confirm_noshow:{reservation_id}` → Records no-show

```bash
supabase functions deploy telegram-webhook
```

---

## STEP 3: Set Up Cron Jobs

### Option A: Supabase Dashboard (Recommended)

1. Go to **Database** → **Cron Jobs** (pg_cron extension)
2. Click **Enable pg_cron** if not enabled
3. Add two jobs:

**Job 1: Passive Confirmation Check**
```sql
-- Name: passive-confirmation-check
-- Schedule: 0 * * * * (every hour)
-- Command:
SELECT net.http_post(
  url:='https://YOUR_PROJECT.supabase.co/functions/v1/detect-missed-scans',
  headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'
) as request_id;
```

**Job 2: Flush Notification Queue**
```sql
-- Name: flush-notification-queue
-- Schedule: */5 * * * * (every 5 minutes)
-- Command:
SELECT net.http_post(
  url:='https://YOUR_PROJECT.supabase.co/functions/v1/flush-notification-queue',
  headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'
) as request_id;
```

### Option B: SQL Script

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Passive confirmation check (hourly)
SELECT cron.schedule(
  'passive-confirmation-check',
  '0 * * * *',
  $$SELECT net.http_post(
    url:='https://YOUR_PROJECT.supabase.co/functions/v1/detect-missed-scans',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY_HERE"}'
  ) as request_id;$$
);

-- Flush notification queue (every 5 minutes)
SELECT cron.schedule(
  'flush-notification-queue',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url:='https://YOUR_PROJECT.supabase.co/functions/v1/flush-notification-queue',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY_HERE"}'
  ) as request_id;$$
);

-- Verify jobs created
SELECT * FROM cron.job;
```

---

## STEP 4: Frontend Integration

### 4.1 Update Reservation Creation

When creating a reservation, pass `partnerUUID` (not just `partnerId`):

**File: `src/pages/ReservationsPage.tsx` (or wherever reservations are created)**

```typescript
import { notifyPartnerNewReservation } from '@/lib/telegram';
import { getCustomerName } from '@/lib/notificationQueue';

// After reservation created successfully
const customerName = await getCustomerName(userId);

await notifyPartnerNewReservation(
  offer.partner_id,        // user_id (for legacy compatibility)
  offer.partners.id,       // UUID from partners table (NEW)
  customerName,
  userId,                  // customer_id (for trust indicator)
  offer.title,
  quantity,
  pickupBy
);
```

### 4.2 Update Cancellation Handler

**File: `src/components/ReservationCard.tsx` (or wherever cancellations happen)**

```typescript
import { notifyPartnerReservationCancelled } from '@/lib/telegram';
import { getCustomerName } from '@/lib/notificationQueue';

// After cancellation successful
const customerName = await getCustomerName(reservation.customer_id);

await notifyPartnerReservationCancelled(
  reservation.offers.partner_id,    // user_id
  reservation.offers.partners.id,   // UUID from partners table
  customerName,
  reservation.customer_id,          // for trust indicator
  reservation.offers.title,
  reservation.quantity
);
```

### 4.3 Update Low Stock Alerts

**File: Wherever stock is updated**

```typescript
import { notifyPartnerLowStock } from '@/lib/telegram';

// After stock update, check threshold
const { data: partner } = await supabase
  .from('partners')
  .select('low_stock_threshold')
  .eq('id', offer.partners.id)
  .single();

const threshold = partner?.low_stock_threshold || 2;

if (newQuantity <= threshold && oldQuantity > threshold) {
  await notifyPartnerLowStock(
    offer.partner_id,       // user_id
    offer.partners.id,      // UUID
    offer.title,
    newQuantity
  );
}
```

---

## STEP 5: Testing

### 5.1 Test Batching System

```sql
-- Manually insert test notifications
INSERT INTO notification_queue (partner_id, message_type, message_text, metadata)
VALUES 
  ('YOUR_PARTNER_UUID', 'new_order', '🎉 Test Order 1', '{"test": true}'),
  ('YOUR_PARTNER_UUID', 'new_order', '🎉 Test Order 2', '{"test": true}'),
  ('YOUR_PARTNER_UUID', 'cancellation', '❌ Test Cancellation', '{"test": true}');

-- Wait 5 minutes for cron job OR manually trigger:
SELECT net.http_post(
  url:='https://YOUR_PROJECT.supabase.co/functions/v1/flush-notification-queue',
  headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'
);

-- Check if processed
SELECT * FROM notification_queue WHERE processed_at IS NOT NULL;
```

Expected: Partner receives ONE Telegram message summarizing all 3 notifications.

### 5.2 Test Passive Confirmation

```sql
-- Create a test expired reservation
INSERT INTO reservations (customer_id, offer_id, quantity, status, pickup_by, confirmation_status)
VALUES (
  'CUSTOMER_UUID',
  'OFFER_UUID',
  1,
  'active',
  NOW() - INTERVAL '1 hour',  -- Already expired
  'none'
);

-- Manually trigger detection:
SELECT net.http_post(
  url:='https://YOUR_PROJECT.supabase.co/functions/v1/detect-missed-scans',
  headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'
);

-- Check reservation updated
SELECT id, confirmation_status, confirmation_requested_at 
FROM reservations 
WHERE id = 'YOUR_TEST_RESERVATION_ID';
```

Expected:
1. `confirmation_status` changes to `pending_partner`
2. Partner receives Telegram message with buttons
3. Clicking "✅ Yes, Picked Up" marks as confirmed
4. Clicking "❌ No, They didn't come" records no-show

### 5.3 Test Trust Scores

```sql
-- Simulate user actions
SELECT update_user_reliability_score('CUSTOMER_UUID', 'completed');  -- +2
SELECT update_user_reliability_score('CUSTOMER_UUID', 'completed');  -- +2
SELECT update_user_reliability_score('CUSTOMER_UUID', 'missed');     -- -15

-- Check score
SELECT * FROM user_reliability WHERE user_id = 'CUSTOMER_UUID';
-- Should show reliability_score around 89 (100 + 2 + 2 - 15)

-- Test trust indicator in notification
INSERT INTO notification_queue (partner_id, message_type, message_text, metadata)
VALUES (
  'PARTNER_UUID',
  'new_order',
  '<b>Customer:</b> Test User',
  '{"customer_id": "CUSTOMER_UUID"}'::jsonb
);

-- Flush queue and check message contains ⭐ or ⚠️ based on score
```

---

## STEP 6: Partner Configuration (Optional)

Partners can customize their notification behavior:

```sql
-- Set custom low stock threshold (default: 2)
UPDATE partners 
SET low_stock_threshold = 5 
WHERE id = 'PARTNER_UUID';

-- Disable batching (receive every notification immediately)
UPDATE partners 
SET batching_enabled = false 
WHERE id = 'PARTNER_UUID';

-- Set silent hours (no notifications between 23:00 - 07:00)
UPDATE partners 
SET silent_hours = '{"start": 23, "end": 7}'::jsonb 
WHERE id = 'PARTNER_UUID';

-- Set custom batching window (group every 10 minutes instead of 5)
UPDATE partners 
SET batching_window_minutes = 10 
WHERE id = 'PARTNER_UUID';
```

---

## STEP 7: Monitoring

### 7.1 Check Cron Job Status

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- Check if jobs are running
SELECT 
  jobid, 
  jobname, 
  schedule, 
  active,
  last_run,
  next_run
FROM cron.job;
```

### 7.2 Monitor Notification Queue

```sql
-- Pending notifications
SELECT COUNT(*) as pending FROM notification_queue WHERE processed_at IS NULL;

-- Processing rate
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as created,
  COUNT(processed_at) as processed
FROM notification_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Average batch size
SELECT 
  batch_id,
  COUNT(*) as notifications_in_batch
FROM notification_queue
WHERE batch_id IS NOT NULL
GROUP BY batch_id
ORDER BY notifications_in_batch DESC;
```

### 7.3 Monitor Trust Scores

```sql
-- User reliability distribution
SELECT 
  CASE 
    WHEN reliability_score >= 95 THEN '⭐ High (95+)'
    WHEN reliability_score >= 85 THEN '✅ Good (85-94)'
    WHEN reliability_score >= 70 THEN '⚠️ Caution (70-84)'
    ELSE '🔴 Low (<70)'
  END as trust_level,
  COUNT(*) as users
FROM user_reliability
GROUP BY 
  CASE 
    WHEN reliability_score >= 95 THEN '⭐ High (95+)'
    WHEN reliability_score >= 85 THEN '✅ Good (85-94)'
    WHEN reliability_score >= 70 THEN '⚠️ Caution (70-84)'
    ELSE '🔴 Low (<70)'
  END
ORDER BY 
  CASE 
    WHEN trust_level LIKE '⭐%' THEN 1
    WHEN trust_level LIKE '✅%' THEN 2
    WHEN trust_level LIKE '⚠️%' THEN 3
    ELSE 4
  END;
```

### 7.4 Monitor Passive Confirmations

```sql
-- Confirmation status breakdown
SELECT 
  confirmation_status,
  COUNT(*) as count
FROM reservations
WHERE confirmation_status != 'none'
GROUP BY confirmation_status;

-- Auto-confirmation rate (benefit of doubt)
SELECT 
  COUNT(*) FILTER (WHERE auto_confirmed = true) as auto_confirmed,
  COUNT(*) FILTER (WHERE auto_confirmed = false) as manually_confirmed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE auto_confirmed = true) / COUNT(*), 1) as auto_confirm_percentage
FROM reservations
WHERE confirmation_status = 'confirmed';
```

---

## STEP 8: Partner Dashboard UI (Optional Enhancement)

Add a settings panel to allow partners to configure preferences via UI:

```typescript
// Example: PartnerNotificationSettings.tsx enhancement

const [lowStockThreshold, setLowStockThreshold] = useState(2);
const [batchingEnabled, setBatchingEnabled] = useState(true);
const [silentHours, setSilentHours] = useState({ start: 23, end: 7 });

const handleSaveAdvancedSettings = async () => {
  const { error } = await supabase
    .from('partners')
    .update({
      low_stock_threshold: lowStockThreshold,
      batching_enabled: batchingEnabled,
      silent_hours: silentHours,
    })
    .eq('id', partnerId);
  
  if (!error) {
    toast.success('Advanced settings saved!');
  }
};
```

---

## Troubleshooting

### Notifications Not Batching

1. **Check cron job is running:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'flush-notification-queue';
   ```

2. **Check notification age:**
   ```sql
   SELECT id, created_at, 
          EXTRACT(EPOCH FROM (NOW() - created_at))/60 as age_minutes
   FROM notification_queue 
   WHERE processed_at IS NULL;
   ```
   Notifications batch only after `batching_window_minutes` (default 5).

3. **Check partner has Telegram:**
   ```sql
   SELECT p.id, p.batching_enabled, np.telegram_chat_id
   FROM partners p
   LEFT JOIN notification_preferences np ON p.user_id = np.user_id
   WHERE p.id = 'PARTNER_UUID';
   ```

### Passive Confirmation Not Working

1. **Check enum exists:**
   ```sql
   SELECT enum_range(NULL::confirmation_status_enum);
   ```

2. **Check reservation status:**
   ```sql
   SELECT id, status, confirmation_status, pickup_by
   FROM reservations
   WHERE pickup_by < NOW() AND status = 'active';
   ```

3. **Check Edge Function logs:**
   ```bash
   supabase functions logs detect-missed-scans
   ```

### Trust Scores Not Updating

1. **Check function exists:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'update_user_reliability_score';
   ```

2. **Manually test function:**
   ```sql
   SELECT update_user_reliability_score('USER_UUID', 'completed');
   SELECT * FROM user_reliability WHERE user_id = 'USER_UUID';
   ```

---

## Rollback Plan

If issues occur, you can disable the advanced features:

```sql
-- Disable batching for all partners (immediate notifications)
UPDATE partners SET batching_enabled = false;

-- Disable cron jobs
SELECT cron.unschedule('passive-confirmation-check');
SELECT cron.unschedule('flush-notification-queue');

-- Clear notification queue (process immediately)
UPDATE notification_queue SET processed_at = NOW() WHERE processed_at IS NULL;
```

---

## Success Metrics

After 1 week of deployment, measure:

1. **Notification Spam Reduction:**
   ```sql
   SELECT 
     COUNT(DISTINCT batch_id) as batches_sent,
     COUNT(*) as total_notifications,
     ROUND(COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT batch_id), 0), 1) as avg_per_batch
   FROM notification_queue
   WHERE processed_at > NOW() - INTERVAL '7 days';
   ```
   Target: >3 notifications per batch (spam reduced by 3x)

2. **Auto-Confirmation Rate:**
   ```sql
   SELECT 
     ROUND(100.0 * COUNT(*) FILTER (WHERE auto_confirmed = true) / COUNT(*), 1) as auto_confirm_pct
   FROM reservations
   WHERE confirmation_status = 'confirmed'
   AND confirmation_resolved_at > NOW() - INTERVAL '7 days';
   ```
   Target: <50% (means partners are actively confirming)

3. **User Reliability Distribution:**
   ```sql
   SELECT 
     AVG(reliability_score) as avg_score,
     PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY reliability_score) as median_score
   FROM user_reliability;
   ```
   Target: Avg >85 (most users are reliable)

---

## 🎉 Deployment Complete!

Your notification system is now "self-driving":
- ✅ Partners get batched summaries, not spam
- ✅ Passive confirmation prevents false no-shows
- ✅ Trust scores inform partners without auto-banning
- ✅ Smart config respects partner preferences

**Next Steps:**
1. Monitor for 1 week
2. Gather partner feedback
3. Adjust thresholds if needed (batching window, trust score penalties)
4. Consider adding partner UI for advanced settings
