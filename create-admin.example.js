/**
 * SAFE Admin User Creation Script
 *
 * SECURITY: This example file shows how to create admin users safely.
 * Copy this to create-admin.js and set your credentials via environment variables.
 *
 * Usage:
 *   1. Copy: cp create-admin.example.js create-admin.js
 *   2. Set env vars:
 *      export SUPABASE_URL="your-url"
 *      export SUPABASE_SERVICE_KEY="your-service-key"
 *      export ADMIN_EMAIL="admin@yourdomain.com"
 *      export ADMIN_PASSWORD="YourStrongPassword123!@#"
 *   3. Run: node create-admin.js
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// SECURE: Read from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing Supabase credentials!');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function promptForInput(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function createAdmin() {
  console.log('🔐 SmartPick Admin User Creation\n');

  // Prompt for credentials if not in env
  const email = adminEmail || await promptForInput('Admin email: ');
  const password = adminPassword || await promptForInput('Admin password (12+ chars): ');
  const name = await promptForInput('Admin name (default: Admin User): ') || 'Admin User';

  // Validate password strength
  if (password.length < 12) {
    console.error('❌ Password must be at least 12 characters!');
    process.exit(1);
  }

  try {
    console.log('Creating authentication user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists in authentication system');
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email === email);

        if (existingUser) {
          console.log('✅ Found existing user, updating role to ADMIN...');
          await supabase.from('users').upsert({
            id: existingUser.id,
            email,
            name,
            role: 'ADMIN',
            status: 'ACTIVE'
          }, { onConflict: 'id' });

          console.log('\n✅ SUCCESS! Admin user updated.');
          console.log(`   Email: ${email}`);
          console.log(`   Role: ADMIN`);
          return;
        }
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('No user data returned');
    }

    console.log('✅ Auth user created with ID:', authData.user.id);

    // Update user role to ADMIN
    console.log('Setting user role to ADMIN...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'ADMIN', status: 'ACTIVE' })
      .eq('id', authData.user.id);

    if (updateError) throw updateError;

    console.log('\n✅ SUCCESS! Admin user created.');
    console.log(`   Email: ${email}`);
    console.log(`   Password: <hidden for security>`);
    console.log(`   Role: ADMIN`);
    console.log('\n⚠️  IMPORTANT: Change password after first login!');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

createAdmin();
