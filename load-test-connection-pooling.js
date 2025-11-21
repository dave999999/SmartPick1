// Load Test Script for Connection Pooling
// Tests 100+ concurrent users making API calls to verify connection pooling works
// Run with: node load-test-connection-pooling.js

// Load from .env file if available
const fs = require('fs');
let SUPABASE_URL, SUPABASE_ANON_KEY;

try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const urlMatch = envFile.match(/VITE_SUPABASE_URL=(.+)/);
  const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
  SUPABASE_URL = urlMatch ? urlMatch[1].trim() : 'https://ggzhtpaxnhwcilomswtm.supabase.co';
  SUPABASE_ANON_KEY = keyMatch ? keyMatch[1].trim() : process.env.VITE_SUPABASE_ANON_KEY;
} catch {
  SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ggzhtpaxnhwcilomswtm.supabase.co';
  SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
}

// Test configuration
const CONCURRENT_USERS = 150;
const REQUESTS_PER_USER = 5;
const DELAY_BETWEEN_REQUESTS_MS = 100;

// Test endpoints
const endpoints = [
  '/rest/v1/offers?select=*&limit=10',
  '/rest/v1/partners?select=*&limit=10',
  '/rest/v1/reservations?select=*&limit=5',
  '/functions/v1/rate-limit',
  '/functions/v1/csrf-token',
];

// Statistics
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  errors: [],
  latencies: [],
  connectionErrors: 0,
};

async function makeRequest(userId, requestNum) {
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    
    const latency = Date.now() - startTime;
    stats.latencies.push(latency);
    stats.total++;
    
    if (response.ok) {
      stats.success++;
      console.log(`✓ User ${userId} Request ${requestNum}: ${response.status} (${latency}ms)`);
    } else {
      stats.failed++;
      const text = await response.text();
      
      // Check for connection pool errors
      if (text.includes('too many connections') || text.includes('connection pool')) {
        stats.connectionErrors++;
        console.error(`✗ User ${userId} Request ${requestNum}: CONNECTION POOL ERROR - ${text.substring(0, 100)}`);
      } else {
        console.error(`✗ User ${userId} Request ${requestNum}: ${response.status} - ${text.substring(0, 100)}`);
      }
      
      stats.errors.push({ userId, requestNum, status: response.status, error: text.substring(0, 200) });
    }
  } catch (error) {
    stats.total++;
    stats.failed++;
    const latency = Date.now() - startTime;
    stats.latencies.push(latency);
    
    // Check for connection errors
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('socket') || errorMsg.includes('connection')) {
      stats.connectionErrors++;
      console.error(`✗ User ${userId} Request ${requestNum}: CONNECTION ERROR - ${errorMsg}`);
    } else {
      console.error(`✗ User ${userId} Request ${requestNum}: ${errorMsg}`);
    }
    
    stats.errors.push({ userId, requestNum, error: errorMsg });
  }
}

async function simulateUser(userId) {
  console.log(`🚀 Starting User ${userId}`);
  
  for (let i = 1; i <= REQUESTS_PER_USER; i++) {
    await makeRequest(userId, i);
    
    // Random delay between requests
    if (i < REQUESTS_PER_USER) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS + Math.random() * 200));
    }
  }
  
  console.log(`✅ User ${userId} completed`);
}

async function runLoadTest() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Connection Pooling Load Test                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Configuration:`);
  console.log(`   Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`   Requests per User: ${REQUESTS_PER_USER}`);
  console.log(`   Total Requests: ${CONCURRENT_USERS * REQUESTS_PER_USER}`);
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  console.log(`\n🏁 Starting load test...\n`);
  
  const startTime = Date.now();
  
  // Launch all users concurrently
  const userPromises = [];
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    userPromises.push(simulateUser(i));
  }
  
  await Promise.all(userPromises);
  
  const totalTime = Date.now() - startTime;
  
  // Calculate statistics
  const avgLatency = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;
  const minLatency = Math.min(...stats.latencies);
  const maxLatency = Math.max(...stats.latencies);
  const p95Latency = stats.latencies.sort((a, b) => a - b)[Math.floor(stats.latencies.length * 0.95)];
  const successRate = (stats.success / stats.total * 100).toFixed(2);
  const requestsPerSecond = (stats.total / (totalTime / 1000)).toFixed(2);
  
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                 Load Test Results                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📈 Overall Statistics:`);
  console.log(`   Total Requests:        ${stats.total}`);
  console.log(`   Successful:            ${stats.success} (${successRate}%)`);
  console.log(`   Failed:                ${stats.failed}`);
  console.log(`   Connection Errors:     ${stats.connectionErrors} ${stats.connectionErrors > 0 ? '⚠️  CRITICAL!' : '✓'}`);
  console.log(`   Total Time:            ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`   Requests/Second:       ${requestsPerSecond}`);
  
  console.log(`\n⚡ Latency Statistics:`);
  console.log(`   Average:               ${avgLatency.toFixed(2)}ms`);
  console.log(`   Min:                   ${minLatency}ms`);
  console.log(`   Max:                   ${maxLatency}ms`);
  console.log(`   P95:                   ${p95Latency}ms`);
  
  if (stats.connectionErrors > 0) {
    console.log(`\n❌ CONNECTION POOL ISSUES DETECTED!`);
    console.log(`   ${stats.connectionErrors} requests failed due to connection pool exhaustion`);
    console.log(`   Action Required: Check Supabase connection pooling configuration`);
  } else {
    console.log(`\n✅ CONNECTION POOLING WORKING CORRECTLY!`);
    console.log(`   No connection pool errors detected with ${CONCURRENT_USERS} concurrent users`);
  }
  
  if (stats.errors.length > 0 && stats.errors.length <= 10) {
    console.log(`\n⚠️  Sample Errors (first 10):`);
    stats.errors.slice(0, 10).forEach((err, idx) => {
      console.log(`   ${idx + 1}. User ${err.userId} Req ${err.requestNum}: ${err.error || `Status ${err.status}`}`);
    });
  } else if (stats.errors.length > 10) {
    console.log(`\n⚠️  ${stats.errors.length} errors detected (showing first 10):`);
    stats.errors.slice(0, 10).forEach((err, idx) => {
      console.log(`   ${idx + 1}. User ${err.userId} Req ${err.requestNum}: ${err.error || `Status ${err.status}`}`);
    });
  }
  
  console.log(`\n📊 Dashboard: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm`);
  console.log(`   → Database → Connection Pooler`);
  console.log(`   → Functions → Logs (check for errors)`);
  console.log(`\n═══════════════════════════════════════════════════════════\n`);
  
  // Exit with error code if connection errors detected
  process.exit(stats.connectionErrors > 0 ? 1 : 0);
}

// Run the test
runLoadTest().catch(err => {
  console.error('\n💥 Load test failed:', err);
  process.exit(1);
});
