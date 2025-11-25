/**
 * Draggable Bottom Sheet Component
 * Apple Maps / Google Maps style bottom sheet with 3 states:
 * - Collapsed: 12% (show category icons only - minimal)
 * - Mid: 45% (default on load)
 * - Expanded: 85-90% (full list)
 */

import { useState, useRef, useEffect, ReactNode } from 'react';

interface DraggableBottomSheetProps {
  children: ReactNode;
}

type SheetState = 'collapsed' | 'mid' | 'expanded';

const SHEET_HEIGHTS = {
  collapsed: 12,
  mid: 45,
  expanded: 88,
} as const;

export function DraggableBottomSheet({ 
  children
}: DraggableBottomSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const heightPercentage = isDragging 
    ? Math.max(15, Math.min(95, SHEET_HEIGHTS[sheetState] + ((startY - currentY) / window.innerHeight) * 100))
    : SHEET_HEIGHTS[sheetState];

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = startY - currentY;
    const threshold = 50;

    if (Math.abs(deltaY) < threshold) {
      return;
    }

    if (deltaY > 0) {
      // Swiping up
      if (sheetState === 'collapsed') {
        setSheetState('mid');
      } else if (sheetState === 'mid') {
        setSheetState('expanded');
      }
    } else {
      // Swiping down
      if (sheetState === 'expanded') {
        setSheetState('mid');
      } else if (sheetState === 'mid') {
        setSheetState('collapsed');
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setCurrentY(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setCurrentY(e.clientY);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = startY - currentY;
    const threshold = 50;

    if (Math.abs(deltaY) < threshold) {
      return;
    }

    if (deltaY > 0) {
      if (sheetState === 'collapsed') {
        setSheetState('mid');
      } else if (sheetState === 'mid') {
        setSheetState('expanded');
      }
    } else {
      if (sheetState === 'expanded') {
        setSheetState('mid');
      } else if (sheetState === 'mid') {
        setSheetState('collapsed');
      }
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, startY]);

  const handleHandleClick = () => {
    if (sheetState === 'collapsed') {
      setSheetState('mid');
    } else if (sheetState === 'mid') {
      setSheetState('expanded');
    } else {
      setSheetState('collapsed');
    }
  };

  return (
    <div
      ref={sheetRef}
      className="fixed left-0 right-0 rounded-t-3xl overflow-hidden transition-all duration-300 ease-out"
      style={{
        bottom: 0,
        height: `${heightPercentage}vh`,
        zIndex: 30,
        background: 'linear-gradient(to bottom, #050A12 0%, #0C1623 100%)',
        boxShadow: '0 -8px 32px rgba(0, 246, 255, 0.15), 0 -4px 16px rgba(0, 0, 0, 0.7)',
        borderTop: '1px solid rgba(0, 246, 255, 0.2)',
        transform: isDragging ? 'none' : undefined,
        paddingBottom: 'max(20px, env(safe-area-inset-bottom) + 20px)',
      }}
    >
      {/* Swipe Handle */}
      <div
        className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClick={handleHandleClick}
      >
        <div
          className="rounded-full transition-all duration-200"
          style={{
            width: '32px',
            height: '4px',
            background: 'rgba(0, 246, 255, 0.3)',
            boxShadow: '0 0 8px rgba(0, 246, 255, 0.4)',
          }}
        />
      </div>

      {/* Scrollable Content */}
      <div 
        className="h-full overflow-y-auto overflow-x-hidden"
        style={{
          paddingBottom: '20px',
        }}
      >
        {children}
      </div>
    </div>
  );
}
