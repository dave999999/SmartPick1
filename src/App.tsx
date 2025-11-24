import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { getCurrentUser } from './lib/api';
// supabase dynamically imported to reduce initial bundle size
import { useActivityTracking } from './hooks/useActivityTracking';
import { initSentry } from './lib/sentry';

// Initialize Sentry as early as possible
initSentry();

// Eager load: Only Index page (main landing) and essential components
import Index from './pages/Index';
import IndexRedesigned from './pages/IndexRedesigned';
import { InstallPWA } from './components/InstallPWA';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';
import { OfflineBanner } from './components/OfflineBanner';
import { QueueStatus } from './components/QueueStatus';
import TopRightMenu from './components/layout/TopRightMenu';
import { CookieConsent } from './components/CookieConsent';

// Lazy load: All other routes for code splitting (~300 KB savings on initial load)
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboard'));
const PartnerApplication = lazy(() => import('./pages/PartnerApplication'));
const ReservationDetail = lazy(() => import('./pages/ReservationDetail'));
const MyPicks = lazy(() => import('./pages/MyPicks'));
const Favorites = lazy(() => import('./pages/Favorites'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ReserveOffer = lazy(() => import('./pages/ReserveOffer'));
const NotFound = lazy(() => import('./pages/NotFound'));
const NotificationsDebug = lazy(() => import('./pages/NotificationsDebug'));
const SentryTest = lazy(() => import('./pages/SentryTest'));
const MaintenanceMode = lazy(() => import('./pages/MaintenanceMode'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const HapticTest = lazy(() => import('./pages/HapticTest'));
const AccessibilityTest = lazy(() => import('./pages/AccessibilityTest'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Contact = lazy(() => import('./pages/Contact'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail').then(module => ({ default: module.VerifyEmail })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(module => ({ default: module.ResetPassword })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const VerifyRequested = lazy(() => import('./pages/VerifyRequested').then(module => ({ default: module.VerifyRequested })));

// Lazy load leaflet CSS only when map is needed
const loadLeafletCSS = () => {
  if (!document.querySelector('link[href*="leaflet.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
};

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white via-[#F0FFF9] to-[#E0F9F0]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const AppContent = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Track user activity for real-time monitoring
  useActivityTracking();

  useEffect(() => {
    let cancelled = false;
    const checkMaintenanceAndUser = async () => {
      try {
        const hostname = window.location.hostname;
        const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.');

        if (!isProduction) {
          if (!cancelled) {
            setIsMaintenanceMode(false);
            setIsLoading(false);
          }
          return;
        }

        // Dynamic import only in production path
        const { supabase } = await import('./lib/supabase');

        const { data: setting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single();

        const maintenanceEnabled = setting?.value?.enabled === true;
        if (!cancelled) {
          setIsMaintenanceMode(maintenanceEnabled);
        }

        if (maintenanceEnabled) {
          // Fetch authenticated user and verify admin role via profile table (more reliable than auth payload)
          const { user } = await getCurrentUser();
          if (user) {
            try {
              const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', (user as any).id)
                .single();
              if (!cancelled) {
                const role = (profile?.role || '').toUpperCase();
                setIsAdmin(role === 'ADMIN' || role === 'SUPER_ADMIN');
              }
            } catch (e) {
              console.warn('Failed to load profile for maintenance bypass', e);
              if (!cancelled) setIsAdmin(false);
            }
          } else if (!cancelled) {
            setIsAdmin(false);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error checking maintenance mode:', error);
          setIsAdmin(false);
          setIsMaintenanceMode(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    // Defer to next tick to allow first paint before heavy import
    const timer = setTimeout(checkMaintenanceAndUser, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Secondary effect: if maintenance mode active and initial check ran before auth session loaded,
  // re-attempt admin bypass once auth is available.
  useEffect(() => {
    if (!isMaintenanceMode || isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import('./lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (cancelled) return;
        const roleValue = (profile?.role || '').trim().toUpperCase();
        if (['ADMIN','SUPER_ADMIN'].includes(roleValue)) {
          setIsAdmin(true);
        }
      } catch (e) {
        // silent; user remains non-admin
      }
    })();
    return () => { cancelled = true; };
  }, [isMaintenanceMode, isAdmin]);

  // Show maintenance page if maintenance mode is on and user is not admin
  if (isMaintenanceMode && !isAdmin && !isLoading) {
    return (
      <Suspense fallback={<PageLoader />}>
        <MaintenanceMode />
      </Suspense>
    );
  }

  // Show blank screen while checking user role during maintenance mode
  if (isMaintenanceMode && isLoading) {
    return null;
  }

  return (
    <BrowserRouter>
      {/* Global quick actions menu (top-right) */}
      <TopRightMenu />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<IndexRedesigned />} />
          <Route path="/old" element={<Index />} />
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
          <Route 
            path="/reserve/:offerId" 
            element={
              <Suspense fallback={<PageLoader />}>
                <ReserveOffer onMount={loadLeafletCSS} />
              </Suspense>
            } 
          />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/debug/notifications" element={<NotificationsDebug />} />
          <Route path="/debug/sentry" element={<SentryTest />} />
          <Route path="/debug/haptic" element={<HapticTest />} />
          <Route path="/debug/accessibility" element={<AccessibilityTest />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-requested" element={<VerifyRequested />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {/* PWA Install Prompts */}
      <InstallPWA />
      <IOSInstallPrompt />
      {/* Offline Banner */}
      <OfflineBanner />
      {/* Queue Status Indicator */}
      <QueueStatus />
      {/* Cookie Consent Banner */}
      <CookieConsent />
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

