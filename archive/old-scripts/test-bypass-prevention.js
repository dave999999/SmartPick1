// Automated Browser Test - Rate Limiting Bypass Prevention
// This simulates the manual test: login 6 times, clear localStorage, try again

const SITE_URL = 'https://smartpick.ge';
const SUPABASE_URL = 'https://***REMOVED_PROJECT_ID***.supabase.co';
const ANON_KEY = '***REMOVED_ANON_KEY_2***';

const TEST_EMAIL = 'bypass-test@example.com';
const WRONG_PASSWORD = 'WrongPassword123!';

console.log('🧪 Testing Rate Limiting Bypass Prevention\n');
console.log('This test simulates:');
console.log('1. Try to login 6 times with wrong password');
console.log('2. Simulate clearing localStorage (client-side bypass attempt)');
console.log('3. Try again → Should STILL be blocked (server-side works!)\n');
console.log('='.repeat(70));

async function testServerSideRateLimiting() {
  console.log('\n📍 Phase 1: Initial 6 Login Attempts');
  console.log('-'.repeat(70));

  // Simulate 6 login attempts
  for (let i = 1; i <= 6; i++) {
    try {
      // First check rate limit (this is what AuthDialog does)
      const rateLimitResponse = await fetch(`${SUPABASE_URL}/functions/v1/rate-limit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({
          action: 'login',
          identifier: TEST_EMAIL
        })
      });

      const rateLimitData = await rateLimitResponse.json();

      if (rateLimitResponse.status === 429) {
        console.log(`❌ Attempt ${i}: BLOCKED by server - ${rateLimitData.message}`);
        console.log(`   Status: 429 Too Many Requests`);
        console.log(`   Remaining: ${rateLimitData.remaining}`);
        console.log(`   Reset at: ${rateLimitData.resetAt}`);
      } else {
        console.log(`✅ Attempt ${i}: Allowed by server - Remaining: ${rateLimitData.remaining}`);
        
        // If allowed by rate limiter, would proceed to actual login
        // (which would fail due to wrong password, but that's expected)
      }

      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Attempt ${i}: Error - ${error.message}`);
    }
  }

  console.log('\n📍 Phase 2: Simulate "Clear localStorage" (Bypass Attempt)');
  console.log('-'.repeat(70));
  console.log('⚠️  In browser: User opens DevTools → Console → localStorage.clear()');
  console.log('⚠️  This would clear client-side rate limit data');
  console.log('⚠️  Old system: User could bypass rate limiting');
  console.log('⚠️  New system: Server still remembers attempts!\n');

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('\n📍 Phase 3: Attempt After "Clearing localStorage"');
  console.log('-'.repeat(70));

  try {
    const bypassAttempt = await fetch(`${SUPABASE_URL}/functions/v1/rate-limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        action: 'login',
        identifier: TEST_EMAIL
      })
    });

    const bypassData = await bypassAttempt.json();

    if (bypassAttempt.status === 429) {
      console.log('🎉 SUCCESS! Bypass attempt BLOCKED by server!');
      console.log(`   Status: 429 Too Many Requests`);
      console.log(`   Message: ${bypassData.message}`);
      console.log(`   Remaining: ${bypassData.remaining}`);
      console.log(`   Reset at: ${bypassData.resetAt}`);
      console.log('\n✅ Server-side rate limiting is working correctly!');
      console.log('✅ Cannot be bypassed by clearing localStorage!');
      return true;
    } else {
      console.log('❌ FAIL! Bypass attempt was ALLOWED!');
      console.log(`   Status: ${bypassAttempt.status}`);
      console.log(`   Data: ${JSON.stringify(bypassData)}`);
      console.log('\n⚠️  This means rate limiting can be bypassed - check configuration!');
      return false;
    }

  } catch (error) {
    console.error(`❌ Bypass test error: ${error.message}`);
    return false;
  }
}

async function checkCurrentRateLimitStatus() {
  console.log('\n📊 Current Rate Limit Status for Test Email');
  console.log('-'.repeat(70));

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rate-limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        action: 'login',
        identifier: TEST_EMAIL
      })
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Allowed: ${data.allowed}`);
    console.log(`Remaining: ${data.remaining}`);
    console.log(`Message: ${data.message || 'N/A'}`);
    if (data.resetAt) {
      const resetTime = new Date(data.resetAt);
      const minutesUntilReset = Math.ceil((resetTime - new Date()) / 60000);
      console.log(`Reset at: ${resetTime.toLocaleString()}`);
      console.log(`Minutes until reset: ${minutesUntilReset}`);
    }
  } catch (error) {
    console.error(`Error checking status: ${error.message}`);
  }
}

async function runTest() {
  console.log(`\n🚀 Starting Bypass Prevention Test`);
  console.log(`Site: ${SITE_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log(`Date: ${new Date().toLocaleString()}`);
  console.log('='.repeat(70));

  const success = await testServerSideRateLimiting();

  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Summary');
  console.log('='.repeat(70));

  if (success) {
    console.log('✅ PASS: Server-side rate limiting works correctly');
    console.log('✅ PASS: Cannot be bypassed by clearing localStorage');
    console.log('✅ PASS: Attackers are blocked at server level');
    console.log('\n🎉 Security enhancement is working as designed!');
  } else {
    console.log('❌ FAIL: Rate limiting may have issues');
    console.log('⚠️  Please check Edge Function logs and database');
  }

  console.log('\n' + '='.repeat(70));
  await checkCurrentRateLimitStatus();
  console.log('='.repeat(70));
  
  console.log('\n💡 To manually test in browser:');
  console.log(`1. Go to ${SITE_URL}`);
  console.log('2. Click "Sign In"');
  console.log('3. Enter email: test@example.com');
  console.log('4. Enter wrong password 6 times');
  console.log('5. Should see: "Too many login attempts..."');
  console.log('6. Open DevTools → Console → Run: localStorage.clear()');
  console.log('7. Try login again → Should STILL be blocked!');
}

runTest().catch(console.error);
