import { logger } from '@/lib/logger';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Partner, Offer } from '@/lib/types';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { 
  Plus, 
  QrCode, 
  Package, 
  Clock, 
  TrendingUp,
  ChevronRight,
  Edit2,
  Pause,
  Play,
  RefreshCw,
  MoreVertical,
  Wallet,
  AlertCircle,
  CheckCircle,
  Home,
  Image as ImageIcon,
  Settings,
  BarChart3
} from 'lucide-react';
import { useOfferActions } from '@/hooks/useOfferActions';
import EnhancedActiveReservations from '@/components/partner/EnhancedActiveReservations';
import { useReservationActions } from '@/hooks/useReservationActions';
import { BuyPointsModal } from '@/components/wallet/BuyPointsModal';
import { EditOfferDialog } from '@/components/partner/EditOfferDialog';
import { QRScannerDialog } from '@/components/partner/QRScannerDialog';
import CreateOfferWizard from '@/components/partner/CreateOfferWizard';
import { GalleryModal } from '@/components/partner/GalleryModal';
import { PartnerSettingsModal } from '@/components/partner/PartnerSettingsModal';
import { PartnerAnalyticsModal, PartnerAnalytics } from '@/components/partner/PartnerAnalyticsModal';
import { PartnerNotificationSettings } from '@/components/partner/PartnerNotificationSettings';
import PartnerOnboardingTour from '@/components/partner/PartnerOnboardingTour';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * PARTNER DASHBOARD V3 - APPLE-STYLE MOBILE REDESIGN
 * 
 * LAYOUT ARCHITECTURE:
 * 1. Sticky Top Strip - Essential metrics at a glance
 * 2. Performance Hero Card - Today's main focus
 * 3. Offers List - Clean, scannable, action-efficient
 * 4. Floating Action Bar - Primary actions always accessible
 * 
 * DESIGN PRINCIPLES:
 * - Glass morphism with subtle depth
 * - Large tap targets (min 44px)
 * - One-hand operation optimized
 * - Immediate visual feedback
 * - Professional, trustworthy aesthetic
 */

import { usePartnerDashboardData } from '@/hooks/pages/usePartnerDashboardData';
import { usePartnerModals } from '@/hooks/pages/usePartnerModals';
import { useVisibilityAwareSubscription } from '@/hooks/useVisibilityAwareSubscription';

