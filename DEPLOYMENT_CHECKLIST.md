# ✅ Gamification Deployment Checklist

## 📋 Follow These Steps In Order

### Step 1: Database Setup (Supabase)
Open: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql/new

**Script 1: RESTORE_GAMIFICATION.sql**
- [ ] Open Supabase SQL Editor
- [ ] Paste entire `RESTORE_GAMIFICATION.sql` file
- [ ] Click "Run" button
- [ ] ✅ See "GAMIFICATION SYSTEM RESTORED!" message
- [ ] ✅ Confirm tables exist: partner_points, partner_point_transactions
- [ ] ✅ Confirm functions exist: add_user_points, add_partner_points

**Script 2: ADD_PURCHASE_FUNCTIONS.sql**
- [ ] Click "New Query" in SQL Editor
- [ ] Paste entire `ADD_PURCHASE_FUNCTIONS.sql` file
- [ ] Click "Run" button
- [ ] ✅ See "PURCHASE FUNCTIONS ADDED!" message
- [ ] ✅ Confirm functions exist: purchase_user_points, purchase_partner_offer_slot

---

### Step 2: Edge Function Deployment (Terminal)

**Open PowerShell in project directory:**

**Login to Supabase:**
```powershell
supabase login
```
- [ ] Browser opens for authentication
- [ ] Complete login
- [ ] ✅ See "Logged in successfully" in terminal

**Link Project:**
```powershell
supabase link --project-ref ***REMOVED_PROJECT_ID***
```
- [ ] Enter database password when prompted
- [ ] ✅ See "Linked to project" message

**Deploy Edge Function:**
```powershell
supabase functions deploy mark-pickup
```
- [ ] Wait for deployment
- [ ] ✅ See "Function deployed successfully" message
- [ ] ✅ Note the function URL shown

---

### Step 3: Verify Deployment

**Refresh Browser:**
- [ ] Hard refresh: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
- [ ] Clear cache if needed

**Test User Profile:**
- [ ] Navigate to Profile page
- [ ] ✅ See "Wallet" tab (not just Overview/Settings)
- [ ] Click Wallet tab
- [ ] ✅ SmartPoints balance showing
- [ ] ✅ "Buy Points" button visible
- [ ] ✅ No "Gamification Coming Soon" warning

**Test Partner Dashboard:**
- [ ] Navigate to Partner Dashboard
- [ ] ✅ Partner points balance showing
- [ ] ✅ Offer slots count showing
- [ ] ✅ Can see "Purchase Slot" option

**Test Pickup Flow:**
- [ ] Create test reservation (or use existing)
- [ ] Partner marks as "Picked Up"
- [ ] ✅ Success message appears
- [ ] ✅ Console shows: "Points awarded: { customer: 5, partner: 5 }"
- [ ] ✅ No errors in console
- [ ] Check user profile → Wallet → Points increased by 5
- [ ] Check partner dashboard → Points increased by 5

---

## 🎉 Success Indicators

When everything works correctly, you'll see:

✅ **User Profile:**
- Wallet tab with point balance
- Buy Points button functional
- Recent transactions list
- No "coming soon" warnings

✅ **Partner Dashboard:**
- Partner points balance visible
- Offer slots counter
- Purchase slot option (100 points)
- Transaction history

✅ **Pickup Flow:**
- Marks reservation as PICKED_UP
- Awards 5 points to customer
- Awards 5 points to partner
- Logs both transactions
- No console errors

---

## ❌ Troubleshooting

**Issue: "Gamification Features Coming Soon" still showing**
- ✅ Check: Did you run BOTH SQL scripts?
- ✅ Check: Did you hard refresh browser? (Ctrl+Shift+R)
- ✅ Fix: Run both SQL scripts again, then refresh

**Issue: "Edge Function not found" error**
- ✅ Check: Did you run `supabase functions deploy mark-pickup`?
- ✅ Check: Any errors during deployment?
- ✅ Fix: Re-run deployment command

**Issue: "Permission denied" on pickup**
- ✅ Check: Is Edge Function deployed?
- ✅ Check: Is code pushed to GitHub and Vercel deployed?
- ✅ Fix: Push code, wait for Vercel deploy, refresh browser

**Issue: No points awarded on pickup**
- ✅ Check: Console for errors
- ✅ Check: Edge Function deployed correctly
- ✅ Check: SQL functions exist in database
- ✅ Fix: Check Supabase Functions logs for errors

---

## 🆘 Quick Verification Commands

**Check if tables exist:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('partner_points', 'partner_point_transactions');
```
Should return 2 rows.

**Check if functions exist:**
```sql
SELECT proname FROM pg_proc 
WHERE proname IN ('add_user_points', 'add_partner_points', 'purchase_user_points', 'purchase_partner_offer_slot');
```
Should return 4 rows.

**Check Edge Function is deployed:**
Visit: https://***REMOVED_PROJECT_ID***.supabase.co/functions/v1/mark-pickup
Should get response (even if error - means function exists)

---

## 📞 Need Help?

1. Check terminal output for exact error messages
2. Check browser console for frontend errors
3. Check Supabase Functions logs: Dashboard → Functions → mark-pickup → Logs
4. Check database with verification queries above

---

## ✅ Final Check

Once complete, verify each of these works:

- [ ] User can see wallet with points ✅
- [ ] User can buy points ✅
- [ ] Partner can see partner points ✅
- [ ] Partner can purchase offer slots ✅
- [ ] Pickup awards points to both users ✅
- [ ] All transactions logged ✅
- [ ] No console errors ✅

**🎉 If all checked, gamification is LIVE and working 100%!**
