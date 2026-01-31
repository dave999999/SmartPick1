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
  const isPullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    isPullingRef.current = isPulling;
  }, [isPulling]);

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    if (disabled) return;
    
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if scrolled to top (with 5px tolerance for any sub-pixel rendering)
      const scrollTop = container.scrollTop;
      const isAtTop = scrollTop <= 5;
      
      if (isAtTop) {
        touchStartY.current = e.touches[0].clientY;
        logger.debug('[PullToRefresh] Touch start at top, scrollTop:', scrollTop);
      } else {
        logger.debug('[PullToRefresh] Not at top, scrollTop:', scrollTop);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const scrollTop = container.scrollTop;
      
      // Only activate if we started at the top (with tolerance)
      if (scrollTop > 5 || touchStartY.current === 0) {
        if (pullDistanceRef.current > 0) {
          setPullDistance(0);
          setIsPulling(false);
        }
        return;
      }

      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;

      // Only pull down (positive distance means pulling down)
      if (distance > 0) {
        // Add resistance effect (diminishing returns)
        const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(resistedDistance);
        setIsPulling(true);
        
        logger.debug('[PullToRefresh] Pulling:', resistedDistance, 'threshold:', threshold);
        
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
      const wasPulling = isPullingRef.current;
      const finalDistance = pullDistanceRef.current;
      const alreadyRefreshing = isRefreshingRef.current;
      
      // Reset touch start
      touchStartY.current = 0;
      setIsPulling(false);
      
      logger.debug('[PullToRefresh] Touch end', { wasPulling, finalDistance, threshold, alreadyRefreshing });
      
      // Trigger refresh if pulled beyond threshold
      if (wasPulling && finalDistance >= threshold && !alreadyRefreshing) {
        logger.log('[PullToRefresh] ✅ Triggering refresh...');
        setIsRefreshing(true);
        try {
          await onRefresh();
          logger.log('[PullToRefresh] ✅ Refresh completed');
        } catch (error) {
          logger.error('[PullToRefresh] Refresh error:', error);
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 500);
        }
      } else {
        setPullDistance(0);
        if (wasPulling && finalDistance < threshold) {
          logger.debug('[PullToRefresh] Pull distance below threshold, not refreshing');
        }
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
  }, [disabled, threshold, onRefresh]);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    shouldTrigger: pullDistance >= threshold,
  };
}
