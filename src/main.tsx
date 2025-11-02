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
