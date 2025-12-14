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
  CheckCircle
} from 'lucide-react';
import { useOfferActions } from '@/hooks/useOfferActions';
import EnhancedActiveReservations from '@/components/partner/EnhancedActiveReservations';
import { useReservationActions } from '@/hooks/useReservationActions';
import { BuyPointsModal } from '@/components/wallet/BuyPointsModal';

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
    navigate(`/partner/offers/${offerId}/edit`);
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
    if (!partner || !partnerPoints) return;

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
        toast.error(result.message || 'სლოტის შეძენა ვერ მოხერხდა');
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error purchasing slot:', error);
      toast.error('სლოტის შეძენა ვერ მოხერხდა');
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-32">
      {/* STICKY TOP SUMMARY STRIP */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="px-4 py-3">
          {/* Layer 1: Primary - Actionable Wallet */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-gray-900">მართვის პანელი</h1>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowBuyPointsModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl px-4 py-2.5 shadow-md hover:shadow-lg transition-shadow"
            >
              <Wallet className="w-5 h-5" />
              <div className="text-left">
                <p className="text-xs opacity-90">ბალანსი</p>
                <p className="text-base font-bold">₾{partnerPoints?.balance || 0}</p>
              </div>
              <Plus className="w-4 h-4 opacity-75" />
            </motion.button>
          </div>

          {/* Layer 2: Secondary Stats - Compact & Muted */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">აქტიური შეთავაზებები:</span>
              <span className="font-bold text-emerald-600">{stats.activeOffers}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">სლოტები (ლიმიტი):</span>
              <span className="font-bold text-gray-900">{(partnerPoints?.offer_slots || 10) - offers.filter(o => o.status === 'ACTIVE').length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">დღეს:</span>
              <span className="font-bold text-gray-900">₾{revenueToday.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="px-4 pt-6 space-y-6">
        
        {/* PERFORMANCE CARD - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 shadow-lg"
        >
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <p className="text-emerald-100 text-xs font-semibold tracking-wide uppercase mb-3">
              დღეს
            </p>
            
            <div className="flex items-baseline gap-3">
              <p className="text-5xl font-bold text-white tracking-tight">
                {stats.itemsPickedUp}
              </p>
              <p className="text-emerald-100 text-base font-medium opacity-90">
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
        <div className="flex gap-2 mb-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveView('offers')}
            className={`flex-1 py-3 px-4 rounded-2xl font-semibold transition-all ${
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
            className={`flex-1 py-3 px-4 rounded-2xl font-semibold transition-all relative ${
              activeView === 'active'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            აქტიური
            {reservations.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {reservations.length}
              </span>
            )}
          </motion.button>
        </div>

        {/* OFFERS SECTION */}
        {activeView === 'offers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">თქვენი შეთავაზებები</h2>
              {offers.length > 0 && (
                <p className="text-sm text-gray-500">{offers.length} ჯამური</p>
              )}
            </div>

            {/* Offers List */}
            <div className="space-y-3">
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
                    className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm active:scale-[0.98] transition-transform"
                  >
                    <div className="p-4">
                      {/* Top Section: Image + Content */}
                      <div className="flex gap-4 mb-3">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0">
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
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
                              <h3 className="font-semibold text-gray-900 truncate">
                                {offer.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-lg font-bold text-emerald-600">
                                  ₾{offer.smart_price}
                                </p>
                                {offer.original_price > offer.smart_price && (
                                  <p className="text-sm text-gray-400 line-through">
                                    ₾{offer.original_price}
                                  </p>
                                )}
                              </div>
                              {/* Quick Stats */}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
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
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-[11px] font-medium text-emerald-700 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>რედაქტირება</span>
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleTogglePause(offer)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-[11px] font-medium text-gray-700 transition-colors"
                          >
                            {offer.status === 'ACTIVE' ? (
                              <>
                                <Pause className="w-3.5 h-3.5" />
                                <span>პაუზა</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span>განავლება</span>
                              </>
                            )}
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCloneOffer(offer)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-[11px] font-medium text-purple-700 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>კლონი</span>
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              if (window.confirm('დარწმუნებული ხართ, რომ გსურთ შეთავაზების წაშლა?')) {
                                offerActions.handleDeleteOffer(offer.id);
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-red-50 hover:bg-red-100 rounded-lg text-[11px] font-medium text-red-600 transition-colors"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>წაშლა</span>
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
        className="fixed bottom-6 left-4 right-4 z-50"
      >
        <div className="bg-white/90 backdrop-blur-2xl rounded-[28px] border border-gray-200/60 shadow-2xl p-3">
          <div className="flex gap-3">
            {/* Primary Action - New Offer */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/partner/offers/new')}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-[20px] py-4 px-6 font-semibold text-base shadow-lg flex items-center justify-center gap-2 transition-all active:shadow-md"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              ახალი შეთავაზება
            </motion.button>

            {/* Secondary Action - Scan QR */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/partner/scan')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[20px] py-4 px-6 font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <QrCode className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
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
