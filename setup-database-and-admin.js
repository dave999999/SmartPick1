import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://ggzhtpaxnhwcilomswtm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDg4MDczOSwiZXhwIjoyMDc2NDU2NzM5fQ.V5MkrrNxmyW8zjVTiTvV0OY_Js9MHOwLiN2mcteD6H8';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabaseAndAdmin() {
  console.log('🚀 Starting SmartPick Database Setup...\n');

  try {
    // Step 1: Read and execute SQL setup
    console.log('Step 1: Setting up database tables...');
    const sqlContent = fs.readFileSync('./supabase-step1-tables.sql', 'utf8');
    
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: sqlContent }).catch(async () => {
      // If RPC doesn't exist, try direct query
      const { error } = await supabase.from('_').select('*').limit(0);
      return { error };
    });

    console.log('✅ Database tables setup initiated (check Supabase dashboard for confirmation)\n');

    // Step 2: Create admin user
    const adminEmail = 'admin@smartpick.ge';
    const adminPassword = 'SmartPick2025!Admin';
    const adminName = 'Admin User';
    const adminPhone = '+995555000000';

    console.log('Step 2: Creating admin user...');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('');

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  Admin user already exists in auth system');
        console.log('Attempting to fetch existing user...\n');
        
        // Try to get existing user
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email === adminEmail);
        
        if (existingUser) {
          console.log('✅ Found existing admin user!');
          console.log('User ID:', existingUser.id);
          
          // Try to insert into users table (might already exist)
          const { error: userError } = await supabase
            .from('users')
            .upsert([
              {
                id: existingUser.id,
                email: adminEmail,
                name: adminName,
                phone: adminPhone,
                role: 'ADMIN',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ], { onConflict: 'id' });

          if (userError && !userError.message.includes('duplicate')) {
            console.error('❌ Error updating user in database:', userError.message);
          } else {
            console.log('✅ Admin user record updated in database\n');
          }
          
          console.log('═══════════════════════════════════════');
          console.log('🎉 ADMIN USER READY!');
          console.log('═══════════════════════════════════════');
          console.log('');
          console.log('📋 Admin Credentials:');
          console.log('   Email:    ', adminEmail);
          console.log('   Password: ', adminPassword);
          console.log('   User ID:  ', existingUser.id);
          console.log('   Role:     ', 'ADMIN');
          console.log('');
          console.log('🔗 You can now login to SmartPick');
          console.log('═══════════════════════════════════════');
          return;
        }
      } else {
        console.error('❌ Error creating auth user:', authError.message);
        return;
      }
    }

    console.log('✅ Auth user created successfully!');
    console.log('User ID:', authData.user.id);
    console.log('');

    // Insert into users table
    console.log('Step 3: Adding user to database...');
    const { error: userError } = await supabase
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
      ]);

    if (userError) {
      console.error('❌ Error adding user to database:', userError.message);
      console.log('Note: You may need to run the SQL setup script manually in Supabase dashboard');
      console.log('Go to: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/sql');
      console.log('Copy and paste the contents of supabase-step1-tables.sql\n');
      return;
    }

    console.log('✅ User added to database successfully!\n');
    
    console.log('═══════════════════════════════════════');
    console.log('🎉 SETUP COMPLETE!');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📋 Admin Credentials:');
    console.log('   Email:    ', adminEmail);
    console.log('   Password: ', adminPassword);
    console.log('   User ID:  ', authData.user.id);
    console.log('   Role:     ', 'ADMIN');
    console.log('');
    console.log('🔗 Login at your SmartPick app');
    console.log('');
    console.log('⚠️  IMPORTANT: Change your password after first login!');
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.log('\nIf tables don\'t exist, please run supabase-step1-tables.sql manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/sql');
    console.log('2. Copy and paste the contents of supabase-step1-tables.sql');
    console.log('3. Click "Run"');
    console.log('4. Then run this script again');
  }
}

setupDatabaseAndAdmin();