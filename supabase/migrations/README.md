# SmartPick Database Migrations

This folder contains SQL migration files for your Supabase database.

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***
2. Navigate to **SQL Editor** in the left sidebar
3. Open the migration file you want to apply
4. Copy the SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref ***REMOVED_PROJECT_ID***

# Run all pending migrations
supabase db push
```

## Available Migrations

### 20250131_add_fast_food_alcohol_categories.sql
Adds FAST_FOOD and ALCOHOL business types to the partners table.

**Status**: Apply this if you want to support Fast Food and Alcohol/Wine partners.

### 20250131_fix_partner_status_constraint.sql
Fixes the partner status constraint to include all valid statuses.

**Status**: ⚠️ **CRITICAL** - Apply this NOW if you're getting errors when approving partners in the admin panel.

**Error it fixes**:
```
new row for relation "partners" violates check constraint "valid_partner_status"
```

## Migration Order

Apply migrations in this order:
1. `20250131_add_fast_food_alcohol_categories.sql`
2. `20250131_fix_partner_status_constraint.sql` ⚠️ Required

## Troubleshooting

### Error: "constraint already exists"
This means the migration was already applied. You can safely ignore this error or modify the migration to use `DROP CONSTRAINT IF EXISTS` first.

### Error: "relation does not exist"
Make sure your database tables are created. Run the initial schema migrations first.

## Need Help?

If you encounter any issues:
1. Check the Supabase dashboard logs
2. Verify you're running the migrations in the correct order
3. Contact support with the specific error message
