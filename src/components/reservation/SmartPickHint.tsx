import { useState } from 'react';
import { Clock, MapPin, QrCode, ChevronDown, ChevronUp } from 'lucide-react';

export default function SmartPickHint() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="bg-gradient-to-br from-mint-50 to-blue-50/40 rounded-lg border border-mint-200/50 overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-mint-50/50 transition-colors"
      >
        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span className="text-mint-600">ℹ️</span>
          How SmartPick works
        </p>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-600" />
        )}
      </button>
      
      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2.5 border-t border-mint-200/30 pt-3 animate-in slide-in-from-top-2 duration-200">
          {/* Step 1: Reserve */}
          <div className="flex items-start gap-2.5">
            <div className="bg-mint-100 rounded-full p-1.5 flex-shrink-0">
              <Clock className="h-4 w-4 text-mint-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">Reserve now</p>
              <p className="text-xs text-gray-600">Book your meal instantly</p>
            </div>
          </div>
          
          {/* Step 2: Pick up */}
          <div className="flex items-start gap-2.5">
            <div className="bg-orange-100 rounded-full p-1.5 flex-shrink-0">
              <MapPin className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">Pick up within 1 hour</p>
              <p className="text-xs text-gray-600">Visit the restaurant</p>
            </div>
          </div>
          
          {/* Step 3: Show QR */}
          <div className="flex items-start gap-2.5">
            <div className="bg-blue-100 rounded-full p-1.5 flex-shrink-0">
              <QrCode className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">Show your QR code</p>
              <p className="text-xs text-gray-600">Display code to collect</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
