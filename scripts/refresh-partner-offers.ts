/**
 * Refresh all offers for a partner - makes them all live now
 * Preserves original duration when refreshing
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ggzhtpaxnhwcilomswtm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PARTNER_NAME = 'ემზარას საცხობი';

async function refreshOffers() {
  console.log('🔄 Refreshing all offers for partner...\n');
  
  // 1. Get partner
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('id, business_name, open_24h, business_hours')
    .ilike('business_name', `%${PARTNER_NAME}%`)
    .single();
    
  if (partnerError || !partner) {
    console.error('❌ Partner not found:', partnerError);
    return;
  }
  
  console.log(`✅ Found partner: ${partner.business_name}`);
  console.log(`   24h Business: ${partner.open_24h ? 'Yes' : 'No'}\n`);
  
  // 2. Get all offers
  const { data: offers, error: offersError } = await supabase
    .from('offers')
    .select('id, title, pickup_start, pickup_end, expires_at, created_at, quantity_total, quantity_available')
    .eq('partner_id', partner.id);
    
  if (offersError) {
    console.error('❌ Error fetching offers:', offersError);
    return;
  }
  
  console.log(`📦 Found ${offers?.length || 0} offers to refresh\n`);
  
  // 3. Refresh each offer
  const now = new Date();
  
  for (const offer of offers || []) {
    console.log(`🔄 Refreshing: ${offer.title}`);
    
    // Calculate original duration
    const originalStart = new Date(offer.pickup_start || offer.created_at);
    const originalEnd = new Date(offer.pickup_end || offer.expires_at);
    const originalDuration = originalEnd.getTime() - originalStart.getTime();
    
    // Preserve original duration (minimum 24h)
    const durationToUse = Math.max(originalDuration, 24 * 60 * 60 * 1000);
    const durationDays = Math.ceil(durationToUse / (24 * 60 * 60 * 1000));
    
    const pickupEnd = new Date(now.getTime() + durationToUse);
    const expiresAt = new Date(now.getTime() + durationToUse);
    
    // For non-24h businesses, adjust to closing time
    if (!partner.open_24h && !partner.business_hours?.is_24_7 && partner.business_hours?.close) {
      const closingTime = partner.business_hours.close;
      const [hours, minutes] = closingTime.split(':').map(Number);
      pickupEnd.setHours(hours, minutes, 0, 0);
    }
    
    console.log(`   Duration: ${durationDays} days`);
    console.log(`   New pickup_end: ${pickupEnd.toLocaleString()}`);
    
    // Update offer
    const { error: updateError } = await supabase
      .from('offers')
      .update({
        status: 'ACTIVE',
        quantity_available: offer.quantity_total || offer.quantity_available,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        pickup_start: now.toISOString(),
        pickup_end: pickupEnd.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', offer.id);
      
    if (updateError) {
      console.error(`   ❌ Failed:`, updateError.message);
    } else {
      console.log(`   ✅ Refreshed successfully!\n`);
    }
  }
  
  // 4. Verify
  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICATION');
  console.log('='.repeat(80) + '\n');
  
  const { data: activeOffers } = await supabase
    .from('offers')
    .select('id, title')
    .eq('partner_id', partner.id)
    .eq('status', 'ACTIVE')
    .gt('quantity_available', 0)
    .gt('expires_at', now.toISOString())
    .gt('pickup_end', now.toISOString());
    
  console.log(`✅ ${activeOffers?.length || 0} offers now visible on public map:`);
  activeOffers?.forEach(offer => {
    console.log(`   • ${offer.title}`);
  });
  
  console.log('\n🎉 Done! All offers are now live.');
}

refreshOffers().catch(console.error);