export default function PartnerDashboardV3() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  
  // 🚀 REFACTORED: Extract data fetching to custom hook
  const {
    partner,
    offers,
    reservations,
    stats,
    partnerPoints,
    isLoading,
    loadPartnerData,
    refreshReservations,
  } = usePartnerDashboardData();
  
  // 🚀 REFACTORED: Extract modal state to custom hook
  const modals = usePartnerModals();
  
  // UI state
  const [activeOfferMenu, setActiveOfferMenu] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'offers' | 'active'>('offers');
  const [analytics, setAnalytics] = useState<PartnerAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Handle URL parameters (e.g., /partner?tab=new)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'new' || tab === 'active') {
      setActiveView('active');
    } else if (tab === 'offers') {
      setActiveView('offers');
    }
  }, [searchParams]);

  // Check if partner has seen onboarding tutorial
  useEffect(() => {
    if (partner?.id) {
      const hasSeenOnboarding = localStorage.getItem(`partner_onboarding_${partner.id}`);
      if (!hasSeenOnboarding) {
        // Show onboarding after a short delay so dashboard loads first
        const timer = setTimeout(() => setShowOnboarding(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [partner?.id]);

  // Handle onboarding completion
  const handleOnboardingComplete = (dontShowAgain: boolean) => {
    if (partner?.id && dontShowAgain) {
      localStorage.setItem(`partner_onboarding_${partner.id}`, 'true');
    }
    setShowOnboarding(false);
  };

  // Initialize action hooks
  const offerActions = useOfferActions(partner, loadPartnerData);
  const reservationActions = useReservationActions(loadPartnerData);

  // 🔔 Initialize push notifications for partner
  const pushNotifications = usePushNotifications();

  // Auto-sync FCM token when partner data loads
  useEffect(() => {
    const autoSyncToken = async () => {
      if (partner?.user_id && pushNotifications.syncNotifications) {
        logger.debug('🔔 Auto-syncing FCM token for partner:', partner.user_id);
        try {
          await pushNotifications.syncNotifications(partner.user_id);
          logger.debug('✅ FCM token auto-sync completed');
        } catch (error) {
          logger.warn('⚠️ FCM token auto-sync failed (non-fatal):', error);
        }
      }
    };
    autoSyncToken();
  }, [partner?.user_id]);

  // Pull to refresh functionality
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await loadPartnerData();
      toast.success('Dashboard refreshed');
    },
    threshold: 80,
  });

  // 🔔 Real-time subscription for active reservations tab
  // Only subscribes when partner is viewing the "active" tab to minimize connections
  const refreshReservationsRef = useRef(refreshReservations);
  
  // Keep ref updated without triggering re-subscription
  useEffect(() => {
    refreshReservationsRef.current = refreshReservations;
  }, [refreshReservations]);

  const partnerReservationsEnabled = !!partner?.id && activeView === 'active';
  useVisibilityAwareSubscription({
    enabled: partnerReservationsEnabled,
    channelName: partner?.id ? `public:reservations:partner:${partner.id}` : 'public:reservations:partner:disabled',
    event: '*',
    schema: 'public',
    table: 'reservations',
    filter: partner?.id ? `partner_id=eq.${partner.id}` : undefined,
    callback: async (payload: any) => {
      logger.log('📥 [PartnerDashboard] Reservation event received:', {
        eventType: payload.eventType,
        table: payload.table,
      });

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        logger.log('🔄 [PartnerDashboard] Triggering reservations refresh');
        await refreshReservationsRef.current();

        if (payload.eventType === 'INSERT') {
          toast.success('🎉 New reservation received!', {
            description: 'A customer just reserved your offer',
            duration: 5000,
          });
        }
      }
    },
  });

  // Calculate revenue today
  const revenueToday = stats?.totalRevenue || 0; // Simplified for demo

  // Load analytics data
  const handleLoadAnalytics = async () => {
    if (!partner?.id) return;
    
    setLoadingAnalytics(true);
    try {
      const { getPartnerAnalytics } = await import('@/lib/api/partners');
      const data = await getPartnerAnalytics(partner.id);
      setAnalytics(data);
      modals.openAnalytics();
    } catch (error) {
      logger.error('Failed to load analytics:', error);
      toast.error('ანალიტიკის ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Handle offer actions
  const handleEditOffer = (offerId: string) => {
    setActiveOfferMenu(null);
    const offer = offers?.find(o => o.id === offerId);
    if (offer) {
      modals.openEditOffer(offer);
    }
  };

  const handleCreateOfferWizard = async (formData: FormData) => {
    try {
      modals.setIsSubmitting(true);
      
      if (!partner) {
        toast.error('პარტნიორის ინფორმაცია არ არის ხელმისაწვდომი');
        return;
      }

      // Extract form data exactly like old dashboard
      const title = (formData.get('title') as string)?.trim() || 'Untitled Offer';
      const description = (formData.get('description') as string)?.trim() || 'No description provided';
      const original_price = parseFloat(formData.get('original_price') as string);
      const smart_price = parseFloat(formData.get('smart_price') as string);
      const quantity = parseInt(formData.get('quantity') as string);
      const offerDuration = (formData.get('offer_duration') as string) || '1_week';
      const customDays = formData.get('custom_days') as string;
      
      // Get images from FormData
      const processedImages = formData
        .getAll('images')
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value): value is string => Boolean(value));

      if (processedImages.length === 0) {
        toast.error('გთხოვთ აირჩიოთ სურათი');
        modals.setIsSubmitting(false);
        return;
      }

      // Calculate pickup times with business hours scheduling
      const { getNextOpeningTime, isBusinessOpen } = await import('@/lib/utils/businessHoursHelpers');
      
      const now = new Date();
      const businessIsOpen = isBusinessOpen(partner?.business_hours, partner?.open_24h);
      const pickupStart: Date = businessIsOpen 
        ? now 
        : getNextOpeningTime(partner?.business_hours, partner?.open_24h);
      
      // Calculate duration in days
      let durationDays: number;
      if (offerDuration === 'custom' && customDays) {
        durationDays = parseInt(customDays);
      } else {
        switch (offerDuration) {
          case '2_days':
            durationDays = 2;
            break;
          case '1_week':
            durationDays = 7;
            break;
          case '2_weeks':
            durationDays = 14;
            break;
          case '1_month':
            durationDays = 30;
            break;
          default:
            durationDays = 7;
        }
      }
      
      // Calculate expiration: start + duration
      let pickupEnd = new Date(pickupStart.getTime() + durationDays * 24 * 60 * 60 * 1000);

      // For scheduled businesses: set expiration to closing time on last day
      if (!partner?.business_hours?.is_24_7 && !partner?.open_24h && partner?.business_hours?.close) {
        const closingTime = partner.business_hours.close;
        const [hours, minutes] = closingTime.split(':').map(Number);
        pickupEnd.setHours(hours, minutes, 0, 0);
      }
      
      logger.debug('🚀 V3 OFFER SCHEDULING:', {
        businessIsOpen,
        is_24_7: partner?.business_hours?.is_24_7 || partner?.open_24h,
        businessHours: partner?.business_hours,
        now: now.toISOString(),
        pickupStart: pickupStart.toISOString(),
        pickupEnd: pickupEnd.toISOString(),
        durationDays,
        offerDuration,
        willStartLater: pickupStart > now
      });

      // Verify partner authentication
      const { supabase } = await import('@/lib/supabase');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (partner.user_id !== currentUser?.id) {
        toast.error('Authentication error: Please log out and log back in');
        modals.setIsSubmitting(false);
        return;
      }

      // Direct insert to database like old dashboard
      const insertData = {
        partner_id: partner.id,
        title,
        description,
        category: partner.business_type || 'RESTAURANT',
        images: processedImages,
        original_price,
        smart_price,
        quantity_available: quantity,
        quantity_total: quantity,
        pickup_start: pickupStart.toISOString(),
        pickup_end: pickupEnd.toISOString(),
        status: 'ACTIVE',
        expires_at: pickupEnd.toISOString(),
      };

      const { data, error } = await supabase
        .from('offers')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create offer: ${error.message}`);
      }

      toast.success('შეთავაზება წარმატებით შეიქმნა!');
      modals.closeCreateWizard();
      await loadPartnerData();
    } catch (error: any) {
      logger.error('Error creating offer:', error);
      toast.error(error.message || 'შეთავაზების შექმნა ვერ მოხერხდა');
      throw error; // Re-throw so wizard knows not to close
    } finally {
      modals.setIsSubmitting(false);
    }
  };

  const handleTogglePause = async (offer: Offer) => {
    setActiveOfferMenu(null);
    if (offer.status === 'ACTIVE') {
      await offerActions.handlePauseOffer(offer);
    } else {
      await offerActions.handleResumeOffer(offer);
    }
  };

  const handleReloadOffer = async (offer: Offer) => {
    setActiveOfferMenu(null);
    if (window.confirm('დარწმუნებული ხართ? შეთავაზება თავიდან დაიწყება ორიგინალური რაოდენობით და დროით.')) {
      await offerActions.handleReloadOffer(offer);
    }
  };

  const handlePurchaseSlot = async () => {
    if (!partner) {
      toast.error('პარტნიორის ინფორმაცია არ არის ხელმისაწვდომი');
      return;
    }

    if (!partnerPoints) {
      toast.error('პარტნიორის ქულების სისტემა არ არის ინიციალიზებული. გთხოვთ დაუკავშირდეთ მხარდაჭერას.');
      return;
    }

    const slotCost = (partnerPoints.offer_slots - 9) * 100;

    if (partnerPoints.balance < slotCost) {
      toast.error('არასაკმარისი ბალანსი სლოტის შესაძენად');
      return;
    }

    try {
      const { purchaseOfferSlot } = await import('@/lib/api');
      const result = await purchaseOfferSlot();
      
      if (result.success) {
        toast.success(`სლოტი წარმატებით შეძენილია! ახალი სლოტები: ${result.new_slots}`);
        await loadPartnerData();
      } else {
        const errorMsg = result.message || 'სლოტის შეძენა ვერ მოხერხდა';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      logger.error('Error purchasing slot:', error);
      const errorMessage = error?.message || 'სლოტის შეძენა ვერ მოხერხდა';
      
      // Provide more helpful error messages
      if (errorMessage.includes('not initialized')) {
        toast.error('პარტნიორის ქულების სისტემა არ არის ინიციალიზებული. გთხოვთ დაუკავშირდეთ მხარდაჭერას.');
      } else if (errorMessage.includes('not found')) {
        toast.error('პარტნიორი ვერ მოიძებნა სისტემაში');
      } else if (errorMessage.includes('Insufficient')) {
        toast.error('არასაკმარისი ბალანსი');
      } else {
        toast.error(errorMessage);
      }
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={pullToRefresh.containerRef} className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-28 overflow-y-auto">
      <PullToRefreshIndicator 
        pullDistance={pullToRefresh.pullDistance}
        isRefreshing={pullToRefresh.isRefreshing}
        threshold={80}
      />
      
      {/* STICKY TOP SUMMARY STRIP */}
      <div className="sticky top-[50px] z-40 bg-white shadow-sm">
        <div className="px-4 py-4">
          {/* Layer 1: Primary - Actionable Buttons */}
          <div className="flex items-center justify-between gap-3">
            {/* Home Button */}
            <button
              onClick={() => navigate('/')}
              className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center"
            >
              <Home className="w-5 h-5" />
            </button>

            {/* Gallery Button - Product Photos */}
            <button
              onClick={() => modals.openGallery()}
              className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Analytics Button - Performance Insights */}
            <button
              onClick={handleLoadAnalytics}
              disabled={loadingAnalytics}
              className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
            >
              {loadingAnalytics ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <BarChart3 className="w-5 h-5" />
              )}
            </button>

            {/* Wallet Button */}
            <button
              onClick={() => modals.openBuyPointsModal()}
              className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center"
            >
              <Wallet className="w-5 h-5" />
            </button>

            {/* Settings Button - Last */}
            <button
              onClick={() => modals.openSettings()}
              className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="px-4 pt-24 space-y-4">
        
        {/* QUICK ACTION CARD - Available Slots */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm">
          {/* Header Section */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  ხელმისაწვდომი სლოტები
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {(partnerPoints?.offer_slots || 10) - (offers?.filter(o => o.status === 'ACTIVE').length || 0)}
                  </span>
                  <span className="text-lg font-semibold text-gray-400">
                    / {partnerPoints?.offer_slots || 10}
                  </span>
                </div>
              </div>
              
              <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Package className="w-7 h-7 text-emerald-600" />
              </div>
            </div>
            
            <button
              onClick={() => modals.openCreateWizard()}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl px-4 py-3 text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              ახალი შეთავაზება
            </button>
          </div>
        </div>

        {/* VIEW TABS */}
        <div className="flex gap-1.5 bg-gray-50 p-1 rounded-2xl">
          <button
            onClick={() => setActiveView('offers')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'offers'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            თქვენი შეთავაზებები
          </button>
          <button
            onClick={() => setActiveView('active')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all relative ${
              activeView === 'active'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200'
            } ${(reservations?.length || 0) > 0 ? 'animate-pulse-subtle' : ''}`}
          >
            აქტიური რეზერვაციები
            {(reservations?.length || 0) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {reservations?.length || 0}
              </span>
            )}
          </button>
        </div>

        {/* OFFERS SECTION */}
        {activeView === 'offers' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-900">თქვენი შეთავაზებები</h2>
              {(offers?.length || 0) > 0 && (
                <p className="text-xs text-gray-500">{offers?.length || 0} ჯამური</p>
              )}
            </div>

            {/* Offers List */}
            <div className="space-y-2">
              <>
                {(offers?.length || 0) === 0 ? (
                  <div
                    className="text-center py-12 bg-white rounded-3xl border border-gray-200"
                  >
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">ჯერ შეთავაზებები არ გაქვთ</p>
                    <p className="text-sm text-gray-500 mt-1">დაამატეთ პირველი შეთავაზება და დაიწყეთ გაყიდვა</p>
                  </div>
                ) : (
                  offers?.map((offer, index) => (
                  <div
                    key={offer.id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm active:scale-[0.98] transition-transform"
                  >
                    <div className="p-3">
                      {/* Top Section: Image + Content */}
                      <div className="flex gap-3 mb-2">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0 relative">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                            {offer.images?.[0] ? (
                              <img 
                                src={offer.images[0]} 
                                alt={offer.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* Time Remaining Badge */}
                          {offer.expires_at && (() => {
                            const now = new Date();
                            const expiry = new Date(offer.expires_at);
                            const diff = expiry.getTime() - now.getTime();
                            
                            if (diff <= 0) return null;
                            
                            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                            
                            let timeText = '';
                            if (days > 0) {
                              timeText = hours > 0 ? `${days}დ ${hours}სთ` : `${days}დ`;
                            } else if (hours > 0) {
                              timeText = minutes > 0 ? `${hours}სთ ${minutes}წთ` : `${hours}სთ`;
                            } else {
                              timeText = `${minutes}წთ`;
                            }
                            
                            return (
                              <div className="absolute -bottom-1 -right-1">
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/60 rounded-md shadow-sm">
                                  <Clock size={10} className="text-orange-600" strokeWidth={2.5} />
                                  <span className="text-[10px] font-bold text-orange-600 leading-none">
                                    {timeText}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                {offer.title}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-base font-bold text-emerald-600">
                                  ₾{offer.smart_price}
                                </p>
                                {offer.original_price > offer.smart_price && (
                                  <p className="text-xs text-gray-400 line-through">
                                    ₾{offer.original_price}
                                  </p>
                                )}
                              </div>
                              {/* Quick Stats */}
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                                <span>{offer.quantity_available} left</span>
                                <span>•</span>
                                <span>Qty: {offer.original_quantity}</span>
                              </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-2">
                              <StatusPill status={offer.status} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons - Compact horizontal layout */}
                      <div className="flex items-center gap-1.5 pt-2.5 border-t border-gray-100">
                        <button 
                            onClick={() => handleEditOffer(offer.id)}
                            className="flex-1 flex items-center justify-center py-2 px-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-colors"
                            aria-label="რედაქტირება"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleTogglePause(offer)}
                            className="flex-1 flex items-center justify-center py-2 px-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
                            aria-label={offer.status === 'ACTIVE' ? 'პაუზა' : 'განავლება'}
                          >
                            {offer.status === 'ACTIVE' ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                          <button 
                            onClick={() => handleReloadOffer(offer)}
                            className="flex-1 flex items-center justify-center py-2 px-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors"
                            aria-label="თავიდან დაწყება"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm('დარწმუნებული ხართ, რომ გსურთ შეთავაზების წაშლა?')) {
                                offerActions.handleDeleteOffer(offer.id);
                              }
                            }}
                            className="flex-1 flex items-center justify-center py-2 px-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                            aria-label="წაშლა"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            </div>
          </div>
        )}

        {/* ACTIVE RESERVATIONS SECTION */}
        {activeView === 'active' && (
          <div>
            <EnhancedActiveReservations
              reservations={reservations}
              onMarkAsPickedUp={(r) => reservationActions.handleMarkAsPickedUp(r, (id) => setReservations(prev => prev.filter(res => res.id !== id)))}
              onConfirmNoShow={(r) => reservationActions.handleMarkAsNoShow(r, (id) => setReservations(prev => prev.filter(res => res.id !== id)))}
              onForgiveCustomer={(r) => reservationActions.handleForgiveCustomer(r, (id) => setReservations(prev => prev.filter(res => res.id !== id)))}
              processingIds={reservationActions.processingIds}
            />
          </div>
        )}
      </div>

      {/* BUY POINTS MODAL */}
      {modals.showBuyPointsModal && partner && (
        <BuyPointsModal
          isOpen={modals.showBuyPointsModal}
          onClose={modals.closeBuyPointsModal}
          userId={partner.user_id}
          currentBalance={partnerPoints?.balance || 0}
          mode="partner"
          partnerPoints={partnerPoints}
          onPurchaseSlot={handlePurchaseSlot}
        />
      )}

      {/* FLOATING SCAN BUTTON */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-2"
      >
        <button
          onClick={() => modals.openQRScanner()}
          className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full w-24 h-24 flex items-center justify-center shadow-2xl hover:shadow-blue-500/50 transition-all border-4 border-white"
        >
          <QrCode className="w-12 h-12" strokeWidth={2.5} />
        </button>
      </div>

      {/* DIALOGS */}
      {modals.showCreateWizard && partner && (
        <CreateOfferWizard
          open={modals.showCreateWizard}
          onClose={modals.closeCreateWizard}
          onSubmit={handleCreateOfferWizard}
          isSubmitting={modals.isSubmitting}
          is24HourBusiness={partner.hours_24_7 || false}
          businessType={partner.business_type || 'RESTAURANT'}
          businessHours={partner.business_hours}
        />
      )}

      {modals.editingOffer && partner && (
        <EditOfferDialog
          open={!!modals.editingOffer}
          onOpenChange={(open) => {
            if (!open) modals.closeEditOffer();
          }}
          offer={modals.editingOffer}
          partner={partner}
          autoExpire6h={partner.hours_24_7 || false}
          onSuccess={() => {
            modals.closeEditOffer();
            loadPartnerData();
          }}
        />
      )}

      {modals.showQRScanner && (
        <QRScannerDialog
          open={modals.showQRScanner}
          onOpenChange={(open) => {
            if (open) modals.openQRScanner();
            else modals.closeQRScanner();
            if (!open) loadPartnerData();
          }}
          partnerId={partner?.id || ''}
        />
      )}

      {/* Gallery Modal */}
      <GalleryModal
        open={modals.showGallery}
        onClose={modals.closeGallery}
        partnerId={partner?.id || ''}
      />

      {/* Settings Modal */}
      <PartnerSettingsModal
        open={modals.showSettings}
        onClose={modals.closeSettings}
        partnerId={partner?.id || ''}
        userId={partner?.user_id || ''}
      />

      {/* Analytics Modal */}
      <PartnerAnalyticsModal
        open={modals.showAnalytics}
        onOpenChange={modals.closeAnalytics}
        analytics={analytics}
        isLoading={loadingAnalytics}
      />

      {/* Notification Settings Modal */}
      <PartnerNotificationSettings
        open={modals.showNotifications}
        onOpenChange={modals.closeNotifications}
        partnerId={partner?.id || ''}
        userId={partner?.user_id || ''}
        onDataRefresh={loadPartnerData}
      />

      {/* Onboarding Tutorial - Shows on first login */}
      <PartnerOnboardingTour
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
        partnerName={partner?.business_name}
      />
    </div>
  );
}

// Status Pill Component
function StatusPill({ status }: { status: string }) {
  const config = {
    ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'აქტიური' },
    PAUSED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'პაუზაზე' },
    SOLD_OUT: { bg: 'bg-red-100', text: 'text-red-700', label: 'გაყიდულია' },
    EXPIRED: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'ვადაგასული' },
  };

  const style = config[status as keyof typeof config] || config.PAUSED;

  return (
    <span className={`${style.bg} ${style.text} text-xs font-semibold px-2.5 py-1 rounded-full`}>
      {style.label}
    </span>
  );
}
