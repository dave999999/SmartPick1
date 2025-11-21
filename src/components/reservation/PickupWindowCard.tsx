import { Clock, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PickupWindowCardProps {
  startTime: string;
  endTime: string;
  countdown: string;
  is24Hours?: boolean;
  businessHours?: {
    open: string;
    close: string;
  } | null;
}

export default function PickupWindowCard({
  startTime,
  endTime,
  countdown,
  is24Hours = false,
  businessHours
}: PickupWindowCardProps) {
  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg px-4 py-3 border border-orange-200/50 space-y-2">
      {/* Pickup Window */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-600" />
          {is24Hours ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 font-bold text-xs">
              Open 24h
            </Badge>
          ) : (
            <span className="text-sm font-bold text-gray-900">
              {startTime} — {endTime}
            </span>
          )}
        </div>
        <div className="text-right">
          <Badge className="bg-mint-500 text-white border-mint-600 font-semibold text-xs px-2 py-0.5">
            {countdown}
          </Badge>
          <p className="text-[10px] text-gray-500 mt-0.5 font-medium">Offer ends</p>
        </div>
      </div>

      {/* Business Hours */}
      {businessHours && (
        <div className="flex items-center gap-2 pt-1 border-t border-orange-200/50">
          <Store className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-xs text-gray-600">
            Business Hours: <span className="font-semibold text-gray-700">{businessHours.open} — {businessHours.close}</span>
          </span>
        </div>
      )}
      {is24Hours && (
        <div className="flex items-center gap-2 pt-1 border-t border-orange-200/50">
          <Store className="h-3.5 w-3.5 text-green-600" />
          <span className="text-xs text-gray-600">
            Business Hours: <span className="font-semibold text-green-700">Open 24 Hours</span>
          </span>
        </div>
      )}
    </div>
  );
}
