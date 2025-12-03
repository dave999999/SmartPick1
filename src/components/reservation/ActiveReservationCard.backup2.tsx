/**
 * ActiveReservationCard - COMPLETELY REDESIGNED
 * 
 *  Design: Uber-inspired countdown tracker with square QR container
 * 
 * Features:
 * - Square countdown border (18 segments, 60fps animation)
 * - 3-state gesture system: Collapsed (110px) | Medium (420px) | Expanded (700px)
 * - Single tap QR  full-screen modal
 * - Double tap card  collapse to mini
 * - Swipe up/down  expand/collapse
 * - Drag with spring physics
 * - Zero lag, optimized animations
 * 
 * Tech Stack:
 * - Framer Motion (drag, gestures, springs)
 * - Tailwind CSS tokens
 * - TypeScript
 * - QRCodeSVG
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { MapPin, Navigation, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { SquareCountdownBorder } from './SquareCountdownBorder';
import { QRModal } from './QRModal';
import { useLiveRoute } from '@/hooks/useLiveRoute';

// ============================================
// TYPES
// ============================================

export interface ActiveReservation {
  id: string;
  offerTitle: string;
  partnerName: string;
  imageUrl: string;
  quantity: number;
  expiresAt: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  qrPayload: string;
  partnerLocation: {
    lat: number;
    lng: number;
  };
  pickupAddress: string;
}

export interface ActiveReservationCardProps {
  reservation: ActiveReservation | null;
  userLocation: { lat: number; lng: number } | null;
  onNavigate: (reservation: ActiveReservation) => void;
  onCancel: (reservationId: string) => void;
  onExpired: () => void;
}

// Card states
type CardState = 'collapsed' | 'medium' | 'expanded';

const STATE_HEIGHTS = {
  collapsed: 110,
  medium: 420,
  expanded: 700,
};

// ============================================
// COUNTDOWN HOOK
// ============================================

function useCountdown(expiresAt: string | null) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setRemainingMs(0);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(expiresAt).getTime();
      const diff = Math.max(0, target - now);
      setRemainingMs(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const ms = remainingMs ?? 0;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const isExpired = remainingMs !== null && remainingMs <= 0;

  // Color-coded urgency
  let colorClass = 'text-green-600';
  if (minutes < 5) colorClass = 'text-red-500';
  else if (minutes < 15) colorClass = 'text-amber-500';

  return { formatted, isExpired, colorClass, remainingMs: ms };
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ActiveReservationCard({
  reservation,
  userLocation,
  onNavigate,
  onCancel,
  onExpired,
}: ActiveReservationCardProps) {
  const [cardState, setCardState] = useState<CardState>('medium');
  const [showQRModal, setShowQRModal] = useState(false);
  const { formatted, isExpired, colorClass } = useCountdown(reservation?.expiresAt || null);

  // Live route tracking
  const { distanceInMeters, etaInMinutes } = useLiveRoute(
    userLocation,
    reservation?.partnerLocation || null,
    { enabled: !!reservation }
  );

  // Motion values for drag
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-300, 0], [1, 0.95]);

  // Tap detection
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle expiration
  const hasCalledExpired = useRef(false);
  const lastReservationId = useRef<string | null>(null);
  const hasFullyLoaded = useRef(false);
  
  useEffect(() => {
    if (reservation && reservation.id !== lastReservationId.current) {
      lastReservationId.current = reservation.id;
      hasCalledExpired.current = false;
      hasFullyLoaded.current = false;
      
      setTimeout(() => {
        hasFullyLoaded.current = true;
      }, 100);
    }
    
    if (isExpired && reservation && !hasCalledExpired.current && hasFullyLoaded.current) {
      hasCalledExpired.current = true;
      onExpired();
    }
  }, [isExpired, reservation, onExpired]);

  // Don't show if no reservation or expired
  if (!reservation || isExpired) return null;

  const distanceText = formatDistance(distanceInMeters);

  // Handle tap on card (double tap = collapse)
  const handleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      // Double tap detected
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      setCardState('collapsed');
      lastTapRef.current = 0;
    } else {
      // Single tap - wait to see if double tap follows
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        // Single tap confirmed (no double tap)
        if (cardState === 'collapsed') {
          setCardState('medium');
        }
      }, 300);
    }
  };

  // Handle tap on QR code specifically
  const handleQRTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQRModal(true);
  };

  // Handle drag end
  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;

    // Swipe down to collapse
    if (offset.y > 100 || velocity.y > 500) {
      if (cardState === 'expanded') {
        setCardState('medium');
      } else if (cardState === 'medium') {
        setCardState('collapsed');
      }
    }
    // Swipe up to expand
    else if (offset.y < -100 || velocity.y < -500) {
      if (cardState === 'collapsed') {
        setCardState('medium');
      } else if (cardState === 'medium') {
        setCardState('expanded');
      }
    }
  };

  const currentHeight = STATE_HEIGHTS[cardState];

  return (
    <>
      {/* Main Card */}
      <motion.div
        drag="y"
        dragConstraints={{ top: -300, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onClick={handleTap}
        animate={{ height: currentHeight }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{ y, opacity }}
        className="fixed bottom-0 left-4 right-4 z-40 bg-white rounded-t-3xl shadow-lg shadow-black/10 overflow-hidden cursor-pointer select-none"
        data-state={cardState}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-20 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Content Container */}
        <div className="px-4 pb-4">
          {/* COLLAPSED STATE - Mini Preview */}
          {cardState === 'collapsed' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <img
                src={reservation.imageUrl}
                alt={reservation.offerTitle}
                className="w-16 h-16 rounded-2xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {reservation.offerTitle}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {reservation.partnerName}
                </p>
              </div>
              <div className={`text-lg font-bold font-mono ${colorClass}`}>
                {formatted}
              </div>
            </motion.div>
          )}

          {/* MEDIUM STATE - Main View with Square QR */}
          {cardState === 'medium' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              {/* Countdown Timer - Centered */}
              <div className="text-center">
                <div className={`text-3xl font-bold font-mono ${colorClass}`}>
                  {formatted}
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">
                  EXPIRES
                </div>
              </div>

              {/* QR Code - Centered with Border */}
              <div className="flex justify-center">
                <div 
                  onClick={handleQRTap}
                  className="cursor-pointer hover:scale-105 transition-transform"
                >
                  <SquareCountdownBorder
                    expiresAt={reservation.expiresAt}
                    size={180}
                    strokeWidth={4}
                    onExpired={onExpired}
                  >
                    <div className="bg-white rounded-2xl p-3 shadow-sm">
                      <QRCodeSVG
                        value={reservation.qrPayload}
                        size={140}
                        level="M"
                      />
                      <p className="text-[9px] text-center text-gray-400 mt-1.5">
                        Tap to enlarge
                      </p>
                    </div>
                  </SquareCountdownBorder>
                </div>
              </div>

              {/* Item Info */}
              <div className="text-center space-y-1">
                <p className="text-base font-bold text-gray-900">
                  {reservation.offerTitle}
                </p>
                <p className="text-sm text-gray-600">
                  {reservation.partnerName}
                </p>
              </div>

              {/* Info Chips - Horizontal */}
              <div className="flex items-center justify-center gap-2">
                <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">
                    {distanceText} • {etaInMinutes} min
                  </span>
                </div>
                <div className="bg-gray-100 px-3 py-1.5 rounded-full">
                  <span className="text-xs font-semibold text-gray-900">
                    {reservation.quantity} item{reservation.quantity > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Cancel reservation? You will not get your SmartPoints back.')) {
                      onCancel(reservation.id);
                    }
                  }}
                  className="flex-1 h-11 bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold rounded-full transition-all text-sm"
                >
                  Cancel
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(reservation);
                  }}
                  className="flex-1 h-11 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-semibold rounded-full shadow-md shadow-orange-500/30 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Navigation className="w-4 h-4" />
                  Navigate
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* EXPANDED STATE - Full Details */}
          {cardState === 'expanded' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-4 overflow-y-auto max-h-[600px]"
            >
              {/* Product Header */}
              <div className="flex items-center gap-3">
                <img
                  src={reservation.imageUrl}
                  alt={reservation.offerTitle}
                  className="w-20 h-20 rounded-2xl object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {reservation.offerTitle}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {reservation.partnerName}
                  </p>
                </div>
                <div className={`text-2xl font-bold font-mono ${colorClass}`}>
                  {formatted}
                </div>
              </div>

              {/* QR Code Section */}
              <div 
                onClick={handleQRTap}
                className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <div className="flex items-center justify-center">
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <QRCodeSVG value={reservation.qrPayload} size={180} level="H" />
                  </div>
                </div>
                <p className="text-center text-sm font-semibold text-gray-900 mt-3">
                  Show QR at pickup
                </p>
                <p className="text-center text-xs text-gray-500">
                  Tap to view larger
                </p>
              </div>

              {/* Reservation Details */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Reservation ID</span>
                  <code className="text-sm font-mono font-semibold text-gray-900">
                    {reservation.qrPayload}
                  </code>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quantity</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {reservation.quantity} item{reservation.quantity > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Distance</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {distanceText} ({etaInMinutes} min walk)
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Pickup Location</p>
                  <p className="text-sm font-medium text-gray-900">
                    {reservation.pickupAddress}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Cancel reservation? You will not get your SmartPoints back.')) {
                      onCancel(reservation.id);
                    }
                  }}
                  className="flex-1 h-12 bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold rounded-full transition-all"
                >
                  Cancel
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(reservation);
                  }}
                  className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-semibold rounded-full shadow-md shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Navigation className="w-5 h-5" />
                  Navigate
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* QR Modal */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrPayload={reservation.qrPayload}
        offerTitle={reservation.offerTitle}
        partnerName={reservation.partnerName}
        expiresIn={formatted}
        quantity={reservation.quantity}
      />
    </>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
