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

async function checkPoints() {
  console.log('\n💰 CHECKING POINTS SYSTEM\n');
  
  // Check user_points table
  const { data: points, error } = await supabase
    .from('user_points')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('USER_POINTS TABLE:');
  console.log('='.repeat(60));
  
  if (points && points.length > 0) {
    console.log(`Found ${points.length} entries (showing first 5):\n`);
    console.log('Columns:', Object.keys(points[0]).join(', '));
    console.log('');
    
    for (const p of points) {
      console.log(`User ID: ${p.user_id}`);
      console.log(`Balance: ${p.balance || 0}`);
      console.log(`Lifetime earned: ${p.lifetime_earned || 0}`);
      console.log(`Lifetime spent: ${p.lifetime_spent || 0}`);
      console.log('---');
    }

    // Try to join with users
    console.log('\nTrying to JOIN user_points with users...\n');
    const { data: joined, error: joinError } = await supabase
      .from('users')
      .select('id, name, email, role, user_points(balance, lifetime_earned, lifetime_spent)')
      .limit(5);

    if (joinError) {
      console.error('❌ Join error:', joinError.message);
    } else {
      console.log('✅ Join successful! Sample data:');
      joined?.forEach(u => {
        console.log(`\n${u.name} (${u.email})`);
        console.log(`  Role: ${u.role}`);
        console.log(`  Points: ${(u as any).user_points?.balance || 0}`);
      });
    }
  } else {
    console.log('❌ No points data found!');
  }

  console.log('\n');
}

checkPoints().catch(console.error);
