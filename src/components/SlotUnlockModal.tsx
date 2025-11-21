import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Unlock, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { purchaseReservationSlot, getUpgradeableSlotsPreview } from '@/lib/api';
import { getSlotUnlockCost } from '@/lib/constants';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface SlotUnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentMax: number;
  currentBalance: number;
  onSuccess: () => void;
}

export function SlotUnlockModal({
  open,
  onOpenChange,
  userId,
  currentMax,
  currentBalance,
  onSuccess,
}: SlotUnlockModalProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  const nextSlot = currentMax + 1;
  const cost = getSlotUnlockCost(nextSlot);
  const canAfford = currentBalance >= cost;
  const isMaxedOut = currentMax >= 10;
  
  // Get preview of next 3 upgradeable slots
  const upgradePreview = getUpgradeableSlotsPreview(currentMax, 3);

  const handlePurchase = async () => {
    if (!canAfford || isPurchasing || isMaxedOut) return;

    setIsPurchasing(true);
    try {
      const result = await purchaseReservationSlot(userId);
      
      toast.success(`🎉 Unlocked! You can now reserve up to ${result.new_max} items`, {
        description: `${cost} points spent. New balance: ${result.new_balance}`,
        duration: 5000,
      });
      
      logger.log('Slot unlocked successfully:', result);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      logger.error('Error purchasing slot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to unlock slot';
      toast.error(errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isMaxedOut) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-orange-500" />
              Maximum Capacity Reached!
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              You've unlocked all available reservation slots
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 text-center">
            <div className="text-6xl mb-4">💎</div>
            <p className="text-lg font-bold text-[#00cc66] mb-2">
              You can reserve up to {currentMax} items
            </p>
            <p className="text-sm text-gray-400">
              You're at maximum capacity - the ultimate power user!
            </p>
          </div>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          >
            Awesome!
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Unlock className="w-5 h-5 text-orange-500" />
            Unlock Slot {nextSlot}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Increase your max reservation from {currentMax} to {nextSlot} items
          </DialogDescription>
        </DialogHeader>

        {/* Cost Display */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Cost:</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-orange-500">{cost}</span>
              <span className="text-sm text-gray-400">points</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Your Balance:</span>
            <span className={`text-lg font-bold ${canAfford ? 'text-[#00cc66]' : 'text-orange-500'}`}>
              {currentBalance.toLocaleString()}
            </span>
          </div>

          {/* Insufficient points warning */}
          {!canAfford && (
            <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-orange-400">
                <p className="font-semibold mb-1">Insufficient Points</p>
                <p>You need {(cost - currentBalance).toLocaleString()} more points to unlock this slot.</p>
              </div>
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">Benefits:</p>
          <ul className="space-y-1.5 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <span className="text-[#00cc66]">✓</span>
              Reserve up to {nextSlot} items per offer
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#00cc66]">✓</span>
              Permanent unlock
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#00cc66]">✓</span>
              Progress toward achievements
            </li>
            {nextSlot === 5 && (
              <li className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-orange-500" />
                <span className="text-orange-400">Unlock "Bulk Buyer" achievement</span>
              </li>
            )}
            {nextSlot === 10 && (
              <li className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-orange-500" />
                <span className="text-orange-400">Unlock "Maximum Capacity" achievement</span>
              </li>
            )}
          </ul>
        </div>

        {/* Future Upgrades Preview */}
        {upgradePreview.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Future Upgrades:
            </p>
            <div className="flex flex-wrap gap-2">
              {upgradePreview.slice(1).map(upgrade => (
                <Badge
                  key={upgrade.slot}
                  variant="outline"
                  className="bg-black/20 border-white/10 text-gray-400 text-xs"
                >
                  {upgrade.slot}th slot: {upgrade.cost} pts
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPurchasing}
            className="flex-1 border-white/10 text-white hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={!canAfford || isPurchasing}
            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPurchasing ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Unlocking...
              </span>
            ) : (
              `Unlock for ${cost} pts →`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
