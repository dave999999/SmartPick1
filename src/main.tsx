// MUST BE FIRST: Override console methods before React DevTools hooks them
import './lib/console-bypass';

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
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
// PWA Service Worker - DISABLED (causing cache issues)
// ============================================
// Unregister any existing service workers and clear caches
if ('serviceWorker' in navigator) {
	window.addEventListener('load', async () => {
		try {
			// Unregister all service workers
			const registrations = await navigator.serviceWorker.getRegistrations();
			for (const registration of registrations) {
				await registration.unregister();
				logger.log('[PWA] Unregistered service worker:', registration.scope);
			}
			
			// Clear all caches to prevent stale content
			if ('caches' in window) {
				const cacheNames = await caches.keys();
				await Promise.all(cacheNames.map(name => caches.delete(name)));
				logger.log('[PWA] Cleared all caches');
			}
		} catch (error) {
			logger.error('[PWA] Error during cleanup:', error);
		}
	});
}

