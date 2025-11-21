import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Copy, Check, Share2, Gift } from 'lucide-react';
import { getUserReferralCode } from '@/lib/gamification-api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { logger } from '@/lib/logger';

interface ReferralCardProps {
  userId: string;
  totalReferrals: number;
}

export function ReferralCard({ userId, totalReferrals }: ReferralCardProps) {
  const [referralCode, setReferralCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralCode();
  }, [userId]);

  const loadReferralCode = async () => {
    setLoading(true);
    const code = await getUserReferralCode(userId);
    if (code) {
      setReferralCode(code);
    } else {
      toast.error('Failed to load referral code');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    const referralUrl = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const referralUrl = `${window.location.origin}?ref=${referralCode}`;
    const text = `Join me on SmartPick and get 50 bonus points! Use my referral code: ${referralCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join SmartPick',
          text: text,
          url: referralUrl
        });
        toast.success('Shared successfully!');
      } catch (error) {
        // User cancelled share
        logger.log('Share cancelled');
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CC9A8]"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-purple-200 bg-gradient-to-br from-white to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-600">
          <Users className="w-5 h-5" />
          Invite Friends
        </CardTitle>
        <CardDescription>Share SmartPick and earn rewards together!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rewards Info */}
        <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border-2 border-purple-300">
          <div className="flex items-center gap-3 mb-3">
            <Gift className="w-8 h-8 text-purple-600" />
            <div>
              <h4 className="font-bold text-purple-900">Referral Rewards</h4>
              <p className="text-xs text-purple-700">Both you and your friend get bonuses!</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <div className="text-2xl font-black text-purple-600 mb-1">+50</div>
              <div className="text-xs text-gray-600">Points for you</div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <div className="text-2xl font-black text-pink-600 mb-1">+50</div>
              <div className="text-xs text-gray-600">Points for friend</div>
            </div>
          </div>
        </div>

        {/* Your Referral Code */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Your Referral Code</label>
          <div className="flex gap-2">
            <Input
              value={referralCode}
              readOnly
              className="font-mono text-lg font-bold text-center bg-gradient-to-r from-[#EFFFF8] to-[#C9F9E9] border-[#4CC9A8]"
            />
            <Button
              onClick={handleCopy}
              variant="outline"
              size="icon"
              className={`w-12 ${copied ? 'bg-green-50 border-green-500' : ''}`}
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Share this code with friends or use the link below
          </p>
        </div>

        {/* Share Button */}
        <Button
          onClick={handleShare}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share Referral Link
        </Button>

        {/* Stats */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Friends Referred</p>
              <p className="text-xs text-gray-500">Lifetime total</p>
            </div>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-4xl font-black text-purple-600"
          >
            {totalReferrals}
          </motion.div>
        </div>

        {/* How it Works */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-600">How it works:</p>
          <div className="space-y-2">
            {[
              { step: '1', text: 'Share your referral code with friends' },
              { step: '2', text: 'Friend signs up using your code' },
              { step: '3', text: 'Both get +50 SmartPoints instantly!' }
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 font-bold text-purple-600 text-xs">
                  {item.step}
                </div>
                <span className="text-gray-700">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

