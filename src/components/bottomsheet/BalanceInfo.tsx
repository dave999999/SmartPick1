/**
 * BalanceInfo - Small pill showing user's SmartPoints balance
 */

interface BalanceInfoProps {
  balance: number;
}

export function BalanceInfo({ balance }: BalanceInfoProps) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-white rounded-full px-2 py-1 shadow-sm border border-gray-100">
      <span className="text-sm">🪙</span>
      <span className="text-xs font-medium text-gray-600">Your Balance:</span>
      <span className="text-xs font-bold text-gray-900">{balance.toLocaleString()}</span>
      <span className="text-[10px] text-gray-500">Points</span>
    </div>
  );
}
