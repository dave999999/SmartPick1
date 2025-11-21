import { AlertTriangle, XCircle, Clock, Shield } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface PenaltyModalProps {
  open: boolean;
  onClose: () => void;
  penaltyCount: number;
  penaltyUntil: string | null;
  isBanned: boolean;
}

export default function PenaltyModal({ open, onClose, penaltyCount, penaltyUntil, isBanned }: PenaltyModalProps) {
  const { t } = useI18n();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!penaltyUntil || isBanned) return;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const until = new Date(penaltyUntil).getTime();
      const diff = until - now;
      
      if (diff <= 0) {
        setTimeRemaining('00:00:00');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [penaltyUntil, isBanned]);

  if (!open) return null;

  const getPenaltyInfo = () => {
    if (isBanned) {
      return {
        icon: <XCircle className="w-16 h-16 text-red-500" />,
        title: t('penalty.banned'),
        subtitle: t('penalty.penalty3'),
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-900'
      };
    }

    if (penaltyCount >= 2) {
      return {
        icon: <AlertTriangle className="w-16 h-16 text-orange-500" />,
        title: t('penalty.suspended'),
        subtitle: t('penalty.penalty2'),
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-900'
      };
    }

    return {
      icon: <Clock className="w-16 h-16 text-yellow-500" />,
      title: t('penalty.suspended'),
      subtitle: t('penalty.penalty1'),
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-900'
    };
  };

  const info = getPenaltyInfo();

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header with gradient */}
        <div className={`${info.bgColor} border-b ${info.borderColor} px-6 py-8 text-center`}>
          <div className="flex justify-center mb-4">
            {info.icon}
          </div>
          <h2 className={`text-2xl font-bold ${info.textColor} mb-2`}>{info.title}</h2>
          <p className="text-sm text-gray-600">{t('penalty.failedPickup.message')}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Current Penalty */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">{t('penalty.currentPenalty')}</span>
              <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded-full">
                {penaltyCount}/3
              </span>
            </div>
            <p className={`text-lg font-bold ${info.textColor}`}>{info.subtitle}</p>
            
            {!isBanned && timeRemaining && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span>{t('penalty.timeRemaining')}</span>
                </div>
                <div className="text-2xl font-mono font-bold text-gray-900 tabular-nums">
                  {timeRemaining}
                </div>
              </div>
            )}
          </div>

          {/* Warning Card */}
          {!isBanned && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900 mb-2">{t('penalty.nextWarning')}</p>
                  <div className="space-y-1 text-xs text-amber-800">
                    {penaltyCount === 1 && <p>• {t('penalty.penalty2')}</p>}
                    {penaltyCount <= 2 && <p>• {t('penalty.penalty3')}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isBanned && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-sm text-red-800">{t('penalty.contactSupport')}</p>
            </div>
          )}

          {/* Penalty Scale */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Penalty Scale</p>
            <div className="space-y-2">
              <div className={`flex items-center gap-3 p-2 rounded-lg ${penaltyCount >= 1 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${penaltyCount >= 1 ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                <span className="text-sm text-gray-700">{t('penalty.penalty1')}</span>
              </div>
              <div className={`flex items-center gap-3 p-2 rounded-lg ${penaltyCount >= 2 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${penaltyCount >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                <span className="text-sm text-gray-700">{t('penalty.penalty2')}</span>
              </div>
              <div className={`flex items-center gap-3 p-2 rounded-lg ${penaltyCount >= 3 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${penaltyCount >= 3 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                <span className="text-sm text-gray-700">{t('penalty.penalty3')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <Button 
            onClick={onClose}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          >
            I Understand
          </Button>
        </div>
      </div>
    </div>
  );
}
