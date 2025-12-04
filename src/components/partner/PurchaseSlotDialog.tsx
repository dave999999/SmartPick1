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
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 mx-auto mb-4">
            <Wallet className="w-8 h-8 text-orange-600" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900 text-center mb-2">
            🚀 Need More Listing Slots?
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 text-center px-2">
            You've reached your listing limit. Purchase additional slots to create more offers and grow your business!
          </DialogDescription>
        </DialogHeader>

        {partnerPoints && (
          <div className="space-y-5 pt-2">
            {/* Current Status - Clean Card */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100/30 rounded-2xl p-5 border border-teal-200/60">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-teal-700 mb-1.5 font-medium">Current Balance</p>
                  <p className="text-3xl font-bold text-teal-600">{partnerPoints.balance} pts</p>
                </div>
                <div>
                  <p className="text-xs text-teal-700 mb-1.5 font-medium">Current Slots</p>
                  <p className="text-3xl font-bold text-teal-600">{partnerPoints.offer_slots}</p>
                </div>
              </div>
            </div>

            {/* Next Slot Cost - Prominent */}
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-gray-200">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">Next Slot Cost</p>
                <p className="text-xs text-gray-500">Price increases with each slot</p>
              </div>
              <div className="text-3xl font-bold text-gray-900">{slotCost} pts</div>
            </div>

            {/* Insufficient Balance Alert - Only show when needed */}
            {hasInsufficientBalance && (
              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-200">
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900 mb-1">Insufficient Balance</p>
                  <p className="text-xs text-orange-700">You need more points to purchase this slot</p>
                </div>
                <button
                  onClick={() => {
                    onOpenChange(false);
                    onBuyPoints();
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 rounded-xl transition-all"
                >
                  Buy Points
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-6 border-t border-gray-100 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-gray-300"
            >
              {t('partner.points.cancel')}
            </Button>
            <Button
              onClick={onPurchase}
              disabled={isPurchasing || !partnerPoints || hasInsufficientBalance}
              className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
            >
              {isPurchasing ? t('partner.points.purchasing') : t('partner.points.confirmPurchase')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
