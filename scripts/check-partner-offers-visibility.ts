/**
 * Diagnostic Script: Check Partner Offers Visibility
 * This will help identify why only 1 of 2 offers is appearing
 */

import { createClient } from '@supabase/supabase-js';

// Supabase connection
const SUPABASE_URL = 'https://ggzhtpaxnhwcilomswtm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PARTNER_NAME = 'ემზარას საცხობი';

async function checkPartnerOffers() {
  console.log('🔍 Checking Partner Offers Visibility\n');
  console.log('='.repeat(80));
  
  // 1. Find the partner
  console.log(`\n📍 Step 1: Finding partner "${PARTNER_NAME}"...`);
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('id, business_name, status, open_24h, latitude, longitude')
    .ilike('business_name', `%${PARTNER_NAME}%`)
    .single();
    
  if (partnerError || !partner) {
    console.error('❌ Partner not found:', partnerError);
    return;
  }
  
  console.log('✅ Found partner:');
  console.log(`   ID: ${partner.id}`);
  console.log(`   Name: ${partner.business_name}`);
  console.log(`   Status: ${partner.status}`);
  console.log(`   Location: ${partner.latitude}, ${partner.longitude}`);
  
  // 2. Get ALL offers (unfiltered - like admin/partner dashboard)
  console.log(`\n📦 Step 2: Fetching ALL offers (unfiltered)...`);
  const { data: allOffers, error: allOffersError } = await supabase
    .from('offers')
    .select('*')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });
    
  if (allOffersError) {
    console.error('❌ Error fetching offers:', allOffersError);
    return;
  }
  
  console.log(`✅ Found ${allOffers?.length || 0} total offers\n`);
  
  // 3. Check each offer's visibility status
  const now = new Date();
  
  allOffers?.forEach((offer, index) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Offer #${index + 1}: ${offer.title}`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`ID: ${offer.id}`);
    console.log(`Status: ${offer.status}`);
    console.log(`Quantity: ${offer.quantity_available} / ${offer.quantity_total}`);
    console.log(`Created: ${new Date(offer.created_at).toLocaleString()}`);
    console.log(`Expires: ${new Date(offer.expires_at).toLocaleString()}`);
    console.log(`Pickup Start: ${new Date(offer.pickup_start).toLocaleString()}`);
    console.log(`Pickup End: ${new Date(offer.pickup_end).toLocaleString()}`);
    
    // Calculate time remaining
    const expiresAt = new Date(offer.expires_at);
    const pickupEnd = new Date(offer.pickup_end);
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    const hoursUntilPickupEnd = (pickupEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    console.log(`\n⏰ Time Status:`);
    console.log(`   Expires in: ${hoursUntilExpiry.toFixed(2)} hours`);
    console.log(`   Pickup ends in: ${hoursUntilPickupEnd.toFixed(2)} hours`);
    
    // Check visibility conditions
    console.log(`\n✅/❌ Visibility Checks:`);
    const checks = {
      'Status is ACTIVE': offer.status === 'ACTIVE',
      'Has quantity available': offer.quantity_available > 0,
      'Not expired (expires_at)': expiresAt > now,
      'Pickup window active (pickup_end)': pickupEnd > now,
    };
    
    let willAppear = true;
    for (const [check, passed] of Object.entries(checks)) {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`);
      if (!passed) willAppear = false;
    }
    
    console.log(`\n🗺️  ${willAppear ? '✅ WILL APPEAR on public map' : '❌ WILL NOT APPEAR on public map'}`);
    
    if (!willAppear) {
      console.log(`\n🔧 Why it won't appear:`);
      if (offer.status !== 'ACTIVE') console.log(`   • Status is "${offer.status}" (needs to be "ACTIVE")`);
      if (offer.quantity_available <= 0) console.log(`   • No quantity available`);
      if (expiresAt <= now) console.log(`   • Expired ${Math.abs(hoursUntilExpiry).toFixed(2)} hours ago`);
      if (pickupEnd <= now) console.log(`   • Pickup window ended ${Math.abs(hoursUntilPickupEnd).toFixed(2)} hours ago`);
    }
  });
  
  // 4. Get "active" offers (like customer-facing map)
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📍 Step 3: Fetching ACTIVE offers (with filters like public map)...`);
  console.log(`${'='.repeat(80)}`);
  
  const nowISO = now.toISOString();
  const { data: activeOffers, error: activeOffersError } = await supabase
    .from('offers')
    .select('*')
    .eq('partner_id', partner.id)
    .eq('status', 'ACTIVE')
    .gt('quantity_available', 0)
    .gt('expires_at', nowISO)
    .gt('pickup_end', nowISO)
    .order('created_at', { ascending: false });
    
  if (activeOffersError) {
    console.error('❌ Error fetching active offers:', activeOffersError);
  } else {
    console.log(`\n✅ ${activeOffers?.length || 0} offers visible on public map:`);
    activeOffers?.forEach(offer => {
      console.log(`   • ${offer.title} (ID: ${offer.id.substring(0, 8)}...)`);
    });
  }
  
  // 5. Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Total offers in database: ${allOffers?.length || 0}`);
  console.log(`Visible on public map: ${activeOffers?.length || 0}`);
  console.log(`Hidden from public: ${(allOffers?.length || 0) - (activeOffers?.length || 0)}`);
  
  if ((allOffers?.length || 0) > (activeOffers?.length || 0)) {
    console.log(`\n💡 ${(allOffers?.length || 0) - (activeOffers?.length || 0)} offer(s) are hidden due to expiration or status.`);
    console.log(`   To make them visible again, you can:`);
    console.log(`   1. Use "Refresh Offer" button in admin dashboard`);
    console.log(`   2. This will reset expires_at, pickup_end, and created_at timestamps`);
  }
}

checkPartnerOffers().catch(console.error);
