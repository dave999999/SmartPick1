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
    if (!confirm(t('partner.dashboard.confirm.deleteOffer'))) return;

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

  return {
    processingIds,
    handleToggleOffer,
    handleDeleteOffer,
    handleRefreshQuantity,
    handleDuplicateOffer,
    handlePauseOffer,
    handleResumeOffer,
    handleCloneOffer,
  };
}
