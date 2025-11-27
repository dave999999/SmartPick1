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
    <div className="space-y-2.5 px-5 pt-5 pb-3">
      {/* Product name with time badge */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[17px] font-semibold text-[#111] flex-1 leading-tight">
          {title}
        </h3>
        {timeRemaining && (
          <div className="bg-green-100 text-green-700 rounded-full text-xs font-medium px-2 py-0.5 whitespace-nowrap flex items-center gap-1 flex-shrink-0">
            <Clock className="h-3 w-3" />
            <span>{timeRemaining}</span>
          </div>
        )}
      </div>

      {/* Product description or fallback */}
      {description ? (
        <p className="text-sm text-gray-600 leading-relaxed">
          {description}
        </p>
      ) : (
        <p className="text-xs text-gray-400 leading-relaxed">
          Ready for pickup. Limited stock.
        </p>
      )}
    </div>
  );
}
