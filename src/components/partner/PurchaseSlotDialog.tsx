/**
 * Purchase Slot Dialog Component
 * Extracted from PartnerDashboard - handles purchasing additional offer slots
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { PartnerPoints } from '@/lib/api';

interface PurchaseSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerPoints: PartnerPoints | null;
  isPurchasing: boolean;
  onPurchase: () => void;
  onBuyPoints: () => void;
}

export function PurchaseSlotDialog({ 
  open, 
  onOpenChange, 
  partnerPoints, 
  isPurchasing, 
  onPurchase,
  onBuyPoints 
}: PurchaseSlotDialogProps) {
  const { t } = useI18n();

  const calculateSlotCost = (slots: number): number => {
    // Price calculation: (slots - 9) * 100
    return (slots - 9) * 100;
  };

  const slotCost = partnerPoints ? calculateSlotCost(partnerPoints.offer_slots) : 0;
  const hasInsufficientBalance = partnerPoints ? partnerPoints.balance < slotCost : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md rounded-3xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto border-0"
        style={{
          background: 'rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
        }}
      >
        <DialogHeader className="pb-3 sm:pb-4">
          <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 mx-auto mb-2 sm:mb-4">
            <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
          </div>
          <DialogTitle className="text-lg sm:text-xl font-bold text-gray-950 text-center mb-1 sm:mb-2 drop-shadow-sm">
            🚀 {t('partner.points.dialogTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-gray-800 text-center px-1 sm:px-2 font-medium drop-shadow-sm">
            {t('partner.points.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        {partnerPoints && (
          <div className="space-y-3 sm:space-y-5 pt-2">
            {/* Current Status - Clean Card */}
            <div 
              className="rounded-xl sm:rounded-2xl p-3 sm:p-5"
              style={{
                background: 'rgba(20, 184, 166, 0.12)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(20, 184, 166, 0.2)',
                boxShadow: '0 4px 12px rgba(20, 184, 166, 0.1)',
              }}
            >
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div>
                  <p className="text-[10px] sm:text-xs text-teal-900 mb-1 sm:mb-1.5 font-semibold drop-shadow-sm">{t('partner.points.currentBalance')}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-teal-700 drop-shadow">{partnerPoints.balance} <span className="text-sm">{t('partner.points.points')}</span></p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-teal-900 mb-1 sm:mb-1.5 font-semibold drop-shadow-sm">{t('partner.points.currentSlots')}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-teal-700 drop-shadow">{partnerPoints.offer_slots}</p>
                </div>
              </div>
            </div>

            {/* Next Slot Cost - Prominent */}
            <div 
              className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-950 mb-0.5">{t('partner.points.nextSlotCost')}</p>
                <p className="text-[10px] sm:text-xs text-gray-700 font-medium">{t('partner.points.priceIncreases')}</p>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-950">{slotCost} <span className="text-sm font-semibold">{t('partner.points.points')}</span></div>
            </div>

            {/* Insufficient Balance Alert - Only show when needed */}
            {hasInsufficientBalance && (
              <div 
                className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl"
                style={{
                  background: 'rgba(255, 138, 0, 0.12)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 138, 0, 0.25)',
                  boxShadow: '0 4px 12px rgba(255, 138, 0, 0.1)',
                }}
              >
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-bold text-orange-950 mb-0.5 sm:mb-1 drop-shadow-sm">{t('partner.points.insufficientBalanceTitle')}</p>
                  <p className="text-[10px] sm:text-xs text-orange-800 font-semibold drop-shadow-sm">{t('partner.points.insufficientBalanceDesc')}</p>
                </div>
                <button
                  onClick={() => {
                    onBuyPoints();
                    onOpenChange(false);
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 rounded-lg sm:rounded-xl transition-all whitespace-nowrap"
                >
                  {t('partner.points.buyPointsButton')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 sm:pt-6 border-t border-gray-100 mt-4 sm:mt-6 space-y-3">
          {/* Buy Points Button - Always visible */}
          <button
            onClick={() => {
              onOpenChange(false);
              setTimeout(() => onBuyPoints(), 100);
            }}
            className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl sm:rounded-2xl transition-all shadow-lg hover:shadow-xl"
          >
            💎 {t('partner.points.buyPartnerPoints')}
          </button>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-lg sm:rounded-xl border-gray-300 text-sm h-9 sm:h-10"
            >
              {t('partner.points.cancel')}
            </Button>
            <Button
              onClick={onPurchase}
              disabled={isPurchasing || !partnerPoints || hasInsufficientBalance}
              className="rounded-lg sm:rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-sm h-9 sm:h-10"
            >
              {isPurchasing ? t('partner.points.purchasing') : t('partner.points.confirmPurchase')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
