const https = require('https');
const fs = require('fs');

// Read environment variables
const envContent = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const SERVICE_ROLE_KEY = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const SQL_SCRIPT = `
-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "partners_can_create_their_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_can_view_their_own_offers" ON public.offers;
DROP POLICY IF EXISTS "anyone_can_view_public_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_can_update_their_own_offers" ON public.offers;
DROP POLICY IF EXISTS "partners_can_delete_their_own_offers" ON public.offers;
DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can view own offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can create offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can update own offers" ON public.offers;
DROP POLICY IF EXISTS "Partners can delete own offers" ON public.offers;

-- Create corrected policies
CREATE POLICY "partners_can_create_their_own_offers"
ON public.offers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = partner_id 
    AND partners.user_id = auth.uid()
    AND partners.status = 'APPROVED'
  )
);

CREATE POLICY "partners_can_view_their_own_offers"
ON public.offers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = offers.partner_id 
    AND partners.user_id = auth.uid()
  )
);

CREATE POLICY "anyone_can_view_public_offers"
ON public.offers FOR SELECT TO anon, authenticated
USING (status = 'ACTIVE' AND expires_at > NOW());

CREATE POLICY "partners_can_update_their_own_offers"
ON public.offers FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = offers.partner_id 
    AND partners.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = partner_id 
    AND partners.user_id = auth.uid()
  )
);

CREATE POLICY "partners_can_delete_their_own_offers"
ON public.offers FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partners 
    WHERE partners.id = offers.partner_id 
    AND partners.user_id = auth.uid()
  )
);

-- Verify
SELECT 'RLS_STATUS' as type, tablename, rowsecurity FROM pg_tables WHERE tablename = 'offers';
SELECT 'POLICIES' as type, policyname, cmd FROM pg_policies WHERE tablename = 'offers';
`;

const url = new URL(SUPABASE_URL);
const options = {
  hostname: url.hostname,
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  }
};

const data = JSON.stringify({ query: SQL_SCRIPT });

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('\n✅ RLS policies applied successfully!');
      console.log('You can now try creating an offer - the 403 error should be resolved.');
    } else {
      console.log('\n❌ Failed to apply RLS policies automatically.');
      console.log('Please run the SQL script manually in Supabase SQL Editor.');
      console.log('The script is saved in: fix-rls-auto.sql');
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  console.log('\n❌ Cannot execute SQL automatically.');
  console.log('Please run the SQL script manually in Supabase SQL Editor:');
  console.log('https://***REMOVED_PROJECT_ID***.supabase.co/project/***REMOVED_PROJECT_ID***/sql/new');
  console.log('\nThe SQL script is saved in: fix-rls-auto.sql');
});

req.write(data);
req.end();
