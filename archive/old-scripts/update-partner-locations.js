import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.log('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tbilisi neighborhood coordinates
const locations = {
  BAKERY: [
    { name: 'Old Tbilisi', lat: 41.6919, lng: 44.8015, address: 'Shardeni Street 12, Old Tbilisi' },
    { name: 'Saburtalo', lat: 41.7225, lng: 44.7514, address: 'Vazha-Pshavela Ave 45, Saburtalo' },
    { name: 'Vake', lat: 41.6938, lng: 44.7866, address: 'Chavchavadze Ave 62, Vake' },
  ],
  RESTAURANT: [
    { name: 'Rustaveli', lat: 41.6941, lng: 44.8337, address: 'Rustaveli Ave 23, Rustaveli' },
    { name: 'Vera', lat: 41.7151, lng: 44.7736, address: 'Pekini Ave 18, Vera' },
    { name: 'Isani', lat: 41.6868, lng: 44.8337, address: 'Kakheti Highway 5, Isani' },
  ],
  CAFE: [
    { name: 'Mtatsminda', lat: 41.6938, lng: 44.7929, address: 'Mtatsminda Park, Mtatsminda' },
    { name: 'Saburtalo', lat: 41.7225, lng: 44.7514, address: 'University Street 8, Saburtalo' },
  ],
  GROCERY: [
    { name: 'Gldani', lat: 41.7580, lng: 44.8015, address: 'Gldani Metro Station, Gldani' },
    { name: 'Old Tbilisi', lat: 41.6919, lng: 44.8015, address: 'Meidan Square 3, Old Tbilisi' },
  ],
};

async function updatePartnerLocations() {
  console.log('🔄 Updating partner locations...\n');

  try {
    // Fetch all partners
    const { data: partners, error: fetchError } = await supabase
      .from('partners')
      .select('id, business_name, business_type, latitude, longitude')
      .order('business_type', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching partners:', fetchError);
      return;
    }

    if (!partners || partners.length === 0) {
      console.log('⚠️  No partners found in database');
      console.log('💡 Run create-dummy-data.js first to create partner accounts');
      return;
    }

    console.log(`📍 Found ${partners.length} partners to update\n`);

    let updated = 0;
    const typeCounters = { BAKERY: 0, RESTAURANT: 0, CAFE: 0, GROCERY: 0 };

    // Update each partner with location
    for (const partner of partners) {
      const businessType = partner.business_type;
      const locationsList = locations[businessType] || [];
      
      if (locationsList.length === 0) continue;

      // Get the next location for this business type
      const locationIndex = typeCounters[businessType] % locationsList.length;
      const location = locationsList[locationIndex];
      typeCounters[businessType]++;

      // Update partner
      const { error: updateError } = await supabase
        .from('partners')
        .update({
          latitude: location.lat,
          longitude: location.lng,
          address: location.address,
          city: 'Tbilisi',
        })
        .eq('id', partner.id);

      if (updateError) {
        console.error(`❌ Error updating ${partner.business_name}:`, updateError);
      } else {
        console.log(`✅ ${partner.business_name} → ${location.name} (${location.lat}, ${location.lng})`);
        updated++;
      }
    }

    console.log(`\n✨ Successfully updated ${updated} partner locations!`);
    console.log('\n📊 Location Distribution:');
    console.log(`   - BAKERY: ${typeCounters.BAKERY} partners`);
    console.log(`   - RESTAURANT: ${typeCounters.RESTAURANT} partners`);
    console.log(`   - CAFE: ${typeCounters.CAFE} partners`);
    console.log(`   - GROCERY: ${typeCounters.GROCERY} partners`);
    
    console.log('\n🗺️  Next Steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. Check the map view - partners should now appear!');
    console.log('   3. Click on map markers to see offer details');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the update
updatePartnerLocations();