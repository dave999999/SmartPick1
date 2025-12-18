import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Partner, Offer } from '@/lib/types';
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
  Home,
  Image as ImageIcon,
  Settings
} from 'lucide-react';
import { useOfferActions } from '@/hooks/useOfferActions';
import EnhancedActiveReservations from '@/components/partner/EnhancedActiveReservations';
import { useReservationActions } from '@/hooks/useReservationActions';
import { BuyPointsModal } from '@/components/wallet/BuyPointsModal';
import { EditOfferDialog } from '@/components/partner/EditOfferDialog';
import { QRScannerDialog } from '@/components/partner/QRScannerDialog';
import CreateOfferWizard from '@/components/partner/CreateOfferWizard';
import { GalleryModal } from '@/components/partner/GalleryModal';

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

export default function PartnerDashboardV3() {
  const navigate = useNavigate();
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
  } = usePartnerDashboardData();
  
  // 🚀 REFACTORED: Extract modal state to custom hook
  const modals = usePartnerModals();
  
  // UI state
  const [activeOfferMenu, setActiveOfferMenu] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'offers' | 'active'>('offers');

  // Initialize action hooks
  const offerActions = useOfferActions(partner, loadPartnerData);
  const reservationActions = useReservationActions(loadPartnerData);

  // Calculate revenue today
  const revenueToday = stats?.totalRevenue || 0; // Simplified for demo

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
      const autoExpire6hValue = formData.get('auto_expire_6h');
      const autoExpire6h = autoExpire6hValue === 'true' || autoExpire6hValue === '1' || autoExpire6hValue === 'on';
      
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
      console.error('Error creating offer:', error);
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
          <div className="flex items-center justify-between gap-2 mb-2">
            {/* Home Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-md hover:shadow-lg transition-shadow flex items-center justify-center"
            >
              <Home className="w-5 h-5" />
            </motion.button>

            {/* Gallery Button - Product Photos */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => modals.openGallery()}
              className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center"
            >
              <ImageIcon className="w-5 h-5" />
            </motion.button>

            {/* Wallet Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => modals.openBuyPointsModal()}
              className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl shadow-md hover:shadow-lg transition-shadow flex items-center justify-center"
            >
              <Wallet className="w-5 h-5" />
            </motion.button>

            {/* Settings Button - Last */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                // TODO: Add settings modal
                toast.info('პარამეტრები');
              }}
              className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Layer 2: Stats - Items Sold & Earnings */}
          <div className="flex items-center justify-between">
            {/* Items Sold Today */}
            <div className="flex items-center gap-2 bg-blue-50/80 rounded-lg px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[9px] text-gray-500 leading-none">გაყიდული</p>
                <p className="text-sm font-bold text-gray-900 leading-tight">{stats?.itemsPickedUp || 0} ცალი</p>
              </div>
            </div>

            {/* Earnings Today */}
            <div className="flex items-center gap-2 bg-emerald-50/80 rounded-lg px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[9px] text-gray-500 leading-none">შემოსავალი</p>
                <p className="text-sm font-bold text-gray-900 leading-tight">₾{(stats?.totalRevenue || 0).toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="px-3 pt-3 space-y-3">
        
        {/* QUICK ACTION CARD - Available Slots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 shadow-lg"
        >
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium mb-1">
                ხელმისაწვდომი სლოტები
              </p>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-5xl font-bold text-white tracking-tight">
                  {(partnerPoints?.offer_slots || 10) - (offers?.filter(o => o.status === 'ACTIVE').length || 0)}
                </p>
                <p className="text-emerald-100 text-base font-medium opacity-90">
                  / {partnerPoints?.offer_slots || 10}
                </p>
              </div>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => modals.openCreateWizard()}
                className="bg-white text-emerald-600 rounded-xl px-4 py-2 text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                ახალი შეთავაზება
              </motion.button>
            </div>

            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Package className="w-10 h-10 text-white" />
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
            } ${(reservations?.length || 0) > 0 ? 'animate-pulse-subtle' : ''}`}
          >
            აქტიური რეზერვაციები
            {(reservations?.length || 0) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {reservations?.length || 0}
              </span>
            )}
          </motion.button>
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
              <AnimatePresence>
                {(offers?.length || 0) === 0 ? (
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
                  offers?.map((offer, index) => (
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
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="fixed bottom-2 left-0 right-0 z-50 flex justify-center"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => modals.openQRScanner()}
          className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full w-24 h-24 flex items-center justify-center shadow-2xl hover:shadow-blue-500/50 transition-all border-4 border-white"
        >
          <QrCode className="w-12 h-12" strokeWidth={2.5} />
        </motion.button>
      </motion.div>

      {/* DIALOGS */}
      {modals.showCreateWizard && partner && (
        <CreateOfferWizard
          open={modals.showCreateWizard}
          onClose={modals.closeCreateWizard}
          onSubmit={handleCreateOfferWizard}
          isSubmitting={modals.isSubmitting}
          is24HourBusiness={partner.hours_24_7 || false}
          businessType={partner.business_type || 'RESTAURANT'}
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
