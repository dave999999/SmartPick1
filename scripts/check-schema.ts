import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkSchema() {
  console.log('\n🔍 CHECKING ACTUAL DATABASE SCHEMA\n');
  
  // Get one user to see all columns
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('USERS TABLE - Actual columns:');
  console.log('='.repeat(60));
  Object.keys(data || {}).sort().forEach(col => {
    console.log(`  ✓ ${col}`);
  });

  // Check if there's a user_points table
  console.log('\n\nChecking for user_points table...');
  const { data: pointsData, error: pointsError } = await supabase
    .from('user_points')
    .select('*')
    .limit(1);

  if (pointsError) {
    console.log('❌ user_points table does NOT exist');
    console.log('   Error:', pointsError.message);
  } else {
    console.log('✅ user_points table EXISTS');
    if (pointsData && pointsData.length > 0) {
      console.log('   Columns:', Object.keys(pointsData[0]).join(', '));
    }
  }

  // Check offers columns
  console.log('\n\nOFFERS TABLE - Actual columns:');
  const { data: offerData } = await supabase
    .from('offers')
    .select('*')
    .limit(1)
    .single();
  
  if (offerData) {
    console.log('='.repeat(60));
    Object.keys(offerData).sort().forEach(col => {
      console.log(`  ✓ ${col}`);
    });
  }

  // Check reservations columns
  console.log('\n\nRESERVATIONS TABLE - Actual columns:');
  const { data: resData } = await supabase
    .from('reservations')
    .select('*')
    .limit(1)
    .single();
  
  if (resData) {
    console.log('='.repeat(60));
    Object.keys(resData).sort().forEach(col => {
      console.log(`  ✓ ${col}`);
    });
  } else {
    console.log('❌ No reservations to check schema');
  }

  console.log('\n');
}

checkSchema().catch(console.error);
