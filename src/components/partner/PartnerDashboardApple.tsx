/**
 * SmartPick Partner Dashboard - Apple Redesign
 * Mobile-first, inspired by Apple Wallet + Fitness + Settings
 * Optimized for one-handed use on small screens
 */

import { useState, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  QrCode, 
  Pause, 
  Play, 
  Edit3, 
  Copy, 
  Trash2,
  Layers,
  TrendingUp,
  Package,
  Coins,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Offer } from '@/lib/api';

interface AppleDashboardProps {
  partner: any;
  offers: Offer[];
  stats: {
    activeOffers: number;
    reservationsToday: number;
    itemsPickedUp: number;
  };
  partnerPoints: {
    balance: number;
    offer_slots: number;
  } | null;
  analytics: {
    revenue: number;
  };
  onCreateOffer: () => void;
  onScanQR: () => void;
  onPauseOffer: (offerId: string) => void;
  onResumeOffer: (offerId: string) => void;
  onEditOffer: (offer: Offer) => void;
  onDuplicateOffer: (offer: Offer) => void;
  onDeleteOffer: (offerId: string) => void;
}

// Apple-style metric cards
const MetricCard = ({ 
  icon: Icon, 
  value, 
  label, 
  color = 'mint',
  trend 
}: { 
  icon: any; 
  value: string | number; 
  label: string; 
  color?: 'mint' | 'orange' | 'blue' | 'purple';
  trend?: string;
}) => {
  const colorMap = {
    mint: 'from-teal-500/10 to-emerald-500/10 border-teal-200/30',
    orange: 'from-orange-500/10 to-amber-500/10 border-orange-200/30',
    blue: 'from-blue-500/10 to-cyan-500/10 border-blue-200/30',
    purple: 'from-purple-500/10 to-pink-500/10 border-purple-200/30',
  };

  const iconColorMap = {
    mint: 'text-teal-600',
    orange: 'text-orange-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
  };

  return (
    <motion.div
      className={`
        min-w-[280px] h-[140px] rounded-[28px] p-5
        bg-gradient-to-br ${colorMap[color]}
        backdrop-blur-xl
        border border-white/40
        shadow-sm
        flex flex-col justify-between
      `}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-full bg-white/50 flex items-center justify-center ${iconColorMap[color]}`}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
        {trend && (
          <span className="text-xs font-semibold text-green-600 bg-green-50/80 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      
      <div>
        <div className="text-4xl font-bold text-gray-900 mb-0.5 tracking-tight">
          {value}
        </div>
        <div className="text-sm font-medium text-gray-600">
          {label}
        </div>
      </div>
    </motion.div>
  );
};

// Swipeable offer card
const OfferCard = ({ 
  offer, 
  onPause,
  onResume,
  onEdit,
  onDuplicate,
  onDelete 
}: { 
  offer: Offer;
  onPause: () => void;
  onResume: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) => {
  const { t } = useI18n();
  const [isRevealed, setIsRevealed] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-100, 0, 100], [-5, 0, 5]);
  
  const isPaused = offer.status === 'PAUSED';

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 80;
    
    if (info.offset.x > threshold) {
      // Swipe right - Pause/Resume
      setIsRevealed(true);
      setTimeout(() => {
        isPaused ? onResume() : onPause();
        setIsRevealed(false);
      }, 200);
    } else if (info.offset.x < -threshold) {
      // Swipe left - Show actions
      setIsRevealed(true);
    } else {
      setIsRevealed(false);
    }
  };

  return (
    <div className="relative h-[100px] mb-3">
      {/* Background actions - revealed on swipe */}
      {isRevealed && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-between px-4"
        >
          {/* Left action - Pause/Resume */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={isPaused ? onResume : onPause}
            className={`
              w-14 h-14 rounded-full flex items-center justify-center
              ${isPaused ? 'bg-green-500' : 'bg-orange-500'}
              shadow-lg
            `}
          >
            {isPaused ? (
              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
            ) : (
              <Pause className="w-6 h-6 text-white" />
            )}
          </motion.button>

          {/* Right actions */}
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onEdit}
              className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-lg"
            >
              <Edit3 className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onDuplicate}
              className="w-14 h-14 rounded-full bg-purple-500 flex items-center justify-center shadow-lg"
            >
              <Copy className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onDelete}
              className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
            >
              <Trash2 className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Main card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 100 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x, rotate }}
        className={`
          absolute inset-0
          bg-white/90 backdrop-blur-xl
          rounded-[24px] border border-gray-200/50
          shadow-sm
          overflow-hidden
          ${isRevealed ? 'shadow-xl' : ''}
        `}
      >
        <div className="flex items-center h-full px-4 gap-3">
          {/* Image */}
          <div className="w-16 h-16 rounded-[16px] bg-gray-100 overflow-hidden flex-shrink-0">
            {offer.image_url ? (
              <img 
                src={offer.image_url} 
                alt={offer.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {offer.title}
              </h3>
              {isPaused && (
                <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                  PAUSED
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-bold text-teal-600">
                {offer.smart_price}₾
              </span>
              <span className="text-gray-500">
                • {offer.remaining_quantity || 0} {t('offers.left')}
              </span>
            </div>
          </div>

          {/* Drag indicator */}
          <div className="flex-shrink-0 text-gray-300">
            <MoreHorizontal className="w-5 h-5" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function PartnerDashboardApple({
  partner,
  offers,
  stats,
  partnerPoints,
  analytics,
  onCreateOffer,
  onScanQR,
  onPauseOffer,
  onResumeOffer,
  onEditOffer,
  onDuplicateOffer,
  onDeleteOffer,
}: AppleDashboardProps) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);

  const usedSlots = offers.filter(o => o.status === 'ACTIVE').length;
  const totalSlots = partnerPoints?.offer_slots || 10;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-32">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {t('partner.dashboard.title')}
          </h1>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-xl border border-gray-200/50 flex items-center justify-center shadow-sm"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </motion.button>
        </div>
        <p className="text-sm text-gray-600 font-medium">
          {partner?.business_name}
        </p>
      </div>

      {/* Apple Cards - Horizontal Scroll */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide px-4 mb-6"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-3 pb-2">
          <MetricCard
            icon={Layers}
            value={`${usedSlots}/${totalSlots}`}
            label={t('partner.points.slots')}
            color="mint"
          />
          <MetricCard
            icon={Package}
            value={stats.activeOffers}
            label={t('partner.dashboard.activeOffers')}
            color="blue"
            trend="+12%"
          />
          <MetricCard
            icon={TrendingUp}
            value={stats.itemsPickedUp}
            label={t('partner.dashboard.pickedUp')}
            color="purple"
          />
          <MetricCard
            icon={Coins}
            value={`${analytics.revenue.toFixed(0)}₾`}
            label={t('partner.dashboard.revenueToday')}
            color="orange"
          />
        </div>
      </div>

      {/* Section Header */}
      <div className="px-4 mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {t('partner.dashboard.offers')}
        </h2>
        <span className="text-sm font-semibold text-gray-500">
          {offers.length} {t('offers.total')}
        </span>
      </div>

      {/* Offers List */}
      <div className="px-4">
        {offers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 font-medium mb-2">
              {t('partner.dashboard.noOffers')}
            </p>
            <p className="text-xs text-gray-500">
              {t('partner.dashboard.createFirstOffer')}
            </p>
          </div>
        ) : (
          offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onPause={() => onPauseOffer(offer.id)}
              onResume={() => onResumeOffer(offer.id)}
              onEdit={() => onEditOffer(offer)}
              onDuplicate={() => onDuplicateOffer(offer)}
              onDelete={() => onDeleteOffer(offer.id)}
            />
          ))
        )}
      </div>

      {/* Floating Action Bar */}
      <motion.div 
        className="fixed bottom-6 left-4 right-4 z-50"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20 }}
      >
        <div className="
          bg-white/80 backdrop-blur-2xl
          rounded-[24px]
          border border-gray-200/50
          shadow-xl shadow-gray-900/10
          p-3
          flex items-center gap-3
        ">
          {/* Primary Action - New Offer */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCreateOffer}
            className="
              flex-1 h-14
              bg-gradient-to-r from-teal-500 to-emerald-500
              rounded-[18px]
              flex items-center justify-center gap-2
              text-white font-semibold
              shadow-lg shadow-teal-500/30
            "
          >
            <Plus className="w-5 h-5" strokeWidth={3} />
            <span>{t('partner.dashboard.newOffer')}</span>
          </motion.button>

          {/* Secondary Action - Scan QR */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onScanQR}
            className="
              w-14 h-14
              bg-gray-100
              rounded-[18px]
              flex items-center justify-center
              text-gray-700
            "
          >
            <QrCode className="w-6 h-6" strokeWidth={2.5} />
          </motion.button>
        </div>
      </motion.div>

      {/* Hide default scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
