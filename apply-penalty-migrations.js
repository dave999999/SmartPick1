#!/usr/bin/env node

/**
 * Apply Penalty System migrations
 * - 20251107_add_penalty_system.sql (columns + no_show)
 * - 20251107_lift_penalty_with_points.sql (secure RPC)
 *
 * Usage (PowerShell):
 *   node apply-penalty-migrations.js <SUPABASE_SERVICE_ROLE_KEY>
 *
 * Notes:
 *  - Uses your existing Supabase project URL hardcoded below.
 *  - Requires service_role key (NOT anon)
 */

const fs = require('fs');
const path = require('path');

const serviceRoleKey = process.argv[2];
if (!serviceRoleKey) {
  console.error('\n❌ Error: Service role key not provided\n');
  console.log('Usage: node apply-penalty-migrations.js <SUPABASE_SERVICE_ROLE_KEY>');
  console.log('\nFind it: Supabase Dashboard → Settings → API → service_role');
  process.exit(1);
}

const SUPABASE_URL = 'https://***REMOVED_PROJECT_ID***.supabase.co';

const sqlFiles = [
  path.join(__dirname, 'supabase', 'migrations', '20251107_add_penalty_system.sql'),
  path.join(__dirname, 'supabase', 'migrations', '20251107_lift_penalty_with_points.sql')
];

const sql = sqlFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n\n');

async function apply() {
  console.log('🔄 Applying Penalty System migrations to Supabase...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ Exec failed: ${res.status} ${res.statusText}`);
      console.error(text);
      console.log('\n📝 If exec_sql is not enabled on your project, run both SQL files manually in Supabase → SQL Editor.');
      process.exit(1);
    }

    console.log('✅ Migrations applied.');
    console.log('   - Columns added to users/reservations');
    console.log('   - RPC lift_penalty_with_points created and granted to authenticated');
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.log('\nManual steps:');
    console.log('  1) Open supabase/migrations/20251107_add_penalty_system.sql');
    console.log('  2) Open supabase/migrations/20251107_lift_penalty_with_points.sql');
    console.log('  3) Paste into Supabase SQL Editor and run');
    process.exit(1);
  }
}

apply();
