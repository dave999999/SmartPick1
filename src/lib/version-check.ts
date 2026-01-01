import { logger } from '@/lib/logger';
/**
 * Version Check - Auto-reload on new deployment
 * Checks for new version every 5 minutes and reloads if detected
 */

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
let currentVersion: string | null = null;

/**
 * Get current build version from meta tag
 */
function getCurrentVersion(): string | null {
  const meta = document.querySelector('meta[name="version"]');
  return meta?.getAttribute('content') || null;
}

/**
 * Check if a new version is available
 */
async function checkForNewVersion(): Promise<boolean> {
  try {
    // Fetch index.html with cache busting
    const response = await fetch(`/index.html?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) return false;
    
    const html = await response.text();
    const match = html.match(/<meta name="version" content="([^"]+)"/);
    
    if (!match) return false;
    
    const latestVersion = match[1];
    
    // Initialize current version on first check
    if (!currentVersion) {
      currentVersion = latestVersion;
      return false;
    }
    
    // Check if version changed
    if (latestVersion !== currentVersion) {
      logger.debug('[Version Check] New version detected:', latestVersion, '(current:', currentVersion + ')');
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('[Version Check] Error:', error);
    return false;
  }
}

/**
 * Initialize version checking
 */
export function initVersionCheck() {
  // Get initial version
  currentVersion = getCurrentVersion();
  logger.debug('[Version Check] Current version:', currentVersion);
  
  // Check for updates periodically
  setInterval(async () => {
    logger.debug('[Version Check] Checking for updates...');
    const hasNewVersion = await checkForNewVersion();
    
    if (hasNewVersion) {
      logger.debug('[Version Check] New version available, reloading...');
      
      // Clear any cached data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Force reload from server
      window.location.reload();
    }
  }, CHECK_INTERVAL);
  
  // Also check when page becomes visible
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
      logger.debug('[Version Check] Page visible, checking for updates...');
      const hasNewVersion = await checkForNewVersion();
      
      if (hasNewVersion) {
        logger.debug('[Version Check] New version available, reloading...');
        
        // Clear caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        window.location.reload();
      }
    }
  });
}
