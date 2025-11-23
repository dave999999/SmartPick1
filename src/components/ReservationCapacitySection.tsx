import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Sparkles, Unlock, ShoppingCart } from 'lucide-react';
import { getUserSlotInfo, getUpgradeableSlotsPreview, type UserSlotInfo } from '@/lib/api';
import { MAX_RESERVATION_SLOTS, DEFAULT_RESERVATION_SLOTS } from '@/lib/constants';
import { SlotUnlockModal } from './SlotUnlockModal';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ReservationCapacitySectionProps {
  userId: string;
  currentBalance: number;
  onBalanceChange: () => void;
}

export function ReservationCapacitySection({ 
  userId, 
  currentBalance, 
  onBalanceChange 
}: ReservationCapacitySectionProps) {
  const [slotInfo, setSlotInfo] = useState<UserSlotInfo | null>(null);
  const [actualBalance, setActualBalance] = useState(currentBalance);
  const [loading, setLoading] = useState(true);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  useEffect(() => {
    loadSlotInfo();
  }, [userId]);

  useEffect(() => {
    setActualBalance(currentBalance);
  }, [currentBalance]);

  const loadSlotInfo = async () => {
    setLoading(true);
    try {
      const info = await getUserSlotInfo(userId);
      setSlotInfo(info);
      
      // Also fetch actual balance from users table
      const { data, error } = await supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setActualBalance(data.balance);
      }
      
      logger.log('Slot info loaded:', info, 'Balance:', data?.balance);
    } catch (error) {
      logger.error('Error loading slot info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockSuccess = () => {
    loadSlotInfo();
    onBalanceChange();
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            Reservation Capacity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!slotInfo) return null;

  const progressPercent = ((slotInfo.current_max - DEFAULT_RESERVATION_SLOTS) / (MAX_RESERVATION_SLOTS - DEFAULT_RESERVATION_SLOTS)) * 100;
  const upgradePreview = getUpgradeableSlotsPreview(slotInfo.current_max, 3);
  const isMaxed = slotInfo.current_max >= MAX_RESERVATION_SLOTS;

  return (
    <>
      <Card className="bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border-white/10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            Reservation Capacity
          </CardTitle>
          <CardDescription className="text-gray-400">
            Upgrade your max items per reservation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Current Max:</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#00cc66]">{slotInfo.current_max}</span>
                <span className="text-sm text-gray-400">items</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{slotInfo.current_max}/{MAX_RESERVATION_SLOTS} slots unlocked</span>
                <span>{progressPercent.toFixed(0)}%</span>
              </div>
              <Progress 
                value={progressPercent} 
                className="h-2 bg-black/60"
              />
            </div>

            {isMaxed && (
              <div className="mt-3 flex items-center gap-2 text-[#00cc66] text-sm">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold">Maximum Capacity Unlocked!</span>
              </div>
            )}
          </div>

          {/* Next Upgrade */}
          {!isMaxed && slotInfo.next_slot_cost && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Next Unlock:</span>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  {slotInfo.current_max + 1}th slot
                </Badge>
              </div>

              <div className="flex items-center justify-between bg-black/20 border border-white/10 rounded-lg p-3">
                <span className="text-sm text-gray-400">Cost:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-orange-500">{slotInfo.next_slot_cost}</span>
                  <span className="text-xs text-gray-400">points</span>
                </div>
              </div>

              <Button
                onClick={() => {
                  if (actualBalance < slotInfo.next_slot_cost) {
                    const needed = slotInfo.next_slot_cost - actualBalance;
                    toast.error(`Need ${needed} more points to unlock`, {
                      description: 'Buy more points or earn them through activities',
                      duration: 4000,
                    });
                  } else {
                    setShowUnlockModal(true);
                  }
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 hover:scale-[1.02] transition-transform"
              >
                <Unlock className="w-4 h-4 mr-2" />
                {actualBalance < slotInfo.next_slot_cost 
                  ? `Need ${(slotInfo.next_slot_cost - actualBalance).toLocaleString()} more points`
                  : `Unlock ${slotInfo.current_max + 1}th Slot`}
              </Button>
            </div>
          )}

          {/* Future Upgrades Preview */}
          {upgradePreview.length > 1 && !isMaxed && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Future Upgrades:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {upgradePreview.slice(1).map(upgrade => (
                  <div
                    key={upgrade.slot}
                    className="flex items-center justify-between bg-black/20 border border-white/10 rounded-lg px-3 py-2"
                  >
                    <span className="text-xs text-gray-400">{upgrade.slot}th slot:</span>
                    <span className="text-sm font-bold text-white">{upgrade.cost} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          {slotInfo.total_spent > 0 && (
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Total Invested:</span>
                <span className="font-bold text-white">{slotInfo.total_spent.toLocaleString()} points</span>
              </div>
            </div>
          )}

          {/* Maxed Out Achievement Message */}
          {isMaxed && (
            <div className="bg-gradient-to-r from-orange-500/20 to-[#00cc66]/20 border border-orange-500/30 rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">💎</div>
              <p className="text-sm font-bold text-white mb-1">VIP Power User!</p>
              <p className="text-xs text-gray-400">
                You've unlocked all {MAX_RESERVATION_SLOTS} reservation slots
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlock Modal */}
      <SlotUnlockModal
        open={showUnlockModal}
        onOpenChange={setShowUnlockModal}
        userId={userId}
        currentMax={slotInfo.current_max}
        currentBalance={actualBalance}
        onSuccess={handleUnlockSuccess}
      />
    </>
  );
}
