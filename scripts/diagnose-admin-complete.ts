import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Try to load .env.local first, then .env
const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('📝 Loaded .env.local');
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('📝 Loaded .env');
} else {
  console.error('❌ No .env or .env.local file found!');
  console.log('\nCreate a .env.local file with:');
  console.log('VITE_SUPABASE_URL=your_supabase_url');
  console.log('VITE_SUPABASE_ANON_KEY=your_anon_key');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env file!');
  console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('Key:', supabaseKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseAdminIssues() {
  console.log('\n🔍 COMPREHENSIVE ADMIN DASHBOARD DIAGNOSTIC\n');
  console.log('='.repeat(60));

  // 1. Check current session
  console.log('\n1️⃣ CHECKING CURRENT SESSION:');
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.error('❌ NO ACTIVE SESSION - You must be logged in!');
    console.log('\nPlease log in to the application first, then run this diagnostic.');
    return;
  }
  
  console.log('✅ Session active');
  console.log('User ID:', session.user.id);
  console.log('Email:', session.user.email);

  // 2. Check current user's role
  console.log('\n2️⃣ CHECKING USER ROLE IN DATABASE:');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('id', session.user.id)
    .single();

  if (userError) {
    console.error('❌ Error fetching user:', userError.message);
    console.log('\nRLS might be blocking this query. This means:');
    console.log('- Your user might not have correct role in database');
    console.log('- RLS policies are preventing access');
    return;
  }

  console.log('✅ User found in database');
  console.log('Name:', userData.name);
  console.log('Role:', userData.role);
  console.log('Role type:', typeof userData.role);
  
  if (userData.role !== 'ADMIN') {
    console.error('\n❌ CRITICAL ISSUE: Your role is NOT "ADMIN"');
    console.log('Current role:', userData.role);
    console.log('\nTo fix this, run this SQL in Supabase SQL Editor:');
    console.log(`UPDATE users SET role = 'ADMIN' WHERE id = '${session.user.id}';`);
    return;
  }

  console.log('✅ Role is ADMIN (correct)');

  // 3. Test RLS - Can we see all users?
  console.log('\n3️⃣ TESTING RLS - USERS TABLE:');
  const { data: allUsers, error: usersError, count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: false });

  if (usersError) {
    console.error('❌ Cannot read users table:', usersError.message);
    console.log('RLS is blocking access. Check policies.');
  } else {
    console.log(`✅ Can read users table: ${count} users found`);
    console.log('Sample user:', allUsers?.[0] ? {
      id: allUsers[0].id,
      name: allUsers[0].name,
      role: allUsers[0].role,
      points_balance: allUsers[0].points_balance
    } : 'None');
  }

  // 4. Test points_balance column
  console.log('\n4️⃣ TESTING POINTS_BALANCE COLUMN:');
  const { data: usersWithPoints, error: pointsError } = await supabase
    .from('users')
    .select('id, name, role, points_balance')
    .limit(5);

  if (pointsError) {
    console.error('❌ Error reading points_balance:', pointsError.message);
  } else {
    console.log('✅ points_balance column exists');
    console.log('Sample data:');
    usersWithPoints?.forEach(u => {
      console.log(`  - ${u.name}: ${u.points_balance} points (role: ${u.role})`);
    });
  }

  // 5. Test offers table
  console.log('\n5️⃣ TESTING OFFERS TABLE:');
  const { data: offers, error: offersError, count: offersCount } = await supabase
    .from('offers')
    .select('*, partner:partners!inner(id, business_name, email)', { count: 'exact' })
    .limit(3);

  if (offersError) {
    console.error('❌ Error reading offers:', offersError.message);
  } else {
    console.log(`✅ Can read offers: ${offersCount} total`);
    console.log('Sample offer:', offers?.[0] ? {
      id: offers[0].id,
      title: offers[0].title,
      status: offers[0].status,
      partner: offers[0].partner?.business_name
    } : 'None');
  }

  // 6. Test reservations table
  console.log('\n6️⃣ TESTING RESERVATIONS TABLE:');
  const { data: reservations, error: resError, count: resCount } = await supabase
    .from('reservations')
    .select('*', { count: 'exact' })
    .limit(3);

  if (resError) {
    console.error('❌ Error reading reservations:', resError.message);
  } else {
    console.log(`✅ Can read reservations: ${resCount} total`);
    console.log('Sample reservation:', reservations?.[0] ? {
      id: reservations[0].id,
      status: reservations[0].status,
      customer_id: reservations[0].customer_id
    } : 'None');
  }

  // 7. Test partners table
  console.log('\n7️⃣ TESTING PARTNERS TABLE:');
  const { data: partners, error: partnersError, count: partnersCount } = await supabase
    .from('partners')
    .select('*', { count: 'exact' })
    .limit(3);

  if (partnersError) {
    console.error('❌ Error reading partners:', partnersError.message);
  } else {
    console.log(`✅ Can read partners: ${partnersCount} total`);
    console.log('Sample partner:', partners?.[0] ? {
      id: partners[0].id,
      business_name: partners[0].business_name,
      status: partners[0].status
    } : 'None');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 DIAGNOSTIC SUMMARY:');
  console.log('='.repeat(60));
  
  const issues = [];
  if (userData.role !== 'ADMIN') issues.push('❌ User role is not ADMIN');
  if (usersError) issues.push('❌ Cannot read users table');
  if (pointsError) issues.push('❌ Cannot read points_balance');
  if (offersError) issues.push('❌ Cannot read offers table');
  if (resError) issues.push('❌ Cannot read reservations table');
  if (partnersError) issues.push('❌ Cannot read partners table');

  if (issues.length === 0) {
    console.log('\n✅ ALL CHECKS PASSED!');
    console.log('The admin dashboard SHOULD be working.');
    console.log('\nIf you still see issues in the UI, check:');
    console.log('1. Browser console for errors');
    console.log('2. Network tab for failed requests');
    console.log('3. Make sure you\'re logged in with the admin account');
  } else {
    console.log('\n❌ ISSUES FOUND:');
    issues.forEach(issue => console.log(issue));
    console.log('\nFIXES NEEDED - See above for specific solutions.');
  }

  console.log('\n');
}

diagnoseAdminIssues().catch(console.error);
