// MUST BE FIRST: Override console methods before React DevTools hooks them
import './lib/console-bypass';

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/map-markers.css'; // Premium dark map marker styles
import { I18nProvider } from './lib/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './components/theme-provider';
import { SpeedInsights } from '@vercel/speed-insights/react'; // ✅ Vercel Speed Insights for Core Web Vitals monitoring
import { logger } from './lib/logger';
import Maintenance from './pages/Maintenance';
import { initSentry } from './lib/sentry'; // ✅ Sentry Error Monitoring
import { initVersionCheck } from './lib/version-check'; // ✅ Auto-reload on new version

// Initialize Sentry as early as possible
initSentry();

// Initialize version checking in production
if (import.meta.env.PROD) {
  initVersionCheck();
}

/**
 * 📊 Vercel Speed Insights
 *
 * Tracks real user performance metrics (Core Web Vitals):
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 *
 * Installation: npm install @vercel/speed-insights
 * Dashboard: https://vercel.com/[your-team]/[project]/speed-insights
 *
 * Data appears after 30-60 seconds of real user traffic.
 */

const isMaintenance = import.meta.env.PROD && String(import.meta.env.VITE_MAINTENANCE_MODE || '').toLowerCase() === 'true';

createRoot(document.getElementById('root')!).render(
  isMaintenance ? (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="smartpick-ui-theme">
        <I18nProvider>
          <Maintenance />
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  ) : (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="smartpick-ui-theme">
        <I18nProvider>
          <App />
          {/* 👇 Speed Insights runs on every page */}
          <SpeedInsights />
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
);

// ============================================
// Workbox PWA Service Worker
// ============================================
// Auto-registers service worker with full offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
	window.addEventListener('load', async () => {
		try {
			// Clean up old service workers (sw-update-checker.js)
			const registrations = await navigator.serviceWorker.getRegistrations();
			for (const registration of registrations) {
				if (registration.active && registration.active.scriptURL.includes('sw-update-checker')) {
					await registration.unregister();
					logger.log('[SW] Unregistered old update checker:', registration.scope);
				}
			}
			
			// Import Workbox window helper
			const { Workbox } = await import('workbox-window');
			
			// Register Workbox service worker
			const wb = new Workbox('/sw.js');
			
			// Listen for update events
			wb.addEventListener('waiting', () => {
				logger.log('[SW] New version available');
				
				// Show update notification
				const shouldUpdate = confirm(
					'🎉 A new version of SmartPick is available! Click OK to update and get the latest features.'
				);
				
				if (shouldUpdate) {
					// Tell service worker to skip waiting
					wb.messageSkipWaiting();
				}
			});
			
			// Reload page when new service worker takes control
			wb.addEventListener('controlling', () => {
				logger.log('[SW] New service worker activated, reloading...');
				window.location.reload();
			});
			
			// Register the service worker
			const registration = await wb.register();
			logger.log('[SW] Workbox service worker registered:', registration.scope);
			
			// Check for updates periodically
			setInterval(() => {
				registration?.update();
			}, 60 * 60 * 1000); // Check every hour
			
		} catch (error) {
			logger.error('[SW] Error with service worker:', error);
		}
	});
}

