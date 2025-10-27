# Admin User Setup Instructions for SmartPick

## 🔐 Creating Your Admin Account

Since SmartPick uses Supabase Authentication, you need to create the admin user through Supabase Dashboard first, then link it to your database.

### Method 1: Through Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your SmartPick project

2. **Create Authentication User**
   - Go to: **Authentication** → **Users** → **Add User**
   - Click "Create new user"
   - Enter:
     - **Email:** `admin@smartpick.ge` (or your preferred admin email)
     - **Password:** Choose a strong password (e.g., `SmartPick2025!Admin`)
     - **Auto Confirm User:** ✅ Check this box
   - Click "Create user"
   - **Copy the User ID (UUID)** that appears

3. **Add to Users Table**
   - Go to: **SQL Editor**
   - Run this query (replace `YOUR_AUTH_USER_ID` with the UUID you copied):

```sql
INSERT INTO users (
  id,
  email,
  name,
  phone,
  role,
  created_at,
  updated_at
) VALUES (
  'YOUR_AUTH_USER_ID', -- Replace with the UUID from step 2
  'admin@smartpick.ge',
  'Admin User',
  '+995555000000',
  'ADMIN',
  NOW(),
  NOW()
);
```

4. **Login to SmartPick**
   - Go to your SmartPick app
   - Click "Sign In"
   - Use:
     - **Email:** `admin@smartpick.ge`
     - **Password:** (the password you set in step 2)

---

### Method 2: Using Supabase API (Advanced)

If you prefer to use the API, you can create the user programmatically:

```javascript
// In Supabase Dashboard > SQL Editor, run:
SELECT auth.create_user(
  'admin@smartpick.ge',
  'SmartPick2025!Admin',
  true -- auto confirm
);
```

Then follow step 3 from Method 1 to add to users table.

---

## 📋 Your Admin Credentials

After setup, your admin login will be:

- **Email:** `admin@smartpick.ge` (or the email you chose)
- **Password:** (the password you set in Supabase)
- **Role:** ADMIN
- **Access:** Full admin panel access at `/admin`

---

## ⚠️ Important Notes

1. **Change the password** after first login for security
2. **Store credentials securely** - don't share the admin password
3. **The User ID must match** between `auth.users` and your `users` table
4. **Role must be 'ADMIN'** (uppercase) to access admin features

---

## 🔍 Verify Admin Access

After creating the admin user:

1. Sign in to SmartPick
2. You should see "Admin Panel" button in the header
3. Click it to access `/admin` route
4. You should see admin dashboard with full controls

---

## 🆘 Troubleshooting

**Problem:** Can't sign in
- ✅ Check email is confirmed in Supabase Dashboard
- ✅ Verify user exists in both `auth.users` and `users` table
- ✅ Check password is correct

**Problem:** No admin access
- ✅ Verify `role` field is exactly 'ADMIN' (uppercase)
- ✅ Check user ID matches between tables

**Problem:** 404 on /admin
- ✅ Verify AdminPanel.tsx exists in src/pages/
- ✅ Check App.tsx has the admin route configured

---

## 🎯 Next Steps

Once admin is created:
1. Test login with admin credentials
2. Access admin panel at `/admin`
3. Start managing partners and offers
4. Create additional admin users if needed

Need help? Let me know!