// Script to check live Supabase database state
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ggzhtpaxnhwcilomswtm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkLiveDatabase() {
  console.log('🔍 LIVE SUPABASE DATABASE AUDIT\n');
  console.log('=' .repeat(80));

  // 1. Check RLS status on tables
  console.log('\n📊 RLS STATUS ON TABLES:');

  // Check tables directly
  const tables = ['users', 'partners', 'offers', 'reservations', 'user_points', 'partner_points', 'point_transactions'];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    console.log(`  ${table.padEnd(25)} - Records: ${count !== null ? count : 'N/A'} ${error ? '❌ Error: ' + error.message : '✅'}`);
  }

  // 2. Check critical counts
  console.log('\n📈 RECORD COUNTS:');
  const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { count: partnerCount } = await supabase.from('partners').select('*', { count: 'exact', head: true });
  const { count: offerCount } = await supabase.from('offers').select('*', { count: 'exact', head: true });
  const { count: reservationCount } = await supabase.from('reservations').select('*', { count: 'exact', head: true });

  console.log(`  Total Users: ${userCount}`);
  console.log(`  Total Partners: ${partnerCount}`);
  console.log(`  Total Offers: ${offerCount}`);
  console.log(`  Total Reservations: ${reservationCount}`);

  // 3. Check active offers
  console.log('\n🎯 ACTIVE OFFERS:');
  const { data: activeOffers, error: offersError } = await supabase
    .from('offers')
    .select('id, title, status, quantity_available')
    .eq('status', 'ACTIVE')
    .gt('quantity_available', 0)
    .limit(5);

  if (offersError) {
    console.log(`  ❌ Error fetching offers: ${offersError.message}`);
  } else {
    console.log(`  Found ${activeOffers?.length || 0} active offers`);
    activeOffers?.forEach(offer => {
      console.log(`    - ${offer.title} (${offer.quantity_available} available)`);
    });
  }

  // 4. Check active reservations
  console.log('\n📦 ACTIVE RESERVATIONS:');
  const { data: activeReservations, error: resError } = await supabase
    .from('reservations')
    .select('id, status')
    .eq('status', 'ACTIVE');

  if (resError) {
    console.log(`  ❌ Error fetching reservations: ${resError.message}`);
  } else {
    console.log(`  Active reservations: ${activeReservations?.length || 0}`);
  }

  // 5. Check points system
  console.log('\n💰 POINTS SYSTEM:');
  const { data: userPoints, error: upError } = await supabase
    .from('user_points')
    .select('balance');

  const { data: partnerPoints, error: ppError } = await supabase
    .from('partner_points')
    .select('balance');

  if (!upError && userPoints) {
    const totalUserPoints = userPoints.reduce((sum, p) => sum + (p.balance || 0), 0);
    console.log(`  Total User Points: ${totalUserPoints}`);
  }

  if (!ppError && partnerPoints) {
    const totalPartnerPoints = partnerPoints.reduce((sum, p) => sum + (p.balance || 0), 0);
    console.log(`  Total Partner Points: ${totalPartnerPoints}`);
  }

  // 6. Check point transactions
  const { count: txCount } = await supabase
    .from('point_transactions')
    .select('*', { count: 'exact', head: true });

  console.log(`  Total Point Transactions: ${txCount}`);

  // 6b. Check escrow points
  const { count: escrowCount } = await supabase
    .from('escrow_points')
    .select('*', { count: 'exact', head: true });

  console.log(`  Escrow Points Records: ${escrowCount}`);

  // 7. Check for penalties
  console.log('\n⚠️  PENALTIES:');
  const { data: penalties, error: penError } = await supabase
    .from('user_penalties')
    .select('*');

  if (!penError) {
    console.log(`  Total penalties: ${penalties?.length || 0}`);
  }

  // 8. Check actual reservations with different status
  console.log('\n📊 RESERVATIONS BY STATUS:');
  const statuses = ['ACTIVE', 'PICKED_UP', 'CANCELLED', 'EXPIRED'];
  for (const status of statuses) {
    const { count } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    console.log(`  ${status}: ${count || 0}`);
  }

  // 9. Get total reservations without filter (to see if RLS is blocking)
  const { count: allReservations } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true });
  console.log(`  TOTAL (all statuses): ${allReservations || 0}`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ AUDIT COMPLETE\n');
}

checkLiveDatabase().catch(console.error);
