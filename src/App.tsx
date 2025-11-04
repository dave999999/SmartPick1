import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import PartnerDashboard from './pages/PartnerDashboard';
import { ErrorBoundary } from 'react-error-boundary';
import PartnerApplication from './pages/PartnerApplication';
import ReservationDetail from './pages/ReservationDetail';
import MyPicks from './pages/MyPicks';
import AdminPanel from './pages/AdminPanel';
import AdminDashboard from './pages/AdminDashboard';
import ReserveOffer from './pages/ReserveOffer';
import NotFound from './pages/NotFound';
import NotificationsDebug from './pages/NotificationsDebug';
import { InstallPWA } from './components/InstallPWA';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';
import 'leaflet/dist/leaflet.css';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/partner"
            element={
              <ErrorBoundary
                fallbackRender={({ error }) => (
                  <div className="p-6 text-center">
                    <h2 className="text-red-600 font-semibold">⚠️ Something went wrong</h2>
                    <p className="text-gray-700">{error?.message}</p>
                    <p className="text-sm text-gray-500">Component: Partner Dashboard</p>
                  </div>
                )}
              >
                <PartnerDashboard />
              </ErrorBoundary>
            }
          />
          <Route path="/partner/apply" element={<PartnerApplication />} />
          <Route path="/my-picks" element={<MyPicks />} />
          <Route path="/reservation/:id" element={<ReservationDetail />} />
          <Route path="/reserve/:offerId" element={<ReserveOffer />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/debug/notifications" element={<NotificationsDebug />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* PWA Install Prompts */}
        <InstallPWA />
        <IOSInstallPrompt />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
