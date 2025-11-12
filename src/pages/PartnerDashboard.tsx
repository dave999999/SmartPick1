import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Offer } from '@/lib/types';
import { signOut } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import { useI18n } from '@/lib/i18n';
import { logger } from '@/lib/logger';

// Custom hooks
import { usePartnerData } from '@/hooks/usePartnerData';
import { useOfferActions } from '@/hooks/useOfferActions';
import { useReservationActions } from '@/hooks/useReservationActions';

// Existing components (already extracted)
import EnhancedStatsCards from '@/components/partner/EnhancedStatsCards';
import QuickActions from '@/components/partner/QuickActions';
import EnhancedOffersTable from '@/components/partner/EnhancedOffersTable';
import EnhancedActiveReservations from '@/components/partner/EnhancedActiveReservations';
import PendingPartnerStatus from '@/components/partner/PendingPartnerStatus';
import PartnerAnalytics from '@/components/partner/PartnerAnalytics';
import EditPartnerProfile from '@/components/partner/EditPartnerProfile';
import QRScanner from '@/components/QRScanner';
import QRScanFeedback from '@/components/partner/QRScanFeedback';
import { TelegramConnect } from '@/components/TelegramConnect';
import { BuyPartnerPointsModal } from '@/components/BuyPartnerPointsModal';
import { Skeleton } from '@/components/ui/skeleton';

// TODO: Create these new components
// import OfferFormDialog from '@/components/partner/OfferFormDialog';
// import QRManagementDialog from '@/components/partner/QRManagementDialog';

export default function PartnerDashboard() {
  logger.log('🚨🚨🚨 PARTNER DASHBOARD LOADED (REFACTORED) 🚨🚨🚨');
  const { t } = useI18n();
  const navigate = useNavigate();

  // Load all partner data via custom hook
  const {
    partner,
    offers,
    reservations,
    allReservations,
    stats,
    analytics,
    partnerPoints,
    isLoading,
    loadPartnerData,
  } = usePartnerData();

  // Offer actions hook
  const {
    processingIds: offerProcessingIds,
    handleToggleOffer,
    handleDeleteOffer,
    handleRefreshQuantity,
    handleDuplicateOffer,
  } = useOfferActions(partner, loadPartnerData);

  // Reservation actions hook
  const {
    processingIds: reservationProcessingIds,
    lastQrResult,
    setLastQrResult,
    handleMarkAsPickedUp,
    handleMarkAsNoShow,
    handleValidateQR,
  } = useReservationActions(loadPartnerData);

  // Local UI state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [isBuyPointsModalOpen, setIsBuyPointsModalOpen] = useState(false);
  const [isPurchaseSlotDialogOpen, setIsPurchaseSlotDialogOpen] = useState(false);
  const [offerFilter, setOfferFilter] = useState<'all' | 'active' | 'expired' | 'sold_out' | 'scheduled'>('all');
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set());

  // Derive display status for an offer
  const getOfferDisplayStatus = (offer: Offer): string => {
    const now = Date.now();
    if (offer.expires_at) {
      const exp = new Date(offer.expires_at).getTime();
      if (!isNaN(exp) && exp <= now) return 'EXPIRED';
    }
    if (typeof offer.quantity_available === 'number' && offer.quantity_available <= 0) {
      return 'SOLD_OUT';
    }
    return offer.status;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleQRValidate = async () => {
    const success = await handleValidateQR(qrInput, () => {
      setQrInput('');
      setQrScannerOpen(false);
    });

    if (success) {
      // Reset after success
      setTimeout(() => setLastQrResult(null), 3000);
    }
  };

  const optimisticRemoveReservation = (id: string) => {
    // This would be passed to the reservation actions
    // Implementation handled in the hook
  };

  // Check if partner is pending
  const isPending = partner?.status?.toUpperCase() === 'PENDING';

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Show pending status if partner not approved
  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <PendingPartnerStatus partner={partner} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {partner?.business_name || t('partner.dashboard.title')}
            </h1>
            <p className="text-gray-600 mt-1">{t('partner.dashboard.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditProfileOpen(true)}
            >
              {t('partner.dashboard.editProfile')}
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('common.signOut')}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <EnhancedStatsCards
          stats={{
            ...stats,
            revenue: analytics.revenue
          }}
          partnerPoints={partnerPoints}
          onBuyPoints={() => setIsBuyPointsModalOpen(true)}
        />

        {/* Quick Actions */}
        <QuickActions
          onCreateOffer={() => {
            // TODO: Open create offer dialog
            console.log('Create offer clicked');
          }}
          onScanQR={() => setQrScannerOpen(true)}
          onViewAnalytics={() => {
            // Handled by tab switch
          }}
        />

        {/* Main Tabs */}
        <Tabs defaultValue="offers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="offers">{t('partner.dashboard.tabs.offers')}</TabsTrigger>
            <TabsTrigger value="reservations">{t('partner.dashboard.tabs.reservations')}</TabsTrigger>
            <TabsTrigger value="analytics">{t('partner.dashboard.tabs.analytics')}</TabsTrigger>
          </TabsList>

          {/* Offers Tab */}
          <TabsContent value="offers">
            <EnhancedOffersTable
              offers={offers}
              filter={offerFilter}
              onFilterChange={setOfferFilter}
              onToggleOffer={handleToggleOffer}
              onDeleteOffer={handleDeleteOffer}
              onEditOffer={(offer) => {
                // TODO: Open edit offer dialog
                console.log('Edit offer:', offer.id);
              }}
              onDuplicateOffer={handleDuplicateOffer}
              onRefreshQuantity={(offerId) => handleRefreshQuantity(offerId, offers)}
              processingIds={offerProcessingIds}
              selectedOffers={selectedOffers}
              onSelectOffer={(id) => {
                setSelectedOffers(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) {
                    next.delete(id);
                  } else {
                    next.add(id);
                  }
                  return next;
                });
              }}
            />
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations">
            <EnhancedActiveReservations
              reservations={reservations}
              onMarkPickedUp={(reservation) =>
                handleMarkAsPickedUp(reservation, optimisticRemoveReservation)
              }
              onMarkNoShow={(reservation) =>
                handleMarkAsNoShow(reservation, optimisticRemoveReservation)
              }
              processingIds={reservationProcessingIds}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <PartnerAnalytics
              partner={partner}
              allReservations={allReservations}
              offers={offers}
            />
          </TabsContent>
        </Tabs>

        {/* QR Scanner Dialog */}
        <QRScanner
          open={qrScannerOpen}
          onOpenChange={setQrScannerOpen}
          onScan={async (code) => {
            setQrInput(code);
            await handleQRValidate();
          }}
          manualInput={qrInput}
          onManualInputChange={setQrInput}
          onManualSubmit={handleQRValidate}
        />

        {/* QR Feedback */}
        {lastQrResult && (
          <QRScanFeedback
            result={lastQrResult}
            onDismiss={() => setLastQrResult(null)}
          />
        )}

        {/* Edit Profile Dialog */}
        {partner && (
          <EditPartnerProfile
            open={isEditProfileOpen}
            onOpenChange={setIsEditProfileOpen}
            partner={partner}
            onSuccess={loadPartnerData}
          />
        )}

        {/* Buy Points Modal */}
        <BuyPartnerPointsModal
          open={isBuyPointsModalOpen}
          onOpenChange={setIsBuyPointsModalOpen}
          currentPoints={partnerPoints?.balance || 0}
          onSuccess={loadPartnerData}
        />

        {/* Telegram Connect */}
        <TelegramConnect userId={partner?.user_id || ''} />

        {/* TODO: Add these dialogs */}
        {/* <OfferFormDialog /> */}
        {/* <PurchaseSlotDialog /> */}
      </div>
    </div>
  );
}
