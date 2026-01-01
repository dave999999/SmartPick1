import { logger } from '@/lib/logger';
import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({ 
  onRefresh, 
  threshold = 80, 
  disabled = false 
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const touchStartY = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;
    
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if scrolled to top
      if (container.scrollTop === 0) {
        startY = e.touches[0].clientY;
        touchStartY.current = startY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Only activate if we started at the top
      if (container.scrollTop > 0 || touchStartY.current === 0) {
        setPullDistance(0);
        return;
      }

      currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;

      // Only pull down (positive distance means pulling down)
      if (distance > 0) {
        // Add resistance effect (diminishing returns)
        const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(resistedDistance);
        setIsPulling(true);
        
        // Prevent default scrolling when pulling down
        if (distance > 10) {
          e.preventDefault();
        }
      } else {
        // User is pulling up, reset
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    const handleTouchEnd = async () => {
      // Reset touch start
      touchStartY.current = 0;
      
      if (!isPulling) {
        setPullDistance(0);
        return;
      }

      setIsPulling(false);
      
      // Trigger refresh if pulled beyond threshold
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          logger.error('Refresh error:', error);
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 300);
        }
      } else {
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, threshold, onRefresh, isRefreshing, disabled]);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    shouldTrigger: pullDistance >= threshold,
  };
}
