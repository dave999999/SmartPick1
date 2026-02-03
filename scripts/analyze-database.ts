import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Use service role to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function analyzeDatabase() {
  console.log('\n📊 DATABASE STRUCTURE ANALYSIS\n');
  console.log('='.repeat(60));

  // 1. Check users table structure and data
  console.log('\n1️⃣ USERS TABLE:');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email, role, points_balance, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (usersError) {
    console.error('❌ Error:', usersError.message);
  } else {
    console.log(`✅ Found ${users?.length} users (showing latest 10)`);
    console.log('\nUsers breakdown:');
    users?.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.name || 'No name'}`);
      console.log(`     Email: ${u.email}`);
      console.log(`     Role: ${u.role}`);
      console.log(`     Points: ${u.points_balance ?? 'NULL'}`);
      console.log(`     Created: ${new Date(u.created_at).toLocaleDateString()}`);
      console.log('');
    });

    // Count by role
    const { data: roleCounts } = await supabase
      .from('users')
      .select('role');
    
    const roles: Record<string, number> = {};
    roleCounts?.forEach(u => {
      roles[u.role || 'null'] = (roles[u.role || 'null'] || 0) + 1;
    });
    
    console.log('Role distribution:');
    Object.entries(roles).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });
  }

  // 2. Check partners
  console.log('\n2️⃣ PARTNERS TABLE:');
  const { data: partners, error: partnersError, count: partnerCount } = await supabase
    .from('partners')
    .select('id, business_name, email, status', { count: 'exact' })
    .limit(5);

  if (partnersError) {
    console.error('❌ Error:', partnersError.message);
  } else {
    console.log(`✅ Found ${partnerCount} partners (showing 5)`);
    partners?.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.business_name} - ${p.status}`);
    });
  }

  // 3. Check offers
  console.log('\n3️⃣ OFFERS TABLE:');
  const { data: offers, error: offersError, count: offerCount } = await supabase
    .from('offers')
    .select('id, title, status, smart_price, original_price, partner_id', { count: 'exact' })
    .limit(5);

  if (offersError) {
    console.error('❌ Error:', offersError.message);
  } else {
    console.log(`✅ Found ${offerCount} offers (showing 5)`);
    offers?.forEach((o, i) => {
      console.log(`  ${i + 1}. ${o.title}`);
      console.log(`     Status: ${o.status}`);
      console.log(`     Price: ${o.original_price} → ${o.smart_price} points`);
    });

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    const { data: allOffers } = await supabase.from('offers').select('status');
    allOffers?.forEach(o => {
      statusCounts[o.status || 'null'] = (statusCounts[o.status || 'null'] || 0) + 1;
    });
    console.log('\n  Status distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`    ${status}: ${count}`);
    });
  }

  // 4. Check reservations
  console.log('\n4️⃣ RESERVATIONS TABLE:');
  const { data: reservations, error: resError, count: resCount } = await supabase
    .from('reservations')
    .select('id, status, customer_id, no_show, picked_up_at, created_at', { count: 'exact' })
    .limit(5);

  if (resError) {
    console.error('❌ Error:', resError.message);
  } else {
    console.log(`✅ Found ${resCount} reservations (showing 5)`);
    reservations?.forEach((r, i) => {
      console.log(`  ${i + 1}. Status: ${r.status}, No-show: ${r.no_show}, Picked up: ${r.picked_up_at ? 'Yes' : 'No'}`);
    });

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    const { data: allRes } = await supabase.from('reservations').select('status');
    allRes?.forEach(r => {
      statusCounts[r.status || 'null'] = (statusCounts[r.status || 'null'] || 0) + 1;
    });
    console.log('\n  Status distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`    ${status}: ${count}`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY:');
  console.log('='.repeat(60));
  console.log(`Users: ${users?.length ?? 0}`);
  console.log(`Partners: ${partnerCount ?? 0}`);
  console.log(`Offers: ${offerCount ?? 0}`);
  console.log(`Reservations: ${resCount ?? 0}`);
  
  // Check for common issues
  console.log('\n⚠️  POTENTIAL ISSUES:');
  const issues = [];
  
  if (users?.every(u => u.points_balance === null || u.points_balance === 0)) {
    issues.push('❌ All users have 0 or NULL points_balance');
  }
  
  if (!users?.some(u => u.role?.toUpperCase() === 'ADMIN')) {
    issues.push('❌ No users with role="ADMIN" found');
  }
  
  if (offerCount === 0) {
    issues.push('⚠️  No offers in database');
  }
  
  if (resCount === 0) {
    issues.push('⚠️  No reservations in database');
  }

  if (issues.length === 0) {
    console.log('✅ No obvious data issues found!');
  } else {
    issues.forEach(issue => console.log(issue));
  }

  console.log('\n');
}

analyzeDatabase().catch(console.error);
