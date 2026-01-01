import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold: number;
}

export function PullToRefreshIndicator({ 
  pullDistance, 
  isRefreshing, 
  threshold 
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const opacity = Math.min(progress * 2, 1);
  
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${isRefreshing ? '60px' : Math.max(pullDistance - 20, 0)}px)`,
        opacity: isRefreshing ? 1 : opacity,
        transition: isRefreshing ? 'transform 0.3s ease, opacity 0.2s' : 'none',
      }}
    >
      <div className="bg-white shadow-lg rounded-full p-3 border border-gray-200">
        <RefreshCw 
          className={`w-5 h-5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            transform: !isRefreshing ? `rotate(${progress * 360}deg)` : undefined,
          }}
        />
      </div>
    </div>
  );
}
