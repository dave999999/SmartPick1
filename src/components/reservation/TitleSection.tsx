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
        <div className="flex items-center gap-1.5 bg-gradient-to-br from-mint-50 to-mint-100/50 px-3 py-1.5 rounded-xl border border-mint-200">
          <div className="bg-white rounded-full p-1.5 shadow-md border border-yellow-300">
            <Clock className="h-4 w-4 text-yellow-500" />
          </div>
          <span className="text-xs font-bold text-mint-800">Reserve</span>
        </div>

        <ArrowRight className="h-4 w-4 text-mint-500" strokeWidth={3} />

        <div className="flex items-center gap-1.5 bg-gradient-to-br from-mint-50 to-mint-100/50 px-3 py-1.5 rounded-xl border border-mint-200">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-full p-1.5 shadow-md">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <span className="text-xs font-bold text-mint-800">Pickup</span>
        </div>
      </div>

      {/* Restaurant name & address + Social icons row */}
      <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-gray-100">
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">{partnerName}</p>
          {/* Restaurant address - smaller */}
          {partnerAddress && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <MapPin className="h-3 w-3 text-mint-600 flex-shrink-0" />
              <span>{partnerAddress}</span>
            </div>
          )}
        </div>

        {/* Social share buttons - compact icons only */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onShareFacebook}
            className="h-7 w-7 rounded-full hover:bg-blue-50"
          >
            <Facebook className="h-3.5 w-3.5 text-gray-400 hover:text-blue-600 transition-colors" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShareTwitter}
            className="h-7 w-7 rounded-full hover:bg-sky-50"
          >
            <Twitter className="h-3.5 w-3.5 text-gray-400 hover:text-sky-600 transition-colors" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShareInstagram}
            className="h-7 w-7 rounded-full hover:bg-pink-50"
          >
            <Instagram className="h-3.5 w-3.5 text-gray-400 hover:text-pink-600 transition-colors" />
          </Button>
        </div>
      </div>

      {/* Product name with time badge */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-gray-900 flex-1">{title}</h3>
        {timeRemaining && (
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
            isExpiringSoon
              ? 'bg-orange-100 text-orange-700 border border-orange-200'
              : 'bg-mint-100 text-mint-700 border border-mint-200'
          }`}>
            <Clock className="h-3 w-3" />
            <span>{timeRemaining} left</span>
          </div>
        )}
      </div>

      {/* Product description (სვანური) */}
      {description && (
        <p className="text-xs text-gray-600 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
