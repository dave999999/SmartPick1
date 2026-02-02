import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { getCurrentUser } from './lib/api';
import { logger } from './lib/logger';
// supabase dynamically imported to reduce initial bundle size
import { useActivityTracking } from './hooks/useActivityTracking';
import { getActivePenalty, getPenaltyDetails, liftPenaltyWithPoints } from './lib/api/penalty';
import type { UserPenalty } from './lib/api/penalty';
import { GoogleMapProvider } from './components/map/GoogleMapProvider';
import { queryClient } from './lib/queryClient';
import { OverlayOrchestrator } from './components/OverlayOrchestrator';
import { useCurrentUser } from './hooks/useQueryHooks';
import { useUserStore } from './stores';
import { DeepLinkHandler } from './hooks/useDeepLinking';

// Eager load: Only Index page (main landing) and essential components
import IndexRedesigned from './pages/IndexRedesigned';
import { InstallPWA } from './components/InstallPWA';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';
import TopRightMenu from './components/layout/TopRightMenu';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load: All other routes for code splitting (~300 KB savings on initial load)
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboardV3'));
const PartnerApplication = lazy(() => import('./pages/PartnerApplication'));
const ReservationHistory = lazy(() => import('./pages/ReservationHistory'));
const Favorites = lazy(() => import('./pages/Favorites'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const ReserveOffer = lazy(() => import('./pages/ReserveOffer'));
const NotFound = lazy(() => import('./pages/NotFound'));
const NotificationsDebug = lazy(() => import('./pages/NotificationsDebug'));
const MaintenanceMode = lazy(() => import('./pages/MaintenanceMode'));
const UserProfile = lazy(() => import('./pages/UserProfileApple'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Contact = lazy(() => import('./pages/Contact'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail').then(module => ({ default: module.VerifyEmail })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(module => ({ default: module.ResetPassword })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const VerifyRequested = lazy(() => import('./pages/VerifyRequested').then(module => ({ default: module.VerifyRequested })));
const DesignReference = lazy(() => import('./pages/DesignReference'));

// (Removed unused loadLeafletCSS helper)

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white via-[#F0FFF9] to-[#E0F9F0]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

const AppContent = () => {
  const setUser = useUserStore((state) => state.setUser);
  
  // 🚀 OPTIMIZATION: Fetch user once globally, cache for 10 minutes
  // All pages will read from Zustand store instead of making duplicate queries
  const { data: globalUser } = useCurrentUser();
  
  useEffect(() => {
    if (globalUser) {
      setUser(globalUser);
      logger.log('👤 User loaded globally:', { userId: globalUser.id, hasName: !!globalUser.name });
    }
  }, [globalUser, setUser]);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penaltyData, setPenaltyData] = useState<UserPenalty | null>(null);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [suspensionPenalty, setSuspensionPenalty] = useState<UserPenalty | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [showMissedPickupDialog, setShowMissedPickupDialog] = useState(false);
  const [missedPickupWarning, setMissedPickupWarning] = useState<any>(null);

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

        // ⚡ ANR FIX: Delay heavy query to prevent blocking UI thread on cold start
        await new Promise(resolve => setTimeout(resolve, 100));

        // Dynamic import only in production path
        const { supabase } = await import('./lib/supabase');

        // Check if we're in the middle of OAuth callback (don't block it)
        const urlParams = new URLSearchParams(window.location.search);
        const isOAuthCallback = urlParams.has('code') || urlParams.has('access_token') || urlParams.has('error');
        
        if (isOAuthCallback) {
          logger.debug('OAuth callback detected - skipping maintenance check');
          if (!cancelled) {
            setIsMaintenanceMode(false);
            setIsLoading(false);
          }
          return;
        }

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
              logger.warn('Failed to load profile for maintenance bypass', e);
              if (!cancelled) setIsAdmin(false);
            }
          } else if (!cancelled) {
            setIsAdmin(false);
          }
        }
      } catch (error) {
        if (!cancelled) {
          logger.error('Error checking maintenance mode:', error);
          setIsAdmin(false);
          setIsMaintenanceMode(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    // ⚡ ANR FIX: Defer to allow first paint (increased from 0 to 300ms)
    const timer = setTimeout(checkMaintenanceAndUser, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // ✅ OPTIMIZED: Poll maintenance mode instead of WebSocket (saves 50-80 connections!)
  // Polls every 30 seconds + checks before critical actions (see checkMaintenanceMode in api)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const checkMaintenance = async () => {
      try {
        const { supabase } = await import('./lib/supabase');
        
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single();
        
        if (!error && data) {
          const maintenanceEnabled = data.value?.enabled === true;
          setIsMaintenanceMode(maintenanceEnabled);
          
          // If maintenance mode is enabled, check if current user is admin
          if (maintenanceEnabled) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();
              const role = (profile?.role || '').toUpperCase();
              setIsAdmin(role === 'ADMIN' || role === 'SUPER_ADMIN');
            } else {
              setIsAdmin(false);
            }
          }
        }
      } catch (error) {
        logger.error('Error checking maintenance mode:', error);
      }
    };

    // Check immediately on mount
    checkMaintenance();
    
    // Poll every 60 seconds (acceptable delay for emergency situations)
    // Reduced frequency to save API calls while maintaining reasonable response time
    interval = setInterval(checkMaintenance, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Global auth error handler - catch refresh token errors
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    
    (async () => {
      try {
        const { supabase } = await import('./lib/supabase');
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'TOKEN_REFRESHED') {
            logger.debug('✅ Token refreshed successfully');
          }
          if (event === 'SIGNED_OUT') {
            logger.debug('🔐 User signed out');
            // Clear any cached data
            if (typeof window !== 'undefined') {
              localStorage.removeItem('recentAuthTs');
            }
          }
        });
        subscription = data.subscription;
      } catch (error) {
        logger.error('Error setting up auth listener:', error);
      }
    })();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Check for active penalties on app load (once user is authenticated)
  useEffect(() => {
    let cancelled = false;
    const checkPenaltyOnLoad = async () => {
      try {
        const { user } = await getCurrentUser();
        if (!user || cancelled) return;

        const { supabase } = await import('./lib/supabase');
        
        // ALWAYS use user_points for penalty lifting (even if user is also a partner)
        // Missed pickup penalties are for USER behavior, not partner business
        const { data: userPoints } = await supabase
          .from('user_points')
          .select('balance')
          .eq('user_id', (user as any).id)
          .maybeSingle();

        if (cancelled) return;
        setUserPoints(userPoints?.balance || 0);

        let activePenalty = await getActivePenalty((user as any).id);
        if (cancelled) return;
        
        if (activePenalty && activePenalty.penalty_id) {
          const details = await getPenaltyDetails(activePenalty.penalty_id);
          if (cancelled) return;
          
          // Only show popup if penalty is not yet acknowledged
          if (details && !details.acknowledged) {
            // Check if it's a suspension (not a warning)
            logger.debug('🔍 PENALTY DEBUG:', {
              penalty_type: details.penalty_type,
              offense_number: details.offense_number,
              suspended_until: details.suspended_until,
              penalty_id: details.id
            });
            
            const isSuspension = ['1hour', '5hour', '24hour', 'permanent'].includes(details.penalty_type);
            logger.debug('🎯 Is Suspension?', isSuspension);
            
            if (isSuspension) {
              // Show new SuspensionModal
              logger.debug('✅ Showing SuspensionModal');
              setSuspensionPenalty(details);
              setShowSuspensionModal(true);
            } else {
              // Show old MissedPickupPopup for warnings
              logger.debug('⚠️ Showing old PenaltyModal (warning)');
              setPenaltyData(details);
              setShowPenaltyModal(true);
            }
          }
        }
        
        // Check for missed pickup warnings (separate from penalties)
        const { data: missedPickupStatus, error: missedError } = await supabase
          .rpc('get_user_missed_pickup_status', {
            p_user_id: (user as any).id
          })
          .maybeSingle();

        if (cancelled) return;
        
        // If user has 4+ missed pickups, ensure penalty exists and show suspension
        if (missedPickupStatus && missedPickupStatus.total_missed >= 4) {
          logger.debug('🚫 User has 4+ missed pickups, checking for suspension penalty');
          
          // Check if penalty record already exists (active or recently created)
          let penaltyExists = activePenalty && activePenalty.penalty_id;
          
          if (!penaltyExists) {
            // Check if there's a recently lifted penalty for this offense level
            const { data: recentPenalty } = await supabase
              .from('user_penalties')
              .select('id, is_active, acknowledged_at')
              .eq('user_id', (user as any).id)
              .eq('offense_number', missedPickupStatus.total_missed)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            // If penalty exists and was recently lifted (within last hour), don't recreate
            if (recentPenalty && recentPenalty.acknowledged_at) {
              const timeSinceLift = Date.now() - new Date(recentPenalty.acknowledged_at).getTime();
              if (timeSinceLift < 3600000) { // 1 hour
                logger.debug('⏭️ Penalty was recently lifted, skipping');
                penaltyExists = false; // Don't show modal
              }
            } else if (!recentPenalty) {
              // Only create new penalty if no recent one exists
              // Get the latest missed pickup with reservation and partner info
              const { data: latestMissedPickup } = await supabase
                .from('user_missed_pickups')
                .select('reservation_id')
                .eq('user_id', (user as any).id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (latestMissedPickup?.reservation_id) {
                // Get partner_id from the reservation
                const { data: reservation } = await supabase
                  .from('reservations')
                  .select('partner_id')
                  .eq('id', latestMissedPickup.reservation_id)
                  .maybeSingle();
                
                if (reservation?.partner_id) {
                  // Create penalty record in database
                  logger.debug('⚠️ No penalty record found, creating one now');
                  
                  const { data: newPenalty, error: createError } = await supabase
                    .from('user_penalties')
                    .insert({
                      user_id: (user as any).id,
                      reservation_id: latestMissedPickup.reservation_id,
                      partner_id: reservation.partner_id,
                      offense_type: 'missed_pickup',
                      penalty_type: missedPickupStatus.total_missed === 4 ? '1hour' : 
                                   missedPickupStatus.total_missed === 5 ? '24hour' : 'permanent',
                      offense_number: missedPickupStatus.total_missed,
                      is_active: true,
                      suspended_until: new Date(Date.now() + (
                        missedPickupStatus.total_missed === 4 ? 3600000 : // 1 hour
                        missedPickupStatus.total_missed === 5 ? 86400000 : // 24 hours
                        604800000 // 7 days
                      )).toISOString(),
                      acknowledged: false,
                      can_lift_with_points: true,
                      points_required: missedPickupStatus.total_missed === 4 ? 100 : 
                                      missedPickupStatus.total_missed === 5 ? 500 : 1000,
                      created_at: new Date().toISOString()
                    })
                    .select()
                    .single();
                
                  if (createError) {
                    logger.error('Failed to create penalty:', createError);
                  } else if (newPenalty) {
                    logger.debug('✅ Created suspension penalty:', newPenalty.id);
                    penaltyExists = true;
                    activePenalty = { penalty_id: newPenalty.id };
                  }
                }
              }
            }
          }
          
          // Now fetch and show the penalty only if it's active
          if (penaltyExists && activePenalty?.penalty_id) {
            const details = await getPenaltyDetails(activePenalty.penalty_id);
            if (details && details.is_active) {
              logger.debug('✅ Showing suspension modal with penalty:', details.id);
              setSuspensionPenalty({
                ...details,
                can_lift_with_points: true // Enable lift button
              });
              setShowSuspensionModal(true);
            } else {
              logger.debug('⏭️ Penalty exists but not active, skipping modal');
            }
          }
        } else if (missedPickupStatus && missedPickupStatus.needs_warning) {
          // 1-3 missed pickups: show friendly warning
          logger.debug('💛 Missed pickup warning:', missedPickupStatus);
          setMissedPickupWarning(missedPickupStatus);
          setShowMissedPickupDialog(true);
        }
      } catch (error) {
        logger.error('Error checking penalty on load:', error);
      }
    };

    const timer = setTimeout(checkPenaltyOnLoad, 500);
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
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {/* Skip to main content link - hidden until focused */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      {/* Global quick actions menu (top-right) */}
      <TopRightMenu />
      {/* GoogleMapProvider wraps entire app to prevent unmount/remount issues */}
      <GoogleMapProvider>
        <DeepLinkHandler />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<IndexRedesigned />} />
          <Route
            path="/partner"
            element={
              <ProtectedRoute>
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
              </ProtectedRoute>
            }
          />
          <Route path="/partner/apply" element={<PartnerApplication />} />
          <Route path="/my-picks" element={<ProtectedRoute><ReservationHistory /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route 
            path="/reserve/:offerId" 
            element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute><ReserveOffer /></ProtectedRoute>
              </Suspense>
            } 
          />
          {/* New Admin Dashboard with Nested Routes */}
          <Route path="/admin/*" element={<AdminDashboard />} />
          
          {/* Legacy Admin Panel (keep for backward compatibility) */}
          <Route path="/admin-panel" element={<AdminPanel />} />
          <Route path="/debug/notifications" element={<NotificationsDebug />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-requested" element={<VerifyRequested />} />
          <Route path="/design-reference" element={<DesignReference />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </GoogleMapProvider>
      {/* PWA Install Prompts */}
      <InstallPWA />
      <IOSInstallPrompt />
      
      {/* Smart Overlay Orchestrator - Priority-based overlay management */}
      <OverlayOrchestrator
        showPenaltyModal={showPenaltyModal}
        penaltyData={penaltyData}
        showSuspensionModal={showSuspensionModal}
        suspensionPenalty={suspensionPenalty}
        userPoints={userPoints}
        showMissedPickupDialog={showMissedPickupDialog}
        missedPickupWarning={missedPickupWarning}
        onPenaltyClose={() => setShowPenaltyModal(false)}
        onSuspensionClose={() => {
          setShowSuspensionModal(false);
          setSuspensionPenalty(null);
        }}
        onMissedPickupClose={async () => {
          // Mark warning as shown
          if (missedPickupWarning) {
            const { user } = await getCurrentUser();
            if (user) {
              const { supabase } = await import('./lib/supabase');
              await supabase
                .from('user_missed_pickups')
                .update({ warning_shown: true })
                .eq('user_id', (user as any).id)
                .eq('warning_shown', false);
            }
          }
          setShowMissedPickupDialog(false);
          setMissedPickupWarning(null);
        }}
        onLiftPenalty={liftPenaltyWithPoints}
        onPenaltyLifted={async () => {
          setShowPenaltyModal(false);
          setShowSuspensionModal(false);
          // Refresh user points after lifting
          const { user } = await getCurrentUser();
          if (user) {
            const { supabase } = await import('./lib/supabase');
            const { data: userPoints } = await supabase
              .from('user_points')
              .select('balance')
              .eq('user_id', (user as any).id)
              .single();
            setUserPoints(userPoints?.balance || 0);
          }
        }}
      />
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

