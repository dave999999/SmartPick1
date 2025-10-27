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

// Georgian business data
const businesses = [
  {
    name: 'Puris Saxli Bakery',
    type: 'BAKERY',
    description: 'Traditional Georgian bakery specializing in fresh khachapuri and bread',
    address: '15 Rustaveli Avenue',
    city: 'Tbilisi',
    phone: '+995 555 123 456',
    latitude: 41.7151,
    longitude: 44.8271,
  },
  {
    name: 'Machakhela Restaurant',
    type: 'RESTAURANT',
    description: 'Authentic Georgian cuisine with traditional dishes from Adjara region',
    address: '28 Chavchavadze Avenue',
    city: 'Tbilisi',
    phone: '+995 555 234 567',
    latitude: 41.7089,
    longitude: 44.7739,
  },
  {
    name: 'Cafe Leila',
    type: 'CAFE',
    description: 'Cozy cafe serving Georgian pastries, coffee, and light meals',
    address: '42 Agmashenebeli Avenue',
    city: 'Tbilisi',
    phone: '+995 555 345 678',
    latitude: 41.6938,
    longitude: 44.8015,
  },
  {
    name: 'Carrefour Saburtalo',
    type: 'GROCERY',
    description: 'Large supermarket with fresh produce and daily essentials',
    address: '1 Vazha-Pshavela Avenue',
    city: 'Tbilisi',
    phone: '+995 555 456 789',
    latitude: 41.7225,
    longitude: 44.7528,
  },
  {
    name: 'Tone Bakery',
    type: 'BAKERY',
    description: 'Family-owned bakery famous for shotis puri and nazuki',
    address: '67 Pekini Avenue',
    city: 'Tbilisi',
    phone: '+995 555 567 890',
    latitude: 41.7275,
    longitude: 44.7514,
  },
  {
    name: 'Shemoikhede Genatsvale',
    type: 'RESTAURANT',
    description: 'Popular Georgian restaurant chain with traditional recipes',
    address: '3 Marjanishvili Street',
    city: 'Tbilisi',
    phone: '+995 555 678 901',
    latitude: 41.7025,
    longitude: 44.7936,
  },
  {
    name: 'Entree Cafe',
    type: 'CAFE',
    description: 'Modern cafe with European and Georgian fusion menu',
    address: '19 Barnovi Street',
    city: 'Tbilisi',
    phone: '+995 555 789 012',
    latitude: 41.7156,
    longitude: 44.7689,
  },
  {
    name: 'Goodwill Supermarket',
    type: 'GROCERY',
    description: 'Premium supermarket with organic products and fresh bakery',
    address: '2 Melikishvili Street',
    city: 'Tbilisi',
    phone: '+995 555 890 123',
    latitude: 41.7089,
    longitude: 44.7853,
  },
  {
    name: 'Barbarestan Bakery',
    type: 'BAKERY',
    description: 'Historic bakery with traditional Georgian bread and pastries',
    address: '132 Aghmashenebeli Avenue',
    city: 'Tbilisi',
    phone: '+995 555 901 234',
    latitude: 41.6952,
    longitude: 44.8089,
  },
  {
    name: 'Keto and Kote Restaurant',
    type: 'RESTAURANT',
    description: 'Elegant restaurant serving refined Georgian cuisine',
    address: '7 Lermontov Street',
    city: 'Tbilisi',
    phone: '+995 555 012 345',
    latitude: 41.6938,
    longitude: 44.8025,
  },
];

