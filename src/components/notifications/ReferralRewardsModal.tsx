/**
 * Referral Rewards Modal
 * Shows congratulations when user signs up via referral code
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Gift, Sparkles, TrendingUp } from 'lucide-react';

interface ReferralRewardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode?: string;
  pointsEarned?: number;
}

export function ReferralRewardsModal({
  open,
  onOpenChange,
  referralCode,
  pointsEarned = 100
}: ReferralRewardsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-gradient-to-br from-[#FF8A00] via-[#FF6B00] to-[#FF4500]">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{
                x: Math.random() * 400,
                y: Math.random() * 600,
                scale: 0,
                opacity: 0
              }}
              animate={{
                y: [-20, -40, -20],
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            >
              <Sparkles size={16} className="text-white" />
            </motion.div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 p-8 text-center text-white">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="mb-6"
          >
            <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl">
              <Gift className="text-[#FF8A00]" size={40} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-3xl font-bold mb-2">Welcome Bonus!</h2>
            <p className="text-white/90 text-lg mb-6">
              You've earned rewards for joining via referral
            </p>

            {/* Points Display */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6"
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <TrendingUp size={32} className="text-white" />
                <div className="text-6xl font-bold">{pointsEarned}</div>
              </div>
              <p className="text-white/90 text-lg font-medium">SmartPoints Added!</p>
            </motion.div>

            {/* Referral Code */}
            {referralCode && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
                <p className="text-white/80 text-sm mb-1">Referred by</p>
                <p className="text-white font-mono text-lg font-bold">{referralCode}</p>
              </div>
            )}

            {/* Benefits List */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6 text-left">
              <p className="text-white font-semibold mb-3">Your Benefits:</p>
              <ul className="space-y-2 text-white/90 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  {pointsEarned} SmartPoints bonus
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  Use points for discounts
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  Refer friends to earn more
                </li>
              </ul>
            </div>

            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-white text-[#FF8A00] hover:bg-white/90 font-semibold py-6 text-lg rounded-xl shadow-xl"
            >
              Start Exploring Deals!
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
