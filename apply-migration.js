#!/usr/bin/env node

/**
 * Apply Database Migration Script
 *
 * This script applies the partner status constraint fix to your Supabase database.
 *
 * Usage:
 *   node apply-migration.js <SUPABASE_SERVICE_ROLE_KEY>
 *
 * To find your service role key:
 *   1. Go to https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***
 *   2. Click Settings (gear icon) → API
 *   3. Copy the "service_role" key (NOT the anon key)
 *   4. Run: node apply-migration.js your-service-role-key-here
 */

const fs = require('fs');
const path = require('path');

// Get service role key from command line
const serviceRoleKey = process.argv[2];

if (!serviceRoleKey) {
  console.error('\n❌ Error: Service role key not provided\n');
  console.log('Usage: node apply-migration.js <SUPABASE_SERVICE_ROLE_KEY>\n');
  console.log('To find your service role key:');
  console.log('  1. Go to https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/settings/api');
  console.log('  2. Copy the "service_role" key (NOT the anon key)');
  console.log('  3. Run: node apply-migration.js paste-key-here\n');
  process.exit(1);
}

const SUPABASE_URL = 'https://***REMOVED_PROJECT_ID***.supabase.co';

// Read the migration SQL
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250131_fix_partner_status_constraint.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🔄 Applying database migration...\n');
console.log('Migration SQL:');
console.log('─'.repeat(50));
console.log(migrationSQL);
console.log('─'.repeat(50));
console.log('');

// Execute the migration using Supabase SQL endpoint
async function applyMigration() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    // Try alternative endpoint if exec_sql doesn't exist
    if (response.status === 404) {
      console.log('⚠️  RPC endpoint not found, trying direct SQL execution...\n');

      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        if (!statement) continue;

        console.log(`Executing: ${statement.substring(0, 60)}...`);

        const directResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: statement })
        });

        if (!directResponse.ok) {
          const errorText = await directResponse.text();
          console.error(`❌ Failed: ${directResponse.status} ${directResponse.statusText}`);
          console.error(errorText);
        }
      }
    }

    if (response.ok) {
      console.log('✅ Migration applied successfully!\n');
      console.log('Your admin dashboard should now work without errors.');
      console.log('Partners can now be approved properly.\n');
      return true;
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('❌ Migration failed:', errorData.message || response.statusText);
      console.error('Status:', response.status);
      console.error('\nPlease apply the migration manually via Supabase Dashboard → SQL Editor');
      return false;
    }
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\n📝 Manual application instructions:');
    console.error('  1. Go to https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql/new');
    console.error('  2. Copy the SQL from: supabase/migrations/20250131_fix_partner_status_constraint.sql');
    console.error('  3. Paste it into the SQL Editor');
    console.error('  4. Click "Run" to execute\n');
    return false;
  }
}

applyMigration().then(success => {
  process.exit(success ? 0 : 1);
});
