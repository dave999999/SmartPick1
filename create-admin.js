import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggzhtpaxnhwcilomswtm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDg4MDczOSwiZXhwIjoyMDc2NDU2NzM5fQ.V5MkrrNxmyW8zjVTiTvV0OY_Js9MHOwLiN2mcteD6H8';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  const adminEmail = 'admin@smartpick.ge';
  const adminPassword = 'SmartPick2025!Admin';
  const adminName = 'Admin User';
  const adminPhone = '+995555000000';

  console.log('🔐 Creating admin user...');
  console.log('Email:', adminEmail);
  console.log('Password:', adminPassword);
  console.log('');

  try {
    // Step 1: Create user in Supabase Auth
    console.log('Step 1: Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError.message);
      return;
    }

    console.log('✅ Auth user created successfully!');
    console.log('User ID:', authData.user.id);
    console.log('');

    // Step 2: Insert into users table
    console.log('Step 2: Adding user to database...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: adminEmail,
          name: adminName,
          phone: adminPhone,
          role: 'ADMIN',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (userError) {
      console.error('❌ Error adding user to database:', userError.message);
      console.log('You may need to run the database setup scripts first.');
      return;
    }

    console.log('✅ User added to database successfully!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🎉 ADMIN USER CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📋 Admin Credentials:');
    console.log('   Email:    ', adminEmail);
    console.log('   Password: ', adminPassword);
    console.log('   User ID:  ', authData.user.id);
    console.log('   Role:     ', 'ADMIN');
    console.log('');
    console.log('🔗 Login at: https://your-app-url.com');
    console.log('');
    console.log('⚠️  IMPORTANT: Change your password after first login!');
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

createAdminUser();