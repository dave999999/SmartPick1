/**
 * EarnPointsSheet - Apple-style modal showing 3 ways to earn points
 * Opens when user has insufficient points for reservation
 */

import { X, Trophy, Users, CreditCard } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';

interface EarnPointsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onBuyPoints: () => void;
}

export function EarnPointsSheet({ isOpen, onClose, onBuyPoints }: EarnPointsSheetProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleAchievements = () => {
    onClose();
    navigate('/profile?tab=achievements');
  };

  const handleReferral = () => {
    onClose();
    navigate('/profile?tab=referrals');
  };

  const handleBuyPoints = () => {
    onClose();
    onBuyPoints();
  };

  const options = [
    {
      icon: Trophy,
      title: t('earnPoints.achievements.title'),
      description: t('earnPoints.achievements.description'),
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      onClick: handleAchievements,
    },
    {
      icon: Users,
      title: t('earnPoints.referral.title'),
      description: t('earnPoints.referral.description'),
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      onClick: handleReferral,
    },
    {
      icon: CreditCard,
      title: t('earnPoints.buyPoints.title'),
      description: t('earnPoints.buyPoints.description'),
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      onClick: handleBuyPoints,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
      />

      {/* Modal - Centered */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-3xl shadow-2xl max-w-[380px] w-full pointer-events-auto animate-in zoom-in-95 duration-200">
          {/* Header - Compact */}
          <div className="relative px-5 pt-4 pb-3 border-b border-gray-100">
            <button
              onClick={onClose}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 pr-8">
              {t('earnPoints.title')}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('earnPoints.subtitle')}
            </p>
          </div>

          {/* Options - Compact */}
          <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={option.onClick}
                className="w-full p-3.5 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all active:scale-[0.98] text-left"
              >
                <div className="flex items-center gap-3">
                  {/* Icon - Smaller */}
                  <div className={`w-11 h-11 rounded-xl ${option.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <option.icon className={`w-5 h-5 ${option.iconColor}`} strokeWidth={2.5} />
                  </div>

                  {/* Content - Compact */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold text-gray-900 mb-0.5 leading-tight">
                      {option.title}
                    </h3>
                    <p className="text-[12px] text-gray-600 leading-snug line-clamp-2">
                      {option.description}
                    </p>
                  </div>

                  {/* Arrow - Smaller */}
                  <div className="flex-shrink-0">
                    <svg 
                      className="w-5 h-5 text-gray-400" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2.5} 
                        d="M9 5l7 7-7 7" 
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Bottom padding */}
          <div className="h-4" />
        </div>
      </div>
    </>
  );
}
