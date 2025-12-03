/**
 * SquareCountdownBorder - Animated countdown border around square QR container
 * 
 * Features:
 * - 60fps SVG strokeDashoffset animation
 * - 18-segment progress track (like Uber countdown ring)
 * - Smooth color transition: green → yellow → red
 * - Optimized with Framer Motion
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SquareCountdownBorderProps {
  expiresAt: string;
  size: number; // Square size (200px)
  strokeWidth?: number;
  onExpired?: () => void;
  children: React.ReactNode;
}

export function SquareCountdownBorder({
  expiresAt,
  size,
  strokeWidth = 4,
  onExpired,
  children,
}: SquareCountdownBorderProps) {
  const [progress, setProgress] = useState(100); // 100% → 0%
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Calculate perimeter of square
  const perimeter = size * 4;
  const dashArray = perimeter;
  const dashOffset = perimeter * (1 - progress / 100);

  useEffect(() => {
    const calculateProgress = () => {
      const now = Date.now();
      const target = new Date(expiresAt).getTime();
      const total = target - (target - 3600000); // Assume 1 hour reservation
      const remaining = Math.max(0, target - now);
      
      setTimeRemaining(remaining);
      const progressPercent = (remaining / total) * 100;
      setProgress(Math.max(0, Math.min(100, progressPercent)));

      if (remaining <= 0 && onExpired) {
        onExpired();
      }
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  // Color based on time remaining
  const getStrokeColor = () => {
    const minutes = timeRemaining / 60000;
    if (minutes < 5) return '#EF4444'; // red
    if (minutes < 15) return '#F59E0B'; // amber
    return '#22C55E'; // green
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Animated SVG Border */}
      <svg
        className="absolute inset-0 -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        {/* Background track (gray) */}
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={size - strokeWidth}
          height={size - strokeWidth}
          rx={24}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />

        {/* Animated progress border */}
        <motion.rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={size - strokeWidth}
          height={size - strokeWidth}
          rx={24}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* 18 Segment Markers (like Uber) */}
        {Array.from({ length: 18 }).map((_, i) => {
          const segmentProgress = perimeter / 18;
          const currentOffset = dashOffset;
          const segmentOffset = i * segmentProgress;
          const isActive = segmentOffset < perimeter - currentOffset;

          return (
            <circle
              key={i}
              cx={calculateSegmentX(i, size, strokeWidth)}
              cy={calculateSegmentY(i, size, strokeWidth)}
              r={2}
              fill={isActive ? getStrokeColor() : '#E5E7EB'}
              className="transition-all duration-300"
            />
          );
        })}
      </svg>

      {/* Content inside */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// Helper: Calculate segment marker positions around square perimeter
function calculateSegmentX(index: number, size: number, strokeWidth: number): number {
  const perimeter = (size - strokeWidth) * 4;
  const segmentLength = perimeter / 18;
  const distance = index * segmentLength;
  const sideLength = size - strokeWidth;

  if (distance < sideLength) {
    // Top edge
    return strokeWidth / 2 + distance;
  } else if (distance < sideLength * 2) {
    // Right edge
    return size - strokeWidth / 2;
  } else if (distance < sideLength * 3) {
    // Bottom edge
    return size - strokeWidth / 2 - (distance - sideLength * 2);
  } else {
    // Left edge
    return strokeWidth / 2;
  }
}

function calculateSegmentY(index: number, size: number, strokeWidth: number): number {
  const perimeter = (size - strokeWidth) * 4;
  const segmentLength = perimeter / 18;
  const distance = index * segmentLength;
  const sideLength = size - strokeWidth;

  if (distance < sideLength) {
    // Top edge
    return strokeWidth / 2;
  } else if (distance < sideLength * 2) {
    // Right edge
    return strokeWidth / 2 + (distance - sideLength);
  } else if (distance < sideLength * 3) {
    // Bottom edge
    return size - strokeWidth / 2;
  } else {
    // Left edge
    return size - strokeWidth / 2 - (distance - sideLength * 3);
  }
}
