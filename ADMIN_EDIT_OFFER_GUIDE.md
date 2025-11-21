# 🎯 Admin Guide: How to Use Edit Offer & Auto-Relist

## Step-by-Step Instructions for Admins

### 1️⃣ Access Partner's Offers
1. Open Admin Dashboard
2. Click on **"Partners"** tab
3. Find the partner you want to manage
4. Click the **eye icon (👁️)** to view their offers

### 2️⃣ Edit an Offer
You'll see a table with all partner's offers. For each offer, there are now **4 action buttons**:

```
┌────────────────────────────────────────────────────────────┐
│ Title         │ Category │ Price │ Qty │ Status │ Actions │
├────────────────────────────────────────────────────────────┤
│ Fresh Bread   │ BAKERY   │ $3.50 │ 20  │ Active │  📝 ▶ ⏸ 🗑 │
└────────────────────────────────────────────────────────────┘
                                                    ↑
                                                    NEW!
```

**Action Buttons:**
- 📝 **Edit** (blue) - Edit offer details and enable auto-relist
- ▶️ **Resume** (green) - Resume paused offer
- ⏸️ **Pause** (orange) - Pause active offer  
- 🗑️ **Delete** (red) - Delete offer permanently

### 3️⃣ Edit Offer Details

Click the **📝 Edit** button to open the edit dialog:

```
╔═══════════════════════════════════════════════════════╗
║                    Edit Offer                         ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Title                                                ║
║  ┌─────────────────────────────────────────────────┐ ║
║  │ Fresh Artisan Bread                             │ ║
║  └─────────────────────────────────────────────────┘ ║
║                                                       ║
║  Description                                          ║
║  ┌─────────────────────────────────────────────────┐ ║
║  │ Baked fresh daily with organic ingredients      │ ║
║  │                                                  │ ║
║  └─────────────────────────────────────────────────┘ ║
║                                                       ║
║  Price ($)              Quantity                      ║
║  ┌─────────────────┐   ┌──────────────────────────┐ ║
║  │ 3.50            │   │ 20                       │ ║
║  └─────────────────┘   └──────────────────────────┘ ║
║                                                       ║
║  ┌─────────────────────────────────────────────────┐ ║
║  │ 🔄 Auto-Relist Daily                    [  ON] │ ║
║  │                                                 │ ║
║  │ Automatically relist this offer every day      │ ║
║  │ when business opens until closing time         │ ║
║  └─────────────────────────────────────────────────┘ ║
║                                                       ║
║           [ Cancel ]      [ Save Changes ]            ║
╚═══════════════════════════════════════════════════════╝
```

### 4️⃣ Enable Auto-Relist

**What is Auto-Relist?**
When enabled, the system will automatically "refresh" this offer every day during the partner's business hours. This keeps the offer visible and fresh in the marketplace.

**To Enable:**
1. In the Edit Offer dialog, find the **"Auto-Relist Daily"** section
2. Toggle the switch to **ON** (blue)
3. Click **"Save Changes"**

**What Happens Next:**
- Every day when the business opens, the offer gets automatically relisted
- The offer appears fresh and new to customers
- No manual work required from partner or admin
- Works only during business hours (respects open/close times)

### 5️⃣ Example Use Cases

#### 🥐 Bakery - Daily Fresh Items
```
Offer: "Yesterday's Pastries - $2"
Auto-Relist: ON
Business Hours: 6:00 AM - 8:00 PM

Result: 
- 6:00 AM: Offer automatically relisted
- Customers see fresh listing
- Repeats every day
```

#### 🍕 Restaurant - Lunch Specials
```
Offer: "Lunch Special - Pizza Slice"
Auto-Relist: ON
Business Hours: 11:00 AM - 10:00 PM

Result:
- 11:00 AM: Offer appears fresh
- Available throughout business day
- Next day: Automatically relisted at 11:00 AM
```

#### 🏪 24-Hour Store
```
Offer: "Night Snacks Deal"
Auto-Relist: ON
Business Hours: 24 Hours

Result:
- Relisted at any time during the day
- Always stays fresh
```

## 📋 Setup Requirements (One-Time)

Before auto-relist works, you need to:

### ✅ Step 1: Run Database Migration
1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Copy content from: `supabase/migrations/20251117_add_auto_relist_feature.sql`
4. Paste and run

### ✅ Step 2: Deploy Edge Function
Run in terminal:
```bash
deploy-auto-relist.bat
```

Or manually:
```bash
supabase functions deploy auto-relist-offers
```

### ✅ Step 3: Set Up Cron Job
In Supabase SQL Editor, run:

```sql
-- Run every hour to check and relist offers
SELECT cron.schedule(
  'auto-relist-offers-hourly',
  '0 * * * *',
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

**Replace** `your-project-ref` with your actual Supabase project reference.

## ❓ FAQ

**Q: What if I disable auto-relist?**  
A: Simply edit the offer and toggle it OFF. The offer will stop relisting automatically.

**Q: Can I edit other fields too?**  
A: Yes! You can edit title, description, price, quantity, and auto-relist all at once.

**Q: What happens if business is closed?**  
A: The system checks business hours. It only relists during open hours.

**Q: Will it create duplicate listings?**  
A: No, the system tracks the last relist date and prevents duplicates.

**Q: Can I see when an offer was last relisted?**  
A: Check the `last_relisted_at` column in the offers table in Supabase.

## 🎉 Benefits

✅ **Time Saver** - No daily manual relisting needed  
✅ **Consistent** - Offers always appear fresh  
✅ **Automated** - Works 24/7 without intervention  
✅ **Smart** - Respects business hours  
✅ **Flexible** - Enable/disable per offer  

---

**Need Help?** Check `AUTO_RELIST_SETUP_GUIDE.md` for technical details.
