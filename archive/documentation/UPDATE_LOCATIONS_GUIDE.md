# Partner Location Update Guide

This guide explains how to add geographic coordinates to partner accounts so they appear on the map.

## 📋 Prerequisites

- Dummy partner accounts must be created first (run `create-dummy-data.js`)
- Supabase project must be configured

## 🎯 Two Methods Available

### Method 1: SQL Script (Recommended - Faster)

**Best for:** Quick updates, works even if RLS policies are strict

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open the file `/workspace/shadcn-ui/update-partner-locations.sql`
4. Copy the entire SQL script
5. Paste it into the SQL Editor
6. Click **RUN**
7. Check the results table to verify locations were updated

**Locations assigned:**
- **BAKERY partners** → Old Tbilisi, Saburtalo, Vake
- **RESTAURANT partners** → Rustaveli, Vera, Isani  
- **CAFE partners** → Mtatsminda, Saburtalo
- **GROCERY partners** → Gldani, Old Tbilisi

---

### Method 2: Node.js Script (Alternative)

**Best for:** Programmatic updates, easier to customize

1. Make sure you have `.env` file with Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (optional, for bypassing RLS)
   ```

2. Run the script:
   ```bash
   cd /workspace/shadcn-ui
   node update-partner-locations.js
   ```

3. You should see output like:
   ```
   ✅ Georgian Bakery #1 → Old Tbilisi (41.6919, 44.8015)
   ✅ Georgian Bakery #2 → Saburtalo (41.7225, 44.7514)
   ...
   ✨ Successfully updated 10 partner locations!
   ```

---

## 🗺️ Tbilisi Neighborhoods Used

| Neighborhood | Latitude | Longitude | Description |
|--------------|----------|-----------|-------------|
| Old Tbilisi | 41.6919 | 44.8015 | Historic center, tourist area |
| Rustaveli | 41.6941 | 44.8337 | Main avenue, cultural center |
| Saburtalo | 41.7225 | 44.7514 | University district |
| Vake | 41.6938 | 44.7866 | Upscale residential area |
| Mtatsminda | 41.6938 | 44.7929 | Mountain park area |
| Vera | 41.7151 | 44.7736 | Central district |
| Gldani | 41.7580 | 44.8015 | Northern district |
| Isani | 41.6868 | 44.8337 | Eastern district |

---

## ✅ Verification

After running either script:

1. **Check in Supabase:**
   ```sql
   SELECT business_name, business_type, latitude, longitude, address
   FROM public.partners
   ORDER BY business_type;
   ```

2. **Check in your app:**
   - Refresh the browser
   - Go to the homepage
   - Click "Map View"
   - You should see colored markers spread across Tbilisi
   - Click markers to view offer details

---

## 🐛 Troubleshooting

**Problem:** SQL script runs but no partners updated

**Solution:** Partners might not exist yet. Run `create-dummy-data.js` first.

---

**Problem:** Node.js script shows "Missing Supabase credentials"

**Solution:** Create/update `.env` file with your Supabase credentials:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

**Problem:** Markers don't appear on map

**Solution:** 
1. Check browser console for errors
2. Verify partners have offers created (run `add-offers-sql.sql`)
3. Ensure offers are ACTIVE and not expired
4. Check that latitude/longitude values are set correctly

---

## 📝 Notes

- Each business type gets distributed across 2-3 different neighborhoods
- Coordinates are realistic Tbilisi locations
- Addresses are updated to match the neighborhood
- All partners are set to city: "Tbilisi"
- The map component will automatically center on the first offer's location