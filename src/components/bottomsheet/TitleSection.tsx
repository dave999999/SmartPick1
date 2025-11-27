/**
 * TitleSection - Product title, time badge, and description
 */

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface TitleSectionProps {
  title: string;
  description?: string;
  timeRemaining?: string;
  isExpiringSoon?: boolean;
  isExpanded: boolean;
}

export function TitleSection({
  title,
  description,
  timeRemaining,
  isExpiringSoon,
  isExpanded
}: TitleSectionProps) {
  return (
    <div className="space-y-1.5 pt-2.5">
      {/* Title with Time Badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#111827] flex-1 leading-tight">
          {title}
        </h3>
        
        {timeRemaining && timeRemaining !== 'Expired' && (
          <div className={`
            flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0
            ${isExpiringSoon
              ? 'bg-orange-100 text-orange-700'
              : 'bg-green-100 text-green-700'
            }
          `}>
            <Clock className="h-3 w-3" />
            <span>{timeRemaining}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {description ? (
        <p className="text-[11px] text-[#6B7280] leading-snug">
          {description}
        </p>
      ) : (
        <p className="text-[10px] text-gray-400 italic">
          Ready for pickup. Limited stock.
        </p>
      )}
    </div>
  );
}
