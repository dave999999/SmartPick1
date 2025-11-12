import { useState } from 'react';
import { Reservation } from '@/lib/types';
import {
  validateQRCode,
  markAsPickedUp,
  partnerMarkNoShow,
} from '@/lib/api';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { logger } from '@/lib/logger';

export function useReservationActions(onSuccess: () => void) {
  const { t } = useI18n();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [lastQrResult, setLastQrResult] = useState<null | 'success' | 'error'>(null);

  const handleMarkAsPickedUp = async (reservation: Reservation, optimisticUpdate: (id: string) => void) => {
    if (processingIds.has(reservation.id)) return;

    try {
      setProcessingIds(prev => new Set(prev).add(reservation.id));

      // Optimistically remove from UI to prevent repeat clicks
      optimisticUpdate(reservation.id);

      // Only update reservation status in database
      await markAsPickedUp(reservation.id);

      toast.success(t('partner.dashboard.toast.pickupConfirmed'));
      onSuccess();
    } catch (error: any) {
      logger.error('Error marking as picked up:', error);
      const errorMsg = error?.message || error?.error?.message || 'Unknown error';
      toast.error(`Failed to mark as picked up: ${errorMsg}`);
      // Restore data on failure
      onSuccess();
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(reservation.id);
        return newSet;
      });
    }
  };

  const handleMarkAsNoShow = async (reservation: Reservation, optimisticUpdate: (id: string) => void) => {
    if (processingIds.has(reservation.id)) return;

    if (!confirm(t('confirm.markNoShow'))) return;

    try {
      setProcessingIds(prev => new Set(prev).add(reservation.id));
      // Optimistically remove to prevent multiple penalty applications
      optimisticUpdate(reservation.id);

      const result = await partnerMarkNoShow(reservation.id);

      if (result.success) {
        toast.success(`${t('toast.noShowMarked')} ${result.points_transferred} ${t('toast.pointsReceived')}`);
        onSuccess();
      } else {
        toast.error(t('toast.failedMarkNoShow'));
      }
    } catch (error) {
      logger.error('Error marking no-show:', error);
      toast.error(t('toast.failedMarkNoShow'));
    } finally {
      setProcessingIds(prev => {
        const s = new Set(prev);
        s.delete(reservation.id);
        return s;
      });
    }
  };

  const handleValidateQR = async (
    qrInput: string,
    onClose: () => void
  ): Promise<boolean> => {
    if (!qrInput.trim()) {
      toast.error(t('partner.dashboard.toast.qrEnter'));
      return false;
    }

    try {
      // Validate and automatically mark as picked up
      const result = await validateQRCode(qrInput, true);
      if (result.valid && result.reservation) {
        onClose();
        setLastQrResult('success');
        toast.success(t('partner.dashboard.toast.pickupConfirmed'));
        onSuccess();
        return true;
      } else {
        toast.error(result.error || t('partner.dashboard.toast.qrInvalid'));
        setLastQrResult('error');
        return false;
      }
    } catch (error) {
      toast.error(t('partner.dashboard.toast.qrValidateFailed'));
      setLastQrResult('error');
      return false;
    }
  };

  return {
    processingIds,
    lastQrResult,
    setLastQrResult,
    handleMarkAsPickedUp,
    handleMarkAsNoShow,
    handleValidateQR,
  };
}
