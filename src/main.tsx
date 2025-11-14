import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { I18nProvider } from './lib/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SpeedInsights } from '@vercel/speed-insights/react'; // ✅ Vercel Speed Insights for Core Web Vitals monitoring
import { logger } from './lib/logger';

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

createRoot(document.getElementById('root')!).render(
	<ErrorBoundary>
		<I18nProvider>
			<App />
			{/* 👇 Speed Insights runs on every page */}
			<SpeedInsights />
		</I18nProvider>
	</ErrorBoundary>
);

// ============================================
// PWA Service Worker - DISABLED (Unregister old workers)
// ============================================
// Force unregister any existing service workers to fix MIME type errors
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.getRegistrations().then((registrations) => {
		registrations.forEach((registration) => {
			registration.unregister();
			logger.log('[PWA] Old Service Worker unregistered');
		});
	});
}

// Temporarily disabled to fix service worker issues
// Will re-enable after clearing old registrations
/*
if ('serviceWorker' in navigator && import.meta.env.PROD) {
	window.addEventListener('load', () => {
		navigator.serviceWorker
			.register('/service-worker.js')
			.then((registration) => {
				logger.log('[PWA] Service Worker registered successfully:', registration.scope);

				// Check for updates every 5 minutes (more aggressive)
				setInterval(() => {
					logger.log('[PWA] Checking for updates...');
					registration.update();
				}, 5 * 60 * 1000);

				// Listen for updates
				registration.addEventListener('updatefound', () => {
					const newWorker = registration.installing;
					if (newWorker) {
						logger.log('[PWA] New service worker installing...');
						newWorker.addEventListener('statechange', () => {
							if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
								// New version available - force immediate update
								logger.log('[PWA] New version available! Auto-updating...');
								newWorker.postMessage({ type: 'SKIP_WAITING' });

								// Auto-reload after 2 seconds (give user time to save work)
								setTimeout(() => {
									logger.log('[PWA] Reloading to activate new version...');
									window.location.reload();
								}, 2000);
							}
						});
					}
				});

				// Also check for updates on page visibility change
				document.addEventListener('visibilitychange', () => {
					if (!document.hidden) {
						logger.log('[PWA] Page visible, checking for updates...');
						registration.update();
					}
				});
			})
			.catch((error) => {
				logger.error('[PWA] Service Worker registration failed:', error);
			});

		// Listen for controller change (new service worker activated)
		let refreshing = false;
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			if (!refreshing) {
				logger.log('[PWA] New Service Worker activated, reloading...');
				refreshing = true;
				window.location.reload();
			}
		});
	});
}
*/

