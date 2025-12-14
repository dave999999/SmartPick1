import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Partner, Offer, Reservation, PartnerStats, PartnerPoints } from '@/lib/types';
import { getCurrentUser } from '@/lib/api/auth';
import { getPartnerByUserId, getPartnerById } from '@/lib/api/partners';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
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
  Copy,
  MoreVertical,
  Wallet,
  AlertCircle,
  CheckCircle,
  Home
} from 'lucide-react';
import { useOfferActions } from '@/hooks/useOfferActions';
import EnhancedActiveReservations from '@/components/partner/EnhancedActiveReservations';
import { useReservationActions } from '@/hooks/useReservationActions';
import { BuyPointsModal } from '@/components/wallet/BuyPointsModal';
import { EditOfferDialog } from '@/components/partner/EditOfferDialog';
import { QRScannerDialog } from '@/components/partner/QRScannerDialog';
import CreateOfferWizard from '@/components/partner/CreateOfferWizard';

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

export default function PartnerDashboardV3() {
  const navigate = useNavigate();
  const { t } = useI18n();
  
  const [partner, setPartner] = useState<Partner | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<PartnerStats>({
    activeOffers: 0,
    totalOffers: 0,
    reservationsToday: 0,
    itemsPickedUp: 0,
    totalRevenue: 0
  });
  const [partnerPoints, setPartnerPoints] = useState<PartnerPoints | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOfferMenu, setActiveOfferMenu] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'offers' | 'active'>('offers');
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load partner data
  const loadPartnerData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { user } = await getCurrentUser();
      if (!user) {
        navigate('/');
        return;
      }

      const partnerData = await getPartnerByUserId(user.id);
      if (!partnerData) {
        toast.error('Partner profile not found');
        navigate('/partner/apply');
        return;
      }

      setPartner(partnerData);

      // Load dashboard data
      const { getPartnerDashboardData } = await import('@/lib/api/partners');
      const dashboardData = await getPartnerDashboardData(user.id);

      setOffers(dashboardData.offers);
      setReservations(dashboardData.activeReservations);
      setStats(dashboardData.stats);
      setPartnerPoints(dashboardData.points);

    } catch (error) {
      console.error('Error loading partner data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadPartnerData();
  }, [loadPartnerData]);

  // Initialize action hooks
  const offerActions = useOfferActions(partner, loadPartnerData);
  const reservationActions = useReservationActions(loadPartnerData);

  // Calculate revenue today
  const revenueToday = stats.totalRevenue; // Simplified for demo

  // Handle offer actions
  const handleEditOffer = (offerId: string) => {
    setActiveOfferMenu(null);
    const offer = offers.find(o => o.id === offerId);
    if (offer) {
      setEditingOffer(offer);
    }
  };

  const handleCreateOfferWizard = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      
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
      const autoExpire6hValue = formData.get('auto_expire_6h');
      const autoExpire6h = autoExpire6hValue === 'true' || autoExpire6hValue === '1' || autoExpire6hValue === 'on';
      
      // Get images from FormData
      const processedImages = formData
        .getAll('images')
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value): value is string => Boolean(value));

      if (processedImages.length === 0) {
        toast.error('გთხოვთ აირჩიოთ სურათი');
        setIsSubmitting(false);
        return;
      }

      // Calculate pickup times
      const { calculatePickupEndTime } = await import('@/lib/utils/businessHours');
      const now = new Date();
      const pickupStart = now;
      const pickupEnd = calculatePickupEndTime(partner, autoExpire6h);

      // Verify partner authentication
      const { supabase } = await import('@/lib/supabase');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (partner.user_id !== currentUser?.id) {
        toast.error('Authentication error: Please log out and log back in');
        setIsSubmitting(false);
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
      setShowCreateWizard(false);
      await loadPartnerData();
    } catch (error: any) {
      console.error('Error creating offer:', error);
      toast.error(error.message || 'შეთავაზების შექმნა ვერ მოხერხდა');
      throw error; // Re-throw so wizard knows not to close
    } finally {
      setIsSubmitting(false);
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

  const handleCloneOffer = async (offer: Offer) => {
    setActiveOfferMenu(null);
    await offerActions.handleCloneOffer(offer);
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
      console.error('Error purchasing slot:', error);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-28">
      {/* STICKY TOP SUMMARY STRIP */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="px-3 py-2">
          {/* Layer 1: Primary - Actionable Buttons */}
          <div className="flex items-center justify-between mb-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl px-3 py-1.5 shadow-md hover:shadow-lg transition-shadow"
            >
              <Home className="w-4 h-4" />
              <div className="text-left">
                <p className="text-[10px] opacity-90">მთავარი</p>
                <p className="text-sm font-bold">გვერდი</p>
              </div>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowBuyPointsModal(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl px-3 py-1.5 shadow-md hover:shadow-lg transition-shadow"
            >
              <Wallet className="w-4 h-4" />
              <div className="text-left">
                <p className="text-[10px] opacity-90">ბალანსი</p>
                <p className="text-sm font-bold">₾{partnerPoints?.balance || 0}</p>
              </div>
              <Plus className="w-3 h-3 opacity-75" />
            </motion.button>
          </div>

          {/* Layer 2: Secondary Stats - Compact & Muted */}
          <div className="flex items-center gap-2.5 text-[11px] text-gray-600">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">აქტიური:</span>
              <span className="font-bold text-emerald-600">{stats.activeOffers}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">სლოტები:</span>
              <span className="font-bold text-gray-900">{(partnerPoints?.offer_slots || 10) - offers.filter(o => o.status === 'ACTIVE').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">დღეს:</span>
              <span className="font-bold text-gray-900">₾{revenueToday.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="px-3 pt-3 space-y-3">
        
        {/* PERFORMANCE CARD - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 shadow-lg"
        >
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <p className="text-emerald-100 text-[10px] font-semibold tracking-wide uppercase mb-2">
              დღეს
            </p>
            
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-white tracking-tight">
                {stats.itemsPickedUp}
              </p>
              <p className="text-emerald-100 text-sm font-medium opacity-90">
                შეკვეთა
              </p>
            </div>

            {/* Single stat - no repetition */}
            <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-2.5 border border-white/20 inline-block">
              <p className="text-emerald-100 text-xs font-medium">აქტიური შეთავაზებები: <span className="text-white font-bold">{stats.activeOffers}</span></p>
            </div>
          </div>
        </motion.div>

        {/* VIEW TABS */}
        <div className="flex gap-1.5 bg-gray-50 p-1 rounded-2xl">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveView('offers')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeView === 'offers'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            თქვენი შეთავაზებები
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveView('active')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all relative ${
              activeView === 'active'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200'
            } ${reservations.length > 0 ? 'animate-pulse-subtle' : ''}`}
          >
            აქტიური რეზერვაციები
            {reservations.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {reservations.length}
              </span>
            )}
          </motion.button>
        </div>

        {/* OFFERS SECTION */}
        {activeView === 'offers' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-900">თქვენი შეთავაზებები</h2>
              {offers.length > 0 && (
                <p className="text-xs text-gray-500">{offers.length} ჯამური</p>
              )}
            </div>

            {/* Offers List */}
            <div className="space-y-2">
              <AnimatePresence>
                {offers.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 bg-white rounded-3xl border border-gray-200"
                  >
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">ჯერ შეთავაზებები არ გაქვთ</p>
                    <p className="text-sm text-gray-500 mt-1">დაამატეთ პირველი შეთავაზება და დაიწყეთ გაყიდვა</p>
                  </motion.div>
                ) : (
                  offers.map((offer, index) => (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm active:scale-[0.98] transition-transform"
                  >
                    <div className="p-3">
                      {/* Top Section: Image + Content */}
                      <div className="flex gap-3 mb-2">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0">
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
                        <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleEditOffer(offer.id)}
                            className="flex-1 flex items-center justify-center py-2 px-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-colors"
                            aria-label="რედაქტირება"
                          >
                            <Edit2 className="w-4 h-4" />
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleTogglePause(offer)}
                            className="flex-1 flex items-center justify-center py-2 px-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
                            aria-label={offer.status === 'ACTIVE' ? 'პაუზა' : 'განავლება'}
                          >
                            {offer.status === 'ACTIVE' ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCloneOffer(offer)}
                            className="flex-1 flex items-center justify-center py-2 px-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 transition-colors"
                            aria-label="კლონი"
                          >
                            <Copy className="w-4 h-4" />
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              if (window.confirm('დარწმუნებული ხართ, რომ გსურთ შეთავაზების წაშლა?')) {
                                offerActions.handleDeleteOffer(offer.id);
                              }
                            }}
                            className="flex-1 flex items-center justify-center py-2 px-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                            aria-label="წაშლა"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
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
      {showBuyPointsModal && partner && (
        <BuyPointsModal
          isOpen={showBuyPointsModal}
          onClose={() => setShowBuyPointsModal(false)}
          userId={partner.user_id}
          currentBalance={partnerPoints?.balance || 0}
          mode="partner"
          partnerPoints={partnerPoints}
          onPurchaseSlot={handlePurchaseSlot}
        />
      )}

      {/* FLOATING ACTION BAR */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="fixed bottom-4 left-3 right-3 z-50"
      >
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-gray-200/60 shadow-2xl p-2">
          <div className="flex gap-2">
            {/* Primary Action - New Offer */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateWizard(true)}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl py-3 px-4 font-semibold text-sm shadow-lg hover:shadow-emerald-500/30 flex items-center justify-center gap-1.5 transition-all active:shadow-md animate-pulse-glow"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              ახალი შეთავაზება
            </motion.button>

            {/* Secondary Action - Scan QR */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowQRScanner(true)}
              className="w-14 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-2xl py-3 font-semibold flex items-center justify-center shadow-lg hover:shadow-gray-300/40 transition-all active:shadow-md"
            >
              <QrCode className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* DIALOGS */}
      {showCreateWizard && partner && (
        <CreateOfferWizard
          open={showCreateWizard}
          onClose={() => setShowCreateWizard(false)}
          onSubmit={handleCreateOfferWizard}
          isSubmitting={isSubmitting}
          is24HourBusiness={partner.hours_24_7 || false}
          businessType={partner.business_type || 'RESTAURANT'}
        />
      )}

      {editingOffer && partner && (
        <EditOfferDialog
          open={!!editingOffer}
          onOpenChange={(open) => {
            if (!open) setEditingOffer(null);
          }}
          offer={editingOffer}
          partner={partner}
          autoExpire6h={partner.hours_24_7 || false}
          onSuccess={() => {
            setEditingOffer(null);
            loadPartnerData();
          }}
        />
      )}

      {showQRScanner && (
        <QRScannerDialog
          open={showQRScanner}
          onOpenChange={(open) => {
            setShowQRScanner(open);
            if (!open) loadPartnerData();
          }}
          partnerId={partner?.id || ''}
        />
      )}
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
