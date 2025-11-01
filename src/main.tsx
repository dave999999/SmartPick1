import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { I18nProvider } from './lib/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
	<ErrorBoundary>
		<I18nProvider>
			<App />
		</I18nProvider>
	</ErrorBoundary>
);
