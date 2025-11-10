// Test Security Enhancements
// Run with: node test-security-features.js

const SUPABASE_URL = 'https://***REMOVED_PROJECT_ID***.supabase.co';
const ANON_KEY = '***REMOVED_ANON_KEY_2***';

async function testRateLimit() {
  console.log('\n🧪 Testing Rate Limit Edge Function...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rate-limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        action: 'login',
        identifier: 'test@example.com'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Rate limit check successful:', data);
      return true;
    } else {
      console.error('❌ Rate limit check failed:', response.status, await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Rate limit error:', error.message);
    return false;
  }
}

async function testMultipleAttempts() {
  console.log('\n🧪 Testing Rate Limit Enforcement (6 attempts)...');
  
  for (let i = 1; i <= 6; i++) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rate-limit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({
          action: 'login',
          identifier: 'test-limit@example.com'
        })
      });

      const data = await response.json();
      
      if (response.status === 429) {
        console.log(`❌ Attempt ${i}: BLOCKED (as expected) -`, data.message);
      } else {
        console.log(`✅ Attempt ${i}: Allowed - Remaining: ${data.remaining}`);
      }
    } catch (error) {
      console.error(`❌ Attempt ${i}: Error -`, error.message);
    }
    
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function testCSRFWithoutAuth() {
  console.log('\n🧪 Testing CSRF Token (without authentication)...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/csrf-token/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      }
    });

    if (response.status === 401) {
      console.log('✅ CSRF correctly requires authentication (401)');
      return true;
    } else {
      console.log('⚠️ CSRF response:', response.status, await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ CSRF error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Security Features Test Suite\n');
  console.log('Project:', SUPABASE_URL);
  console.log('Testing Edge Functions:', 'rate-limit, csrf-token');
  console.log('='.repeat(60));

  const results = {
    rateLimit: await testRateLimit(),
    rateLimitEnforcement: await testMultipleAttempts(),
    csrfAuth: await testCSRFWithoutAuth(),
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log('  Rate Limit Basic:', results.rateLimit ? '✅ PASS' : '❌ FAIL');
  console.log('  Rate Limit Enforcement: Check logs above');
  console.log('  CSRF Authentication:', results.csrfAuth ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = results.rateLimit && results.csrfAuth;
  console.log('\n' + (allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed'));
  console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);
