/**
 * PointsCost - Main reservation cost block (visually dominant)
 */

interface PointsCostProps {
  cost: number;
}

export function PointsCost({ cost }: PointsCostProps) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 p-3 border border-orange-200/50 shadow-sm text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1.5">
        <span className="text-base">✨</span>
        <h4 className="text-sm font-semibold text-gray-700">Reservation Cost</h4>
      </div>
      
      <div className="mb-1.5">
        <p className="text-3xl font-bold text-[#F97316] leading-none">{cost}</p>
        <p className="text-sm font-medium text-[#F97316] mt-0.5">Points</p>
      </div>
      
      <div className="pt-1.5 border-t border-orange-200/50">
        <p className="text-[11px] text-gray-600 leading-snug max-w-[260px] mx-auto">
          Reserving costs points. <span className="font-medium">Payment is completed at pickup.</span>
        </p>
      </div>
    </div>
  );
}
