import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Index from './pages/Index';
import PartnerDashboard from './pages/PartnerDashboard';
import { ErrorBoundary } from 'react-error-boundary';
import PartnerApplication from './pages/PartnerApplication';
import ReservationDetail from './pages/ReservationDetail';
import MyPicks from './pages/MyPicks';
import Favorites from './pages/Favorites';
import AdminPanel from './pages/AdminPanel';
import AdminDashboard from './pages/AdminDashboard';
import ReserveOffer from './pages/ReserveOffer';
import NotFound from './pages/NotFound';
import NotificationsDebug from './pages/NotificationsDebug';
import MaintenanceMode from './pages/MaintenanceMode';
import UserProfile from './pages/UserProfile';
import { InstallPWA } from './components/InstallPWA';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';
import { OfflineBanner } from './components/OfflineBanner';
import { getCurrentUser } from './lib/api';
import 'leaflet/dist/leaflet.css';
import TopRightMenu from './components/layout/TopRightMenu';

const queryClient = new QueryClient();

// Check if maintenance mode is enabled
const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

const AppContent = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!isMaintenanceMode) {
        setIsLoading(false);
        return;
      }

      try {
        const { user } = await getCurrentUser();
        setIsAdmin((user as any)?.role === 'ADMIN');
      } catch (error) {
        // If there's an error fetching user, assume not admin
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserRole();
  }, []);

  // Show maintenance page if maintenance mode is on and user is not admin
  if (isMaintenanceMode && !isAdmin && !isLoading) {
    return <MaintenanceMode />;
  }

  // Show blank screen while checking user role during maintenance mode
  if (isMaintenanceMode && isLoading) {
    return null;
  }

  return (
    <BrowserRouter>
      {/* Global quick actions menu (top-right) */}
      <TopRightMenu />
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
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/profile" element={<UserProfile />} />
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
      {/* Offline Banner */}
      <OfflineBanner />
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