// Product templates for each business type
// Note: Categories must be BAKERY, RESTAURANT, CAFE, or GROCERY (database constraint)
const productTemplates = {
  BAKERY: [
    { name: 'Khachapuri Imeruli', category: 'BAKERY', description: 'Traditional cheese-filled bread from Imereti region' },
    { name: 'Khachapuri Adjaruli', category: 'BAKERY', description: 'Boat-shaped khachapuri with egg and butter' },
    { name: 'Lobiani', category: 'BAKERY', description: 'Bean-filled Georgian bread, perfect for lunch' },
    { name: 'Shotis Puri', category: 'BAKERY', description: 'Traditional Georgian bread baked in tone oven' },
    { name: 'Nazuki', category: 'BAKERY', description: 'Sweet spiced bread with raisins and cinnamon' },
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

const PASSWORD = 'SmartPick2025!';

async function createDummyData() {
  console.log('🚀 Starting dummy data creation...\n');

  const createdAccounts = [];
  let totalOffersCreated = 0;

  try {
    // 1. Create 10 Partner Users
    console.log('📝 Creating 10 partner accounts...');
    
    for (let i = 0; i < 10; i++) {
      const email = `partner${i + 1}@smartpick.ge`;
      const business = businesses[i];
      
      console.log(`\n  Creating partner ${i + 1}: ${email}`);
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: PASSWORD,
        options: {
          data: {
            role: 'PARTNER',
          },
        },
      });

      if (authError) {
        console.error(`  ❌ Auth error for ${email}:`, authError.message);
        continue;
      }

      if (!authData.user) {
        console.error(`  ❌ No user created for ${email}`);
        continue;
      }

      console.log(`  ✅ Auth user created: ${authData.user.id}`);

      // Create partner record
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .insert({
          user_id: authData.user.id,
          business_name: business.name,
          business_type: business.type,
          description: business.description,
          address: business.address,
          city: business.city,
          latitude: business.latitude,
          longitude: business.longitude,
          phone: business.phone,
          email: email,
          status: 'APPROVED',
        })
        .select()
        .single();

      if (partnerError) {
        console.error(`  ❌ Partner creation error:`, partnerError.message);
        continue;
      }

      console.log(`  ✅ Partner record created: ${partnerData.id}`);

      createdAccounts.push({
        email,
        password: PASSWORD,
        role: 'PARTNER',
        businessName: business.name,
        partnerId: partnerData.id,
      });

      // Create 3-4 offers for this partner
      const numOffers = 3 + Math.floor(Math.random() * 2); // 3 or 4 offers
      const templates = productTemplates[business.type];
      
      console.log(`  📦 Creating ${numOffers} offers...`);

      for (let j = 0; j < numOffers; j++) {
        const template = templates[j % templates.length];
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
            partner_id: partnerData.id,
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
          console.log(`    ✅ Offer created: ${template.name} (${smartPrice} GEL, ${Math.round(discount * 100)}% off)`);
        }
      }
    }

    // 2. Create 1 Customer User
    console.log('\n\n👤 Creating customer account...');
    const customerEmail = 'customer@smartpick.ge';

    const { data: customerAuth, error: customerAuthError } = await supabase.auth.signUp({
      email: customerEmail,
      password: PASSWORD,
      options: {
        data: {
          role: 'CUSTOMER',
          name: 'Test Customer',
        },
      },
    });

    if (customerAuthError) {
      console.error(`❌ Customer auth error:`, customerAuthError.message);
    } else if (customerAuth.user) {
      console.log(`✅ Customer created: ${customerAuth.user.id}`);
      createdAccounts.push({
        email: customerEmail,
        password: PASSWORD,
        role: 'CUSTOMER',
        businessName: 'N/A',
      });
    }

    // 3. Generate credentials file
    console.log('\n\n📄 Generating credentials file...');
    
    let credentialsContent = `# SmartPick Dummy Accounts\n\n`;
    credentialsContent += `**Generated on:** ${new Date().toLocaleString()}\n\n`;
    credentialsContent += `**Common Password for all accounts:** \`${PASSWORD}\`\n\n`;
    credentialsContent += `---\n\n`;
    
    credentialsContent += `## 🏪 Partner Accounts (10)\n\n`;
    credentialsContent += `All partners are **APPROVED** and can create offers.\n\n`;
    credentialsContent += `| # | Email | Business Name | Type |\n`;
    credentialsContent += `|---|-------|---------------|------|\n`;
    
    createdAccounts
      .filter(acc => acc.role === 'PARTNER')
      .forEach((acc, idx) => {
        credentialsContent += `| ${idx + 1} | \`${acc.email}\` | ${acc.businessName} | ${businesses[idx].type} |\n`;
      });

    credentialsContent += `\n---\n\n`;
    credentialsContent += `## 👤 Customer Account (1)\n\n`;
    credentialsContent += `| Email | Role |\n`;
    credentialsContent += `|-------|------|\n`;
    
    createdAccounts
      .filter(acc => acc.role === 'CUSTOMER')
      .forEach(acc => {
        credentialsContent += `| \`${acc.email}\` | ${acc.role} |\n`;
      });

    credentialsContent += `\n---\n\n`;
    credentialsContent += `## 🔑 Login Instructions\n\n`;
    credentialsContent += `1. Go to http://localhost:5173/\n`;
    credentialsContent += `2. Click "Sign In" button\n`;
    credentialsContent += `3. Use any email from above with password: \`${PASSWORD}\`\n\n`;
    credentialsContent += `**Partner Access:**\n`;
    credentialsContent += `- Partners can view and manage their offers\n`;
    credentialsContent += `- Each partner has 3-4 active offers\n`;
    credentialsContent += `- Total offers created: ${totalOffersCreated}\n\n`;
    credentialsContent += `**Customer Access:**\n`;
    credentialsContent += `- Can browse all offers on the map\n`;
    credentialsContent += `- Can make reservations\n`;
    credentialsContent += `- Can view reservation history\n\n`;
    credentialsContent += `---\n\n`;
    credentialsContent += `## 📊 Summary\n\n`;
    credentialsContent += `- ✅ **10 Partner Accounts** created and approved\n`;
    credentialsContent += `- ✅ **${totalOffersCreated} Active Offers** across all partners\n`;
    credentialsContent += `- ✅ **1 Customer Account** for testing\n`;
    credentialsContent += `- ✅ **All accounts use the same password** for easy testing\n\n`;
    credentialsContent += `## 📍 Offer Categories\n\n`;
    credentialsContent += `- **BAKERY**: Khachapuri, Lobiani, Shotis Puri, Nazuki\n`;
    credentialsContent += `- **RESTAURANT**: Khinkali, Mtsvadi, Ojakhuri, Pkhali\n`;
    credentialsContent += `- **CAFE**: Churchkhela, Pelamushi, Cakes, Pastries\n`;
    credentialsContent += `- **GROCERY**: Fresh Bread, Vegetables, Dairy, Fruits\n`;

    // Write to file
    const fs = await import('fs');
    fs.writeFileSync('/workspace/shadcn-ui/DUMMY_ACCOUNTS.md', credentialsContent);
    console.log('✅ Credentials file created: DUMMY_ACCOUNTS.md');

    console.log('\n\n🎉 Dummy data creation completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   - Partners created: ${createdAccounts.filter(a => a.role === 'PARTNER').length}`);
    console.log(`   - Customers created: ${createdAccounts.filter(a => a.role === 'CUSTOMER').length}`);
    console.log(`   - Total offers created: ${totalOffersCreated}`);
    console.log(`   - Password for all: ${PASSWORD}`);
    console.log('\n📄 Check DUMMY_ACCOUNTS.md for full credentials list\n');

  } catch (error) {
    console.error('\n❌ Error creating dummy data:', error);
    process.exit(1);
  }
}

// Run the script
createDummyData();