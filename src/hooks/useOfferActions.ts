import { useState } from 'react';
import { Offer, Partner } from '@/lib/types';
import {
  updateOffer,
  deleteOffer,
  duplicateOffer,
} from '@/lib/api';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { logger } from '@/lib/logger';

export function useOfferActions(
  partner: Partner | null,
  onSuccess: () => void
) {
  const { t } = useI18n();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleToggleOffer = async (offerId: string, currentStatus: string) => {
    if (processingIds.has(offerId)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(offerId));
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await updateOffer(offerId, { status: newStatus });
      toast.success(t('partner.dashboard.toast.toggleSuccess'));
      onSuccess();
    } catch (error) {
      toast.error(t('partner.dashboard.toast.toggleFailed'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(offerId);
        return newSet;
      });
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    try {
      await deleteOffer(offerId);
      toast.success(t('partner.dashboard.toast.offerDeleted'));
      onSuccess();
    } catch (error) {
      toast.error(t('partner.dashboard.toast.offerDeleteFailed'));
    }
  };

  const handleRefreshQuantity = async (offerId: string, offers: Offer[]) => {
    if (processingIds.has(offerId)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(offerId));
      const offer = offers.find(o => o.id === offerId);

      await updateOffer(offerId, {
        quantity_available: offer?.quantity_total || 0
      });
      onSuccess();
      toast.success(t('partner.dashboard.toast.quantityRefreshed'));
    } catch (error) {
      logger.error('Error refreshing quantity:', error);
      toast.error(t('partner.dashboard.toast.quantityRefreshFailed'));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(offerId);
        return next;
      });
    }
  };

  const handleDuplicateOffer = async (offerId: string) => {
    if (processingIds.has(offerId)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(offerId));

      if (!partner || partner.status !== 'APPROVED') {
        toast.error(t('partner.dashboard.pending.afterApproval'));
        return;
      }

      await duplicateOffer(offerId, partner.id);
      toast.success(t('partner.dashboard.toast.offerCreated'));
      onSuccess();
    } catch (error) {
      logger.error('Error duplicating offer:', error);
      toast.error(t('partner.dashboard.toast.offerCreateFailed'));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(offerId);
        return next;
      });
    }
  };

  const handlePauseOffer = async (offer: Offer) => {
    if (processingIds.has(offer.id)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(offer.id));
      await updateOffer(offer.id, { status: 'PAUSED' });
      toast.success(t('partner.dashboard.toast.toggleSuccess'));
      onSuccess();
    } catch (error) {
      toast.error(t('partner.dashboard.toast.toggleFailed'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(offer.id);
        return newSet;
      });
    }
  };

  const handleResumeOffer = async (offer: Offer) => {
    if (processingIds.has(offer.id)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(offer.id));
      await updateOffer(offer.id, { status: 'ACTIVE' });
      toast.success(t('partner.dashboard.toast.toggleSuccess'));
      onSuccess();
    } catch (error) {
      toast.error(t('partner.dashboard.toast.toggleFailed'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(offer.id);
        return newSet;
      });
    }
  };

  const handleCloneOffer = async (offer: Offer) => {
    if (processingIds.has(offer.id)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(offer.id));

      if (!partner || partner.status !== 'APPROVED') {
        toast.error(t('partner.dashboard.pending.afterApproval'));
        return;
      }

      await duplicateOffer(offer.id, partner.id);
      toast.success(t('partner.dashboard.toast.offerCreated'));
      onSuccess();
    } catch (error) {
      logger.error('Error duplicating offer:', error);
      toast.error(t('partner.dashboard.toast.offerCreateFailed'));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(offer.id);
        return next;
      });
    }
  };

  const handleReloadOffer = async (offer: Offer) => {
    if (processingIds.has(offer.id)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(offer.id));

      // Calculate original duration
      const originalStart = new Date(offer.pickup_start || offer.created_at);
      const originalEnd = new Date(offer.pickup_end || offer.expires_at);
      const originalDurationMs = originalEnd.getTime() - originalStart.getTime();

      // Preserve original duration (minimum 24h for safety)
      const durationToUse = Math.max(originalDurationMs, 24 * 60 * 60 * 1000);

      // Calculate new timestamps
      const now = new Date();
      const newPickupEnd = new Date(now.getTime() + durationToUse);
      const newExpiresAt = new Date(now.getTime() + durationToUse);

      // For non-24h businesses, adjust pickup_end to closing time on last day
      if (partner && !partner.open_24h && !partner.business_hours?.is_24_7 && partner.business_hours?.close) {
        const closingTime = partner.business_hours.close;
        const [hours, minutes] = closingTime.split(':').map(Number);
        newPickupEnd.setHours(hours, minutes, 0, 0);
      }

      // Reset offer with all timestamps updated
      await updateOffer(offer.id, {
        quantity_available: offer.quantity_total, // Reset to original quantity
        created_at: now.toISOString(),           // Reset creation time - shows as NEW
        pickup_start: now.toISOString(),         // Start pickup now
        pickup_end: newPickupEnd.toISOString(),  // Preserve original duration
        expires_at: newExpiresAt.toISOString(),  // Preserve original duration
        status: 'ACTIVE'                         // Reactivate the offer
      });

      toast.success(t('partner.dashboard.toast.offerReloaded'));
      onSuccess();
    } catch (error) {
      logger.error('Error reloading offer:', error);
      toast.error(t('partner.dashboard.toast.offerReloadFailed'));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(offer.id);
        return next;
      });
    }
  };

  return {
    processingIds,
    handleToggleOffer,
    handleDeleteOffer,
    handleRefreshQuantity,
    handleDuplicateOffer,
    handlePauseOffer,
    handleResumeOffer,
    handleCloneOffer,
    handleReloadOffer,
  };
}
