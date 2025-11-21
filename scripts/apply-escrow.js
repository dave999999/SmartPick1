#!/usr/bin/env node

/**
 * Apply escrow migrations to Supabase
 * Usage: node scripts/apply-escrow.js
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('fs');
const path = require('path');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\nMissing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  console.error('Example:');
  console.error('  SUPABASE_URL=https://xxxx.supabase.co \\\n  SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/apply-escrow.js');
  process.exit(1);
}

const files = [
  path.join(__dirname, '..', 'supabase', 'migrations', '20251109_complete_escrow_system.sql'),
  path.join(__dirname, '..', 'supabase', 'migrations', '20251109_adjust_user_confirm_pickup_noop.sql'),
];

async function apply(sql, name) {
  console.log(`\nApplying: ${name}`);
  const body = JSON.stringify({ query: sql });
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  // Try exec_sql RPC then fallback
  const endpoints = [
    `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
    `${SUPABASE_URL}/rest/v1/rpc/query`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body });
      if (res.ok) {
        console.log('✓ Applied');
        return;
      }
      const text = await res.text();
      console.warn(`Endpoint ${url} failed: ${res.status} ${res.statusText}\n${text}`);
    } catch (e) {
      console.warn(`Endpoint ${url} error: ${e.message}`);
    }
  }
  throw new Error('All endpoints failed');
}

(async () => {
  for (const file of files) {
    const sql = fs.readFileSync(file, 'utf8');
    await apply(sql, path.basename(file));
  }
  console.log('\nAll escrow migrations applied.');
})();

