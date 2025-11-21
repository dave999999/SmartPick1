import { Coins } from 'lucide-react';

interface WalletCardProps {
  balance: number;
  cost: number;
}

export default function WalletCard({ balance, cost }: WalletCardProps) {
  return (
    <div className="bg-gradient-to-br from-mint-50 via-mint-100/50 to-emerald-50 rounded-xl p-4 border border-mint-200/50 shadow-md">
      <div className="flex items-center justify-between">
        {/* Balance section */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full p-2 shadow-lg">
            <Coins className="h-5 w-5 text-white drop-shadow-sm" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">Your Balance</p>
            <p className="text-lg font-bold text-gray-900">
              {balance.toLocaleString()} <span className="text-sm font-semibold text-mint-600">pts</span>
            </p>
          </div>
        </div>
        
        {/* Cost section */}
        <div className="text-right">
          <p className="text-xs font-medium text-gray-600">This costs</p>
          <p className="text-lg font-bold text-mint-700">
            {cost} <span className="text-sm font-semibold text-gray-600">pts</span>
          </p>
        </div>
      </div>
    </div>
  );
}
