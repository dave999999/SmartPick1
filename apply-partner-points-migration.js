#!/usr/bin/env node

/**
 * Apply Partner Points System Migration
 *
 * This script applies the partner points system migrations to your Supabase database.
 *
 * Usage:
 *   node apply-partner-points-migration.js <SUPABASE_SERVICE_ROLE_KEY>
 *
 * To find your service role key:
 *   1. Go to https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***
 *   2. Click Settings (gear icon) → API
 *   3. Copy the "service_role" key (NOT the anon key)
 *   4. Run: node apply-partner-points-migration.js your-service-role-key-here
 */

const fs = require('fs');
const path = require('path');

// Get service role key from command line
const serviceRoleKey = process.argv[2];

if (!serviceRoleKey) {
  console.error('\n❌ Error: Service role key not provided\n');
  console.log('Usage: node apply-partner-points-migration.js <SUPABASE_SERVICE_ROLE_KEY>\n');
  console.log('To find your service role key:');
  console.log('  1. Go to https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/settings/api');
  console.log('  2. Copy the "service_role" key (NOT the anon key)');
  console.log('  3. Run: node apply-partner-points-migration.js paste-key-here\n');
  process.exit(1);
}

const SUPABASE_URL = 'https://***REMOVED_PROJECT_ID***.supabase.co';

// Read the migration SQL files
const migration1Path = path.join(__dirname, 'supabase', 'migrations', '20251108_partner_points_system.sql');
const migration2Path = path.join(__dirname, 'supabase', 'migrations', '20251108_partner_point_transfer.sql');

console.log('🔄 Applying partner points system migrations...\n');

// Execute migration using direct SQL execution
async function applyMigration(migrationSQL, migrationName) {
  try {
    console.log(`\n📝 Applying: ${migrationName}`);
    console.log('─'.repeat(80));

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        query: migrationSQL
      })
    });

    if (!response.ok) {
      // Try alternative endpoint
      const response2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          query: migrationSQL
        })
      });

      if (!response2.ok) {
        throw new Error(`HTTP ${response2.status}: ${await response2.text()}`);
      }

      const result = await response2.json();
      console.log('✅ Migration applied successfully!');
      return result;
    }

    const result = await response.json();
    console.log('✅ Migration applied successfully!');
    return result;
  } catch (error) {
    console.error(`\n❌ Error applying ${migrationName}:`);
    console.error(error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    // Apply first migration (partner points system)
    const migration1SQL = fs.readFileSync(migration1Path, 'utf8');
    await applyMigration(migration1SQL, '20251108_partner_points_system.sql');

    console.log('\n⏳ Waiting 2 seconds before next migration...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Apply second migration (point transfer on pickup)
    const migration2SQL = fs.readFileSync(migration2Path, 'utf8');
    await applyMigration(migration2SQL, '20251108_partner_point_transfer.sql');

    console.log('\n');
    console.log('═'.repeat(80));
    console.log('🎉 SUCCESS! Partner Points System is now live!');
    console.log('═'.repeat(80));
    console.log('\n📊 What was installed:\n');
    console.log('  ✅ partner_points table (tracks balance and offer slots)');
    console.log('  ✅ partner_point_transactions table (audit log)');
    console.log('  ✅ Welcome bonus: 1000 points on partner approval');
    console.log('  ✅ Pickup rewards: Points transfer from users to partners');
    console.log('  ✅ Slot system: 4 default slots, purchase more with escalating costs');
    console.log('  ✅ RLS policies and security functions');
    console.log('\n🔍 Next steps:\n');
    console.log('  1. Refresh your partner dashboard to see points display');
    console.log('  2. Test pickup flow - partner should receive points');
    console.log('  3. Try purchasing additional offer slots\n');

  } catch (error) {
    console.error('\n❌ Migration failed. Please check the error above.');
    console.error('\nIf you need help, try:');
    console.error('  1. Verify your service role key is correct');
    console.error('  2. Check Supabase dashboard for any conflicts');
    console.error('  3. Review the SQL in the migration files\n');
    process.exit(1);
  }
}

main();
