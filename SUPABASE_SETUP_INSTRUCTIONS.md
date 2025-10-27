# SmartPick Supabase Setup Instructions

Your Supabase credentials have been configured! Follow these steps to complete the setup.

## ✅ Step 1: Environment Variables (Already Done)

The `.env` file has been created with your credentials:
- **Supabase URL**: https://ggzhtpaxnhwcilomswtm.supabase.co
- **Anon Key**: sb_publishable_dVm47b2kOOKDT530AGJYNg_9zOt4uxX

## 📋 Step 2: Run Database Setup Script

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/sql
   - Or navigate to: Dashboard → SQL Editor

2. **Create New Query**:
   - Click "New Query" button

3. **Copy and Paste**:
   - Open the file: `/workspace/shadcn-ui/supabase-setup.sql`
   - Copy ALL the SQL code
   - Paste it into the SQL Editor

4. **Execute the Script**:
   - Click "Run" or press `Ctrl/Cmd + Enter`
   - Wait for the success message: "Success. No rows returned"

This script will create:
- ✅ All database tables (users, partners, offers, reservations)
- ✅ Indexes for performance optimization
- ✅ Row Level Security (RLS) policies
- ✅ Storage buckets for images
- ✅ Triggers for auto-updating timestamps
- ✅ Functions for auto-expiring offers and reservations

## 🔐 Step 3: Configure Google OAuth (Required for Sign-In)

1. **Go to Google Cloud Console**:
   - Visit: https://console.cloud.google.com
   - Create a new project or select existing one

2. **Enable Google+ API**:
   - Go to: APIs & Services → Library
   - Search for "Google+ API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**:
   - Go to: APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "SmartPick"

4. **Add Authorized Redirect URIs**:
   ```
   https://ggzhtpaxnhwcilomswtm.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback
   ```

5. **Copy Client ID and Secret**:
   - Save these for the next step

6. **Configure in Supabase**:
   - Go to: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/auth/providers
   - Find "Google" provider
   - Toggle "Enable Google"
   - Paste your Client ID and Client Secret
   - Click "Save"

## 🚀 Step 4: Restart the Application

1. **Stop the current preview** (if running)

2. **Restart with new environment**:
   ```bash
   cd /workspace/shadcn-ui
   pnpm run dev
   ```

3. **The app should now**:
   - ✅ Connect to your Supabase database
   - ✅ Exit demo mode
   - ✅ Enable Google sign-in
   - ✅ Allow creating real offers and reservations

## 🧪 Step 5: Test the Setup

1. **Sign Up**:
   - Click "Sign In" button
   - Sign in with Google
   - Your user profile will be automatically created

2. **Become a Partner** (Optional):
   - Click "Become a Partner"
   - Fill out the application form
   - You'll need to manually approve yourself as admin (see below)

3. **Approve Your Partner Application** (If needed):
   - Go to Supabase Dashboard → Table Editor → `partners`
   - Find your partner record
   - Change `status` from `PENDING` to `APPROVED`
   - Or run this SQL:
     ```sql
     UPDATE partners 
     SET status = 'APPROVED' 
     WHERE email = 'your-email@gmail.com';
     ```

4. **Create Your First Offer**:
   - Go to Partner Dashboard
   - Click "Create New Offer"
   - Fill in the details
   - Your offer will appear on the homepage!

## 📊 Verify Database Setup

Run this query in SQL Editor to check all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- ✅ users
- ✅ partners
- ✅ offers
- ✅ reservations

## 🔧 Troubleshooting

### Issue: "supabaseUrl is required" error
**Solution**: Make sure the `.env` file exists and restart the dev server

### Issue: Can't sign in with Google
**Solution**: 
1. Check Google OAuth is configured in Supabase
2. Verify redirect URIs are correct
3. Make sure Google+ API is enabled

### Issue: Can't create offers
**Solution**: 
1. Make sure you're signed in
2. Check your partner status is "APPROVED" in the database
3. Verify RLS policies are enabled

### Issue: Images not uploading
**Solution**: 
1. Check storage buckets exist: `offer-images` and `partner-images`
2. Verify storage policies are created
3. Check file size (max 50MB)

## 📚 Additional Resources

- **Supabase Dashboard**: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm
- **Database Tables**: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/editor
- **SQL Editor**: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/sql
- **Storage**: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/storage/buckets
- **Authentication**: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/auth/users

## 🎉 You're All Set!

Once you complete these steps, SmartPick will be fully functional with:
- ✅ Real-time offer updates
- ✅ User authentication
- ✅ Partner dashboard
- ✅ Reservation system with QR codes
- ✅ Image uploads
- ✅ Admin panel

Happy SmartPicking! 🎯