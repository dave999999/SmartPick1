import { MapPin, Facebook, Twitter, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TitleSectionProps {
  title: string;
  description?: string;
  partnerName: string;
  partnerAddress?: string;
  onShareFacebook: () => void;
  onShareTwitter: () => void;
  onShareInstagram: () => void;
}

export default function TitleSection({ 
  title, 
  description,
  partnerName, 
  partnerAddress,
  onShareFacebook,
  onShareTwitter,
  onShareInstagram
}: TitleSectionProps) {
  return (
    <div className="space-y-2">
      {/* Restaurant name & address + Social icons row */}
      <div className="flex items-start justify-between gap-3 pb-2 border-b border-gray-100">
        <div className="flex-1">
          <p className="text-base font-bold text-gray-900">{partnerName}</p>
          {/* Restaurant address - smaller */}
          {partnerAddress && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
              <MapPin className="h-3 w-3 text-mint-600 flex-shrink-0" />
              <span>{partnerAddress}</span>
            </div>
          )}
        </div>
        
        {/* Social share buttons - compact icons only */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onShareFacebook}
            className="h-8 w-8 rounded-full hover:bg-blue-50 hover:scale-110 transition-all duration-200"
          >
            <Facebook className="h-4 w-4 text-gray-400 hover:text-blue-600 transition-colors" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShareTwitter}
            className="h-8 w-8 rounded-full hover:bg-sky-50 hover:scale-110 transition-all duration-200"
          >
            <Twitter className="h-4 w-4 text-gray-400 hover:text-sky-600 transition-colors" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShareInstagram}
            className="h-8 w-8 rounded-full hover:bg-pink-50 hover:scale-110 transition-all duration-200"
          >
            <Instagram className="h-4 w-4 text-gray-400 hover:text-pink-600 transition-colors" />
          </Button>
        </div>
      </div>
      
      {/* Product name (ევზარიანი საცხობი) - now below partner info */}
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      
      {/* Product description (სვანური) */}
      {description && (
        <p className="text-sm text-gray-600 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
