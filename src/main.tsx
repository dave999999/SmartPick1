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
      <ThemeProvider defaultTheme="dark" storageKey="smartpick-ui-theme">
        <I18nProvider>
          <Maintenance />
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  ) : (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="smartpick-ui-theme">
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
// Simple Update Check Service Worker
// ============================================
// Registers a lightweight service worker that checks for updates
if ('serviceWorker' in navigator && import.meta.env.PROD) {
	window.addEventListener('load', async () => {
		try {
			// First, clean up any old service workers
			const registrations = await navigator.serviceWorker.getRegistrations();
			for (const registration of registrations) {
				if (registration.active && !registration.active.scriptURL.includes('sw-update-checker')) {
					await registration.unregister();
					logger.log('[SW] Unregistered old service worker:', registration.scope);
				}
			}
			
			// Register the new update checker service worker
			const registration = await navigator.serviceWorker.register('/sw-update-checker.js');
			logger.log('[SW] Update checker registered:', registration.scope);
			
			// Listen for update notifications from service worker
			let lastNotificationTime = 0;
			navigator.serviceWorker.addEventListener('message', (event) => {
				if (event.data.type === 'NEW_VERSION_AVAILABLE') {
					// Prevent notification spam (60 second cooldown)
					const now = Date.now();
					if (now - lastNotificationTime < 60000) {
						return;
					}
					lastNotificationTime = now;
					
					logger.log('[SW] New version available:', event.data.version);
					
					// Show notification and reload
					const shouldReload = confirm(
						'A new version of SmartPick is available! Click OK to refresh and get the latest updates.'
					);
					
					if (shouldReload) {
						window.location.reload();
					}
				}
			});
			
			// Check for updates when the page becomes visible
			document.addEventListener('visibilitychange', () => {
				if (!document.hidden && navigator.serviceWorker.controller) {
					navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
				}
			});
			
		} catch (error) {
			logger.error('[SW] Error with service worker:', error);
		}
	});
}

