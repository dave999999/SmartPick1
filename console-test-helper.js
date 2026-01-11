/**
 * Browser Console Testing Helper
 * 
 * Copy-paste this into your browser console to get enhanced logging
 * for realtime connection testing.
 * 
 * Usage:
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy-paste this entire script
 * 4. Press Enter
 * 5. See enhanced connection monitoring
 */

(function() {
  console.log('%c🧪 Realtime Connection Testing Helper Loaded', 'color: #10b981; font-size: 16px; font-weight: bold;');
  
  // Track visibility changes with enhanced logging
  let visibilityChangeCount = 0;
  const visibilityHandler = () => {
    visibilityChangeCount++;
    const status = document.hidden ? '🌙 HIDDEN' : '☀️ VISIBLE';
    const color = document.hidden ? '#f59e0b' : '#10b981';
    
    console.log(
      `%c[${new Date().toLocaleTimeString()}] Tab ${status}`,
      `color: ${color}; font-weight: bold;`,
      `(Change #${visibilityChangeCount})`
    );
  };
  
  document.addEventListener('visibilitychange', visibilityHandler);
  
  // Connection counter
  const countConnections = () => {
    try {
      // Try to access Supabase client
      const supabaseClient = window.supabase || window.__SUPABASE_CLIENT__;
      if (!supabaseClient) {
        console.warn('⚠️ Supabase client not found in window');
        return;
      }
      
      // @ts-ignore - internal API
      const channels = supabaseClient.getChannels ? supabaseClient.getChannels() : [];
      
      console.table(
        channels.map((ch, i) => ({
          '#': i + 1,
          'Channel': ch.topic || 'unknown',
          'State': ch.state || 'unknown',
          'Type': ch.topic?.includes('reservations') ? 'MyPicks' :
                  ch.topic?.includes('telegram') ? 'Telegram' :
                  ch.topic?.includes('presence') ? 'Presence' : 'Other'
        }))
      );
      
      console.log(
        `%c📊 Total Connections: ${channels.length}`,
        'color: #3b82f6; font-size: 14px; font-weight: bold;'
      );
      
      return channels.length;
    } catch (error) {
      console.error('❌ Error counting connections:', error);
    }
  };
  
  // Expose helper functions globally
  window.__RT_TEST__ = {
    countConnections,
    getVisibilityChangeCount: () => visibilityChangeCount,
    getCurrentTab: () => document.hidden ? 'HIDDEN' : 'VISIBLE',
    startAutoCount: (interval = 2000) => {
      console.log(`%c🔄 Auto-counting every ${interval}ms`, 'color: #8b5cf6; font-weight: bold;');
      const id = setInterval(countConnections, interval);
      window.__RT_TEST__.stopAutoCount = () => {
        clearInterval(id);
        console.log('%c⏹️ Auto-count stopped', 'color: #ef4444; font-weight: bold;');
      };
    }
  };
  
  // Print usage guide
  console.log(`
%c📚 Available Commands:
%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

%c__RT_TEST__.countConnections()%c
  → Count current realtime connections

%c__RT_TEST__.getVisibilityChangeCount()%c  
  → Get total visibility changes

%c__RT_TEST__.getCurrentTab()%c
  → Check if tab is visible or hidden

%c__RT_TEST__.startAutoCount(2000)%c
  → Auto-count every 2 seconds

%c__RT_TEST__.stopAutoCount()%c
  → Stop auto-counting

%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `,
    'color: #10b981; font-size: 14px; font-weight: bold;',
    'color: #6b7280;',
    'color: #f59e0b; font-weight: bold;', 'color: #9ca3af;',
    'color: #f59e0b; font-weight: bold;', 'color: #9ca3af;',
    'color: #f59e0b; font-weight: bold;', 'color: #9ca3af;',
    'color: #f59e0b; font-weight: bold;', 'color: #9ca3af;',
    'color: #f59e0b; font-weight: bold;', 'color: #9ca3af;',
    'color: #6b7280;'
  );
  
  // Initial count
  setTimeout(() => {
    console.log('%c🔍 Initial connection check:', 'color: #3b82f6; font-weight: bold;');
    countConnections();
  }, 1000);
  
})();

// Quick test function
console.log('%c💡 Quick Test:%c __RT_TEST__.countConnections()', 'color: #8b5cf6; font-weight: bold;', 'color: #f59e0b; font-weight: bold;');
