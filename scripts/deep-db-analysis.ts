// Deep Database Analysis Script
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ggzhtpaxnhwcilomswtm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deepAnalysis() {
  console.log('🔬 DEEP DATABASE ANALYSIS\n');
  console.log('='.repeat(80));

  // 1. Check for offers with zero quantity
  console.log('\n📦 OFFERS ANALYSIS:');
  const { data: zeroQtyOffers } = await supabase
    .from('offers')
    .select('id, title, quantity_available, status')
    .eq('quantity_available', 0);
  console.log(`  Offers with 0 quantity: ${zeroQtyOffers?.length || 0}`);

  // 2. Check offers that should be expired
  const { data: shouldBeExpired } = await supabase
    .from('offers')
    .select('id, title, expires_at, status')
    .eq('status', 'ACTIVE')
    .lt('expires_at', new Date().toISOString());
  console.log(`  Active offers past expiry: ${shouldBeExpired?.length || 0}`);
  if (shouldBeExpired && shouldBeExpired.length > 0) {
    shouldBeExpired.forEach(o => {
      console.log(`    - ${o.title} (expired: ${o.expires_at})`);
    });
  }

  // 3. Check for duplicate offers by same partner
  const { data: allOffers } = await supabase
    .from('offers')
    .select('partner_id, title, created_at')
    .order('created_at', { ascending: false });

  const duplicateTitles = new Map<string, number>();
  allOffers?.forEach(o => {
    const key = `${o.partner_id}:${o.title}`;
    duplicateTitles.set(key, (duplicateTitles.get(key) || 0) + 1);
  });

  const dupes = Array.from(duplicateTitles.entries()).filter(([_, count]) => count > 1);
  console.log(`  Potential duplicate offers: ${dupes.length}`);

  // 4. Check partner approval status
  console.log('\n🏪 PARTNERS ANALYSIS:');
  const { data: partnersByStatus } = await supabase
    .from('partners')
    .select('approval_status');

  const statusCounts: Record<string, number> = {};
  partnersByStatus?.forEach(p => {
    statusCounts[p.approval_status] = (statusCounts[p.approval_status] || 0) + 1;
  });

  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  // 5. Check for partners with no offers
  const { data: partnersWithOfferCounts } = await supabase
    .from('partners')
    .select('id, name');

  let partnersWithoutOffers = 0;
  if (partnersWithOfferCounts) {
    for (const partner of partnersWithOfferCounts) {
      const { count } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partner.id);

      if (count === 0) partnersWithoutOffers++;
    }
  }
  console.log(`  Partners with 0 offers: ${partnersWithoutOffers}`);

  // 6. Check users with activity
  console.log('\n👥 USERS ANALYSIS:');
  const { data: users } = await supabase
    .from('users')
    .select('id, role, created_at');

  const roleCounts: Record<string, number> = {};
  users?.forEach(u => {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  });

  Object.entries(roleCounts).forEach(([role, count]) => {
    console.log(`  ${role}: ${count}`);
  });

  // 7. Check recent activity (reservations in last 7 days)
  console.log('\n📅 RECENT ACTIVITY:');
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: recentOffers } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo);
  console.log(`  Offers created (last 7 days): ${recentOffers || 0}`);

  // 8. Check CSRF token accumulation
  const { count: csrfCount } = await supabase
    .from('csrf_tokens')
    .select('*', { count: 'exact', head: true });
  console.log(`\n🔐 SECURITY TOKENS:`);
  console.log(`  Total CSRF tokens: ${csrfCount || 0}`);
  console.log(`  ${csrfCount && csrfCount > 100 ? '⚠️  High count - cleanup needed' : '✅ Normal'}`);

  // 9. Check rate limits
  const { count: rateLimitCount } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true });
  console.log(`  Rate limit records: ${rateLimitCount || 0}`);

  // 10. Check categories
  console.log('\n📂 CATEGORIES:');
  const { data: categories } = await supabase
    .from('categories')
    .select('main_category, sub_category');

  const mainCats = new Set(categories?.map(c => c.main_category));
  console.log(`  Main categories: ${mainCats.size}`);
  console.log(`  Total category combinations: ${categories?.length || 0}`);

  // 11. Check offers by category
  const { data: offersByCategory } = await supabase
    .from('offers')
    .select('category');

  const categoryCounts: Record<string, number> = {};
  offersByCategory?.forEach(o => {
    categoryCounts[o.category || 'None'] = (categoryCounts[o.category || 'None'] || 0) + 1;
  });

  console.log('\n📊 OFFERS BY CATEGORY:');
  Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

  // 12. Check for offers with very high quantity
  const { data: highQtyOffers } = await supabase
    .from('offers')
    .select('title, quantity_available')
    .gt('quantity_available', 50);

  console.log(`\n⚠️  POTENTIAL DATA QUALITY ISSUES:`);
  console.log(`  Offers with >50 quantity: ${highQtyOffers?.length || 0}`);
  if (highQtyOffers && highQtyOffers.length > 0) {
    highQtyOffers.forEach(o => {
      console.log(`    - ${o.title}: ${o.quantity_available}`);
    });
  }

  // 13. Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY:');
  console.log(`  Total Offers: ${allOffers?.length || 0}`);
  console.log(`  Active Offers: ${allOffers?.filter((o: any) => o.status === 'ACTIVE').length || 0}`);
  console.log(`  Total Partners: ${partnersWithOfferCounts?.length || 0}`);
  console.log(`  Total Users: ${users?.length || 0}`);
  console.log(`  Total Categories: ${categories?.length || 0}`);
  console.log('\n✅ DEEP ANALYSIS COMPLETE\n');
}

deepAnalysis().catch(console.error);
