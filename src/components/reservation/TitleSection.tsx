import { MapPin, Facebook, Twitter, Instagram, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TitleSectionProps {
  title: string;
  description?: string;
  partnerName: string;
  partnerAddress?: string;
  timeRemaining?: string;
  isExpiringSoon?: boolean;
  onShareFacebook: () => void;
  onShareTwitter: () => void;
  onShareInstagram: () => void;
}

export default function TitleSection({ 
  title, 
  description,
  partnerName, 
  partnerAddress,
  timeRemaining,
  isExpiringSoon,
  onShareFacebook,
  onShareTwitter,
  onShareInstagram
}: TitleSectionProps) {
  return (
    <div className="space-y-2">
      {/* How To Flow - NEON GLOWING CAPSULE BUTTONS */}
      <div className="flex items-center justify-center gap-2 py-1">
        {/* Reserve Button - Orange Gradient with Glow */}
        <div className="flex items-center gap-1.5 px-4 py-2 rounded-full transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #FF8A00 0%, #FFBD42 100%)',
            boxShadow: '0 0 12px rgba(255, 138, 0, 0.5), 0 4px 12px rgba(255, 138, 0, 0.3)',
          }}
        >
          <div className="rounded-full p-1">
            <span className="text-base">💰</span>
          </div>
          <span className="text-xs font-bold text-white">Reserve</span>
        </div>

        <ArrowRight className="h-4 w-4 text-[#00F6FF]" strokeWidth={3} />

        {/* Pickup Button - Neon Teal Border */}
        <div className="flex items-center gap-1.5 px-4 py-2 rounded-full transition-all duration-200"
          style={{
            background: 'rgba(0, 246, 255, 0.05)',
            border: '1.5px solid #00F6FF',
            boxShadow: '0 0 10px rgba(0, 246, 255, 0.4)',
          }}
        >
          <div className="rounded-full p-1">
            <MapPin className="h-4 w-4" style={{ color: '#00F6FF' }} />
          </div>
          <span className="text-xs font-bold" style={{ color: '#00F6FF' }}>Pickup</span>
        </div>
      </div>

      {/* Product name with time badge */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-white flex-1"
          style={{
            textShadow: '0 0 8px rgba(0, 246, 255, 0.3)'
          }}
        >
          {title}
        </h3>
        {timeRemaining && (
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
            isExpiringSoon
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-[#00F6FF]/20 border border-[#00F6FF]/30'
          }`}
            style={{
              color: isExpiringSoon ? '#FFB443' : '#00F6FF',
              boxShadow: isExpiringSoon ? '0 0 8px rgba(255, 138, 0, 0.3)' : '0 0 8px rgba(0, 246, 255, 0.3)'
            }}
          >
            <Clock className="h-3 w-3" />
            <span>{timeRemaining} left</span>
          </div>
        )}
      </div>

      {/* Product description with neon teal shadow */}
      {description && (
        <p className="text-xs text-gray-400 leading-relaxed"
          style={{
            textShadow: '0 0 4px rgba(0, 246, 255, 0.15)'
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
