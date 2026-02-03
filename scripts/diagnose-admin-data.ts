/**
 * Diagnostic script to check actual database data for admin dashboard
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('\n=== ADMIN DASHBOARD DATA DIAGNOSIS ===\n');

  // 1. Check Users table
  console.log('1. USERS TABLE:');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email, role, points_balance, penalty_count, created_at')
    .neq('role', 'partner')
    .limit(5);

  if (usersError) {
    console.error('❌ Users query error:', usersError);
  } else {
    console.log('✅ Users found:', users?.length);
    users?.forEach((u: any) => {
      console.log(`   - ${u.name}: ${u.points_balance} points, role: ${u.role}`);
    });
  }

  // 2. Check Offers table
  console.log('\n2. OFFERS TABLE:');
  const { data: offers, error: offersError } = await supabase
    .from('offers')
    .select('id, title, status, smart_price, quantity_available, expires_at, partner_id')
    .limit(5);

  if (offersError) {
    console.error('❌ Offers query error:', offersError);
  } else {
    console.log('✅ Offers found:', offers?.length);
    offers?.forEach((o: any) => {
      console.log(`   - ${o.title}: status=${o.status}, price=${o.smart_price} points`);
    });
  }

  // 3. Check Partners table
  console.log('\n3. PARTNERS TABLE:');
  const { data: partners, error: partnersError } = await supabase
    .from('partners')
    .select('id, business_name, email, status')
    .limit(5);

  if (partnersError) {
    console.error('❌ Partners query error:', partnersError);
  } else {
    console.log('✅ Partners found:', partners?.length);
    partners?.forEach((p: any) => {
      console.log(`   - ${p.business_name}: ${p.email}, status=${p.status}`);
    });
  }

  // 4. Check Reservations table
  console.log('\n4. RESERVATIONS TABLE:');
  const { data: reservations, error: reservationsError } = await supabase
    .from('reservations')
    .select('id, status, customer_id, points_spent, created_at, no_show')
    .limit(5);

  if (reservationsError) {
    console.error('❌ Reservations query error:', reservationsError);
  } else {
    console.log('✅ Reservations found:', reservations?.length);
    reservations?.forEach((r: any) => {
      console.log(`   - Status: ${r.status}, Points: ${r.points_spent}, No-show: ${r.no_show}`);
    });
  }

  // 5. Check Support Tickets table
  console.log('\n5. SUPPORT TICKETS TABLE:');
  const { data: tickets, error: ticketsError } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, created_at')
    .limit(5);

  if (ticketsError) {
    console.error('❌ Support tickets query error:', ticketsError);
    console.error('   Error details:', JSON.stringify(ticketsError, null, 2));
  } else {
    console.log('✅ Support tickets found:', tickets?.length);
  }

  // 6. Test Users query with partner join (like admin uses)
  console.log('\n6. TEST ADMIN USERS QUERY:');
  const { data: adminUsers, error: adminError } = await supabase
    .from('users')
    .select('*')
    .neq('role', 'partner')
    .limit(3);

  if (adminError) {
    console.error('❌ Admin users query error:', adminError);
  } else {
    console.log('✅ Admin query successful, sample user:');
    if (adminUsers && adminUsers[0]) {
      const u = adminUsers[0];
      console.log(`   Name: ${u.name}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Points Balance: ${u.points_balance}`);
      console.log(`   Role: ${u.role}`);
      console.log(`   All fields:`, Object.keys(u));
    }
  }

  // 7. Test Offers query with partner join
  console.log('\n7. TEST ADMIN OFFERS QUERY:');
  const { data: adminOffers, error: adminOffersError } = await supabase
    .from('offers')
    .select(`
      *,
      partner:partners!inner(id, business_name, email, phone)
    `)
    .limit(2);

  if (adminOffersError) {
    console.error('❌ Admin offers query error:', adminOffersError);
  } else {
    console.log('✅ Admin offers query successful:', adminOffers?.length);
    if (adminOffers && adminOffers[0]) {
      const o = adminOffers[0];
      console.log(`   Offer: ${o.title}`);
      console.log(`   Status: ${o.status}`);
      console.log(`   Partner: ${o.partner?.business_name}`);
    }
  }

  // 8. Check RLS policies
  console.log('\n8. CHECKING CURRENT USER ROLE:');
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    console.log('✅ Logged in as:', user.email);
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    console.log('   User role:', userData?.role);
  } else {
    console.log('⚠️  Not logged in - admin queries may fail due to RLS');
  }

  console.log('\n=== DIAGNOSIS COMPLETE ===\n');
}

diagnose().catch(console.error);
