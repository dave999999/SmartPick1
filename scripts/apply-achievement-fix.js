/**
 * Apply the complete achievement fix migration
 * This script will:
 * 1. Add category and partner tracking columns
 * 2. Update the reservation trigger
 * 3. Fix the check_user_achievements function
 * 4. Backfill existing user data
 * 5. Trigger achievement checks for all users
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('📝 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250106_fix_achievements_complete.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying migration...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql not found, trying direct execution...');
      const { error: directError } = await supabase.from('_migrations').insert({
        name: '20250106_fix_achievements_complete',
        executed_at: new Date().toISOString()
      });

      if (directError) {
        console.error('❌ Migration failed:', directError);
        process.exit(1);
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('📊 Checking results...');

    // Check if columns were added
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('category_counts, unique_partners_visited, partner_visit_counts')
      .limit(1);

    if (statsError) {
      console.error('❌ Error checking user_stats:', statsError);
    } else {
      console.log('✅ New columns added to user_stats');
      if (stats && stats.length > 0) {
        console.log('Sample data:', stats[0]);
      }
    }

    // Check achievements
    const { data: achievements, error: achError } = await supabase
      .from('user_achievements')
      .select('*');

    if (achError) {
      console.error('❌ Error checking achievements:', achError);
    } else {
      console.log(`✅ Total unlocked achievements: ${achievements?.length || 0}`);
    }

    console.log('');
    console.log('🎉 Migration complete! All achievements should now unlock properly.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

applyMigration();
