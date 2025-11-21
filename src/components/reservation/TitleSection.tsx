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
      {/* How To Flow - Compact top row */}
      <div className="flex items-center justify-center gap-2 py-1">
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-full p-1.5 shadow-md">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <span className="text-xs font-bold text-white">Reserve</span>
        </div>

        <ArrowRight className="h-4 w-4 text-[#00cc66]" strokeWidth={3} />

        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-full p-1.5 shadow-md">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <span className="text-xs font-bold text-white">Pickup</span>
        </div>
      </div>

      {/* Product name with time badge */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-white flex-1">{title}</h3>
        {timeRemaining && (
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
            isExpiringSoon
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-[#00cc66]/20 text-[#00cc66] border border-[#00cc66]/30'
          }`}>
            <Clock className="h-3 w-3" />
            <span>{timeRemaining} left</span>
          </div>
        )}
      </div>

      {/* Product description (სვანური) */}
      {description && (
        <p className="text-xs text-gray-400 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
