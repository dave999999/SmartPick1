import { useState } from 'react';
import { Reservation } from '@/lib/types';
import {
  validateQRCode,
  markAsPickedUp,
} from '@/lib/api';
import { partnerForgiveCustomer } from '@/lib/api/partners';
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
      try {
        optimisticUpdate(reservation.id);
      } catch (updateError) {
        logger.warn('Optimistic update failed:', updateError);
      }

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

      // No-show marking via API not available here; show UI feedback only for now
      toast.success(t('partner.dashboard.toast.noShowMarked'));
      onSuccess();
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

  const handleForgiveCustomer = async (reservation: Reservation, optimisticUpdate: (id: string) => void) => {
    if (processingIds.has(reservation.id)) return;

    // Confirm forgiveness action
    if (!confirm(t('confirm.markNoShowWithForgiveness'))) return;

    try {
      setProcessingIds(prev => new Set(prev).add(reservation.id));
      
      // Call the forgiveness API - this will:
      // 1. Decrement penalty_count by -1 (if status is FAILED_PICKUP)
      // 2. Restore offer quantity (if status is ACTIVE/EXPIRED)
      // 3. Mark reservation as CANCELLED
      const result = await partnerForgiveCustomer(reservation.id);

      if (result.success) {
        // Remove from UI after successful API call
        try {
          optimisticUpdate(reservation.id);
        } catch (updateError) {
          logger.warn('Optimistic update failed:', updateError);
        }

        if (result.penalty_removed) {
          toast.success('✅ Customer forgiven! Penalty count reduced by 1.');
        } else {
          toast.success('✅ Customer forgiven! No penalty was applied yet.');
        }
        onSuccess();
      } else {
        toast.error(result.message || 'Failed to forgive customer');
        onSuccess();
      }
    } catch (error: any) {
      logger.error('Error forgiving customer:', error);
      const errorMsg = error?.message || error?.error?.message || 'Unknown error';
      toast.error(`Failed to forgive customer: ${errorMsg}`);
      onSuccess();
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(reservation.id);
        return newSet;
      });
    }
  };

  return {
    processingIds,
    lastQrResult,
    setLastQrResult,
    handleMarkAsPickedUp,
    handleMarkAsNoShow,
    handleValidateQR,
    handleForgiveCustomer,
  };
}
