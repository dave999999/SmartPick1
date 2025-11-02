import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { I18nProvider } from './lib/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SpeedInsights } from '@vercel/speed-insights/react'; // ✅ Vercel Speed Insights for Core Web Vitals monitoring

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
// PWA Service Worker Registration
// ============================================
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker
			.register('/service-worker.js')
			.then((registration) => {
				console.log('[PWA] Service Worker registered successfully:', registration.scope);

				// Check for updates every hour
				setInterval(() => {
					registration.update();
				}, 60 * 60 * 1000);

				// Listen for updates
				registration.addEventListener('updatefound', () => {
					const newWorker = registration.installing;
					if (newWorker) {
						newWorker.addEventListener('statechange', () => {
							if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
								// New version available
								console.log('[PWA] New version available! Reload to update.');
								// You can show a toast notification here
								if (window.confirm('New version of SmartPick is available! Reload to update?')) {
									newWorker.postMessage({ type: 'SKIP_WAITING' });
									window.location.reload();
								}
							}
						});
					}
				});
			})
			.catch((error) => {
				console.error('[PWA] Service Worker registration failed:', error);
			});

		// Listen for controller change (new service worker activated)
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			console.log('[PWA] New Service Worker activated');
		});
	});
}
