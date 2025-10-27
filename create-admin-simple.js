import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggzhtpaxnhwcilomswtm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDg4MDczOSwiZXhwIjoyMDc2NDU2NzM5fQ.V5MkrrNxmyW8zjVTiTvV0OY_Js9MHOwLiN2mcteD6H8';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const adminEmail = 'admin@smartpick.ge';
  const adminPassword = 'SmartPick2025!Admin';
  const adminName = 'Admin User';
  const adminPhone = '+995555000000';

  console.log('🔐 Creating Admin User for SmartPick\n');

  try {
    // Create auth user
    console.log('Creating authentication user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName
      }
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log('⚠️  User already exists in authentication system');
        
        // Get existing user
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email === adminEmail);
        
        if (existingUser) {
          console.log('✅ Found existing user with ID:', existingUser.id);
          
          // Update/insert in users table
          await supabase.from('users').upsert({
            id: existingUser.id,
            email: adminEmail,
            name: adminName,
            phone: adminPhone,
            role: 'ADMIN'
          }, { onConflict: 'id' });
          
          console.log('\n═══════════════════════════════════════');
          console.log('✅ ADMIN USER READY');
          console.log('═══════════════════════════════════════');
          console.log('\n📋 Your Admin Credentials:\n');
          console.log('   Email:    admin@smartpick.ge');
          console.log('   Password: SmartPick2025!Admin');
          console.log('   User ID:  ' + existingUser.id);
          console.log('   Role:     ADMIN');
          console.log('\n═══════════════════════════════════════');
          return;
        }
      }
      throw authError;
    }

    console.log('✅ Authentication user created');
    console.log('User ID:', authData.user.id);

    // Add to users table
    console.log('\nAdding to users table...');
    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: adminEmail,
      name: adminName,
      phone: adminPhone,
      role: 'ADMIN'
    });

    if (dbError) {
      console.error('⚠️  Database error:', dbError.message);
      console.log('\nAuth user created but database insert failed.');
      console.log('You may need to run the SQL setup first:');
      console.log('https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/sql');
    } else {
      console.log('✅ Added to database');
    }

    console.log('\n═══════════════════════════════════════');
    console.log('✅ ADMIN USER CREATED SUCCESSFULLY');
    console.log('═══════════════════════════════════════');
    console.log('\n📋 Your Admin Credentials:\n');
    console.log('   Email:    admin@smartpick.ge');
    console.log('   Password: SmartPick2025!Admin');
    console.log('   User ID:  ' + authData.user.id);
    console.log('   Role:     ADMIN');
    console.log('\n🔗 Login at your SmartPick app');
    console.log('\n⚠️  Change password after first login!');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure database tables exist (run supabase-step1-tables.sql)');
    console.log('2. Check Supabase dashboard: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm');
  }
}

createAdmin();