import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Product templates for each business type
const productTemplates = {
  BAKERY: [
    { name: 'Khachapuri Imeruli', category: 'BAKERY', description: 'Traditional cheese-filled bread from Imereti region' },
    { name: 'Khachapuri Adjaruli', category: 'BAKERY', description: 'Boat-shaped khachapuri with egg and butter' },
    { name: 'Lobiani', category: 'BAKERY', description: 'Bean-filled Georgian bread, perfect for lunch' },
    { name: 'Shotis Puri', category: 'BAKERY', description: 'Traditional Georgian bread baked in tone oven' },
  ],
  RESTAURANT: [
    { name: 'Khinkali (10 pcs)', category: 'RESTAURANT', description: 'Georgian dumplings filled with spiced meat' },
    { name: 'Mtsvadi Set', category: 'RESTAURANT', description: 'Grilled meat skewers with vegetables' },
    { name: 'Ojakhuri', category: 'RESTAURANT', description: 'Fried potatoes with meat and onions' },
    { name: 'Pkhali Assortment', category: 'RESTAURANT', description: 'Mixed vegetable pâtés with walnuts' },
  ],
  CAFE: [
    { name: 'Churchkhela (3 pcs)', category: 'CAFE', description: 'Traditional Georgian candy made with nuts and grape juice' },
    { name: 'Pelamushi', category: 'CAFE', description: 'Grape juice dessert with walnuts' },
    { name: 'Napoleon Cake Slice', category: 'CAFE', description: 'Layered puff pastry cake with cream' },
    { name: 'Cheese Pastry Box', category: 'CAFE', description: 'Assorted cheese-filled pastries' },
  ],
  GROCERY: [
    { name: 'Fresh Bread Bundle', category: 'GROCERY', description: 'Assorted fresh bread from today\'s baking' },
    { name: 'Vegetable Mix', category: 'GROCERY', description: 'Fresh seasonal vegetables nearing best-by date' },
    { name: 'Dairy Products Set', category: 'GROCERY', description: 'Milk, yogurt, and cheese approaching expiry' },
    { name: 'Fruit Basket', category: 'GROCERY', description: 'Mixed fruits perfect for immediate consumption' },
  ],
};

async function addMissingOffers() {
  console.log('🚀 Adding missing offers to existing partners...\n');

  try {
    // Get all partners
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('*')
      .eq('status', 'APPROVED');

    if (partnersError) {
      console.error('❌ Error fetching partners:', partnersError.message);
      return;
    }

    console.log(`Found ${partners.length} approved partners\n`);

    let totalOffersCreated = 0;

    for (const partner of partners) {
      console.log(`\n📦 Processing: ${partner.business_name} (${partner.business_type})`);

      // Check existing offers
      const { data: existingOffers, error: offersError } = await supabase
        .from('offers')
        .select('id')
        .eq('partner_id', partner.id);

      if (offersError) {
        console.error(`  ❌ Error checking offers:`, offersError.message);
        continue;
      }

      const currentCount = existingOffers.length;
      const targetCount = 4;
      const neededCount = targetCount - currentCount;

      console.log(`  Current offers: ${currentCount}, Target: ${targetCount}, Need to add: ${neededCount}`);

      if (neededCount <= 0) {
        console.log(`  ✅ Already has enough offers, skipping`);
        continue;
      }

      // Add missing offers
      const templates = productTemplates[partner.business_type];
      if (!templates) {
        console.log(`  ⚠️  No templates for business type: ${partner.business_type}`);
        continue;
      }

      for (let i = 0; i < neededCount; i++) {
        const template = templates[i % templates.length];
        const originalPrice = 10 + Math.floor(Math.random() * 40); // 10-50 GEL
        const discount = 0.2 + Math.random() * 0.3; // 20-50% discount
        const smartPrice = Math.round(originalPrice * (1 - discount) * 100) / 100;
        const quantity = 5 + Math.floor(Math.random() * 20); // 5-25 items

        // Set pickup window (today 6 PM - 9 PM)
        const pickupStart = new Date();
        pickupStart.setHours(18, 0, 0, 0);
        const pickupEnd = new Date();
        pickupEnd.setHours(21, 0, 0, 0);

        const { error: offerError } = await supabase
          .from('offers')
          .insert({
            partner_id: partner.id,
            title: template.name,
            description: template.description,
            category: template.category,
            original_price: originalPrice,
            smart_price: smartPrice,
            quantity_available: quantity,
            quantity_total: quantity,
            pickup_start: pickupStart.toISOString(),
            pickup_end: pickupEnd.toISOString(),
            status: 'ACTIVE',
            expires_at: pickupEnd.toISOString(),
            images: [],
          });

        if (offerError) {
          console.error(`    ❌ Offer creation error:`, offerError.message);
        } else {
          totalOffersCreated++;
          console.log(`    ✅ Added: ${template.name} (${smartPrice} GEL, ${Math.round(discount * 100)}% off)`);
        }
      }
    }

    console.log('\n\n🎉 Offers added successfully!\n');
    console.log(`📊 Total new offers created: ${totalOffersCreated}\n`);

  } catch (error) {
    console.error('\n❌ Error adding offers:', error);
    process.exit(1);
  }
}

// Run the script
addMissingOffers();