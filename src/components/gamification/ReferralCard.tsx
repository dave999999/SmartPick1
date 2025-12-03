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
    <div className="min-h-screen bg-gradient-to-b from-[#F8F9FB] to-white pb-24">
      {/* Apple-Style Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] flex items-center justify-center shadow-sm">
            <Users size={20} strokeWidth={2.5} className="text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-[#1A1A1A] leading-tight">
              Refer Friends
            </h1>
            <p className="text-[13px] text-[#6F6F6F] leading-tight">
              Share SmartPick and earn together
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* Hero Reward Card - Frosted Glass */}
        <Card className="bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-[18px] shadow-[0_4px_16px_rgba(0,122,255,0.2)] border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Gift size={24} strokeWidth={2} className="text-white" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-white leading-tight">
                  Referral Rewards
                </h3>
                <p className="text-[13px] text-white/80 leading-tight">
                  Win-win for both of you
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-[14px] p-4 text-center">
                <div className="text-[32px] font-bold text-white leading-none mb-1">+50</div>
                <div className="text-[13px] text-white/80 font-medium">Points for you</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-[14px] p-4 text-center">
                <div className="text-[32px] font-bold text-white leading-none mb-1">+50</div>
                <div className="text-[13px] text-white/80 font-medium">For your friend</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Code Card */}
        <Card className="bg-gradient-to-br from-[#34C759]/10 to-[#30D158]/10 rounded-[18px] border border-[#34C759]/20 shadow-none">
          <CardContent className="p-5">
            <label className="text-[13px] font-medium text-[#6F6F6F] mb-3 block">
              Your Referral Code
            </label>
            <div className="flex gap-3">
              <Input
                value={referralCode}
                readOnly
                className="font-mono text-[20px] font-bold text-center bg-white border-[rgba(0,0,0,0.08)] text-[#1A1A1A] h-[52px] rounded-[14px] focus-visible:ring-[#34C759]"
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                size="icon"
                className={`w-[52px] h-[52px] rounded-[14px] border-[rgba(0,0,0,0.08)] transition-all ${
                  copied 
                    ? 'bg-[#34C759] border-[#34C759] text-white' 
                    : 'bg-white hover:bg-[#F8F9FB]'
                }`}
              >
                {copied ? (
                  <Check size={20} strokeWidth={2.5} />
                ) : (
                  <Copy size={20} strokeWidth={2} className="text-[#1A1A1A]" />
                )}
              </Button>
            </div>
            <p className="text-[13px] text-[#6F6F6F] mt-3 text-center">
              Share this code or use the button below
            </p>
          </CardContent>
        </Card>

        {/* Share Button */}
        <Button
          onClick={handleShare}
          className="w-full h-[52px] bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] hover:shadow-[0_8px_24px_rgba(0,122,255,0.3)] text-white font-semibold text-[15px] rounded-[14px] shadow-[0_2px_8px_rgba(0,122,255,0.2)] transition-all"
        >
          <Share2 size={20} strokeWidth={2.5} className="mr-2" />
          Share Referral Link
        </Button>

        {/* Stats Card */}
        <Card className="bg-white rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
                  <Users size={24} strokeWidth={2} className="text-[#007AFF]" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-[#1A1A1A]">Friends Referred</p>
                  <p className="text-[13px] text-[#6F6F6F]">Lifetime total</p>
                </div>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="text-[42px] font-bold text-[#007AFF] leading-none"
              >
                {totalReferrals}
              </motion.div>
            </div>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="bg-white rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)]">
          <CardContent className="p-5">
            <h3 className="text-[17px] font-semibold text-[#1A1A1A] mb-4">
              How It Works
            </h3>
            <div className="space-y-3">
              {[
                { step: '1', text: 'Share your referral code with friends' },
                { step: '2', text: 'Friend signs up using your code' },
                { step: '3', text: 'Both get +50 SmartPoints instantly!' }
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[15px] font-semibold text-[#007AFF]">{item.step}</span>
                  </div>
                  <span className="text-[15px] text-[#1A1A1A] pt-1">{item.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

