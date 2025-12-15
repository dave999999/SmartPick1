// =============================================
// DIAGNOSTIC: Check Supabase Configuration
// =============================================
// Run this in browser console to diagnose 403 errors
// =============================================

console.log('🔍 Supabase Configuration Diagnostic\n');

// 1. Check environment variables
const config = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  urlLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0,
};

console.log('📋 Environment Variables:', {
  'Has URL': config.hasUrl,
  'Has Anon Key': config.hasAnonKey,
  'Anon Key Length': config.urlLength,
  'URL': config.url,
});

// 2. Check if there's a stored session causing issues
const storedSession = localStorage.getItem('smartpick-auth');
console.log('💾 Stored Session:', storedSession ? 'EXISTS (may be corrupted)' : 'NONE');

// 3. Test auth endpoint directly
fetch(`${config.url}/auth/v1/user`, {
  headers: {
    'apikey': config.anonKey,
    'Authorization': `Bearer ${config.anonKey}`,
  }
})
  .then(res => {
    console.log('🌐 Auth Endpoint Test:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
    });
    return res.json();
  })
  .then(data => console.log('📥 Response:', data))
  .catch(err => console.error('❌ Error:', err));

// 4. Clear corrupted session (if needed)
console.log('\n💡 To fix corrupted session, run:');
console.log('   localStorage.removeItem("smartpick-auth")');
console.log('   location.reload()');
