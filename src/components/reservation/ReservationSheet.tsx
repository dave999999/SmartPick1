'use client';

import React, { useReducer, useEffect, useRef } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { X, ChevronUp, MapPin, Clock, Navigation, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// ============================================
// TYPES
// ============================================

export type ReservationStatus = 'active' | 'expired' | 'cancelled';

export interface Reservation {
  id: string;
  offerId: string;
  offerTitle: string;
  partnerName: string;
  imageUrl: string;
  pickupPriceGel: number;
  pointsUsed: number;
  quantity: number;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  expiresAt: string;
  distanceMeters?: number;
  durationMinutes?: number;
  qrPayload: string;
  addressLine: string;
  status: ReservationStatus;
}

export interface ReservationSheetProps {
  reservation: Reservation | null;
  isVisible: boolean;
  onDismiss: () => void;
  onNavigate: (reservation: Reservation) => void;
  onCancel: (reservationId: string) => void;
}

type SheetState = 'hidden' | 'collapsed' | 'medium' | 'expanded';

type SheetAction =
  | { type: 'RESERVATION_CREATED' }
  | { type: 'EXPAND' }
  | { type: 'COLLAPSE' }
  | { type: 'DISMISS' }
  | { type: 'TAP_OUTSIDE' }
  | { type: 'AUTO_COLLAPSE' }
  | { type: 'COUNTDOWN_EXPIRED' }
  | { type: 'CANCEL_CONFIRMED' };

// ============================================
// STATE MACHINE REDUCER
// ============================================

function sheetReducer(state: SheetState, action: SheetAction): SheetState {
  switch (action.type) {
    case 'RESERVATION_CREATED':
      return 'medium';
    
    case 'EXPAND':
      if (state === 'collapsed') return 'medium';
      if (state === 'medium') return 'expanded';
      return state;
    
    case 'COLLAPSE':
      if (state === 'expanded') return 'medium';
      if (state === 'medium') return 'collapsed';
      return state;
    
    case 'TAP_OUTSIDE':
      if (state === 'expanded') return 'medium';
      if (state === 'medium') return 'collapsed';
      return state;
    
    case 'AUTO_COLLAPSE':
      if (state === 'medium') return 'collapsed';
      return state;
    
    case 'DISMISS':
    case 'CANCEL_CONFIRMED':
    case 'COUNTDOWN_EXPIRED':
      return 'hidden';
    
    default:
      return state;
  }
}

// ============================================
// HOOKS
// ============================================

function useCountdown(expiresAt: string | null) {
  const [remainingMs, setRemainingMs] = React.useState<number>(0);
  
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
  
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isExpired = remainingMs <= 0;
  
  return { remainingMs, formatted, isExpired };
}

// ============================================
// HEIGHT CALCULATIONS
// ============================================

const SHEET_HEIGHTS = {
  collapsed: 80,
  medium: 320,
  expanded: 590,
};

// ============================================
// MAIN COMPONENT
// ============================================

export function ReservationSheet({
  reservation,
  isVisible,
  onDismiss,
  onNavigate,
  onCancel,
}: ReservationSheetProps) {
  const [sheetState, dispatch] = useReducer(sheetReducer, 'hidden');
  const [showQRModal, setShowQRModal] = React.useState(false);
  const { remainingMs, formatted, isExpired } = useCountdown(reservation?.expiresAt || null);
  const controls = useAnimation();
  const autoCollapseTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize state when reservation appears
  useEffect(() => {
    if (isVisible && reservation && sheetState === 'hidden') {
      dispatch({ type: 'RESERVATION_CREATED' });
      
      // Trigger wallet refresh for immediate points deduction
      window.dispatchEvent(new CustomEvent('smartpointsRefresh', { 
        detail: { reason: 'Reservation created' } 
      }));
      
      // Auto-collapse after 5 seconds
      autoCollapseTimer.current = setTimeout(() => {
        dispatch({ type: 'AUTO_COLLAPSE' });
      }, 5000);
    }
    
    if (!isVisible && sheetState !== 'hidden') {
      dispatch({ type: 'DISMISS' });
    }
    
    return () => {
      if (autoCollapseTimer.current) {
        clearTimeout(autoCollapseTimer.current);
      }
    };
  }, [isVisible, reservation]);
  
  // Handle expiration
  useEffect(() => {
    if (isExpired && sheetState !== 'hidden') {
      dispatch({ type: 'COUNTDOWN_EXPIRED' });
      onDismiss();
    }
  }, [isExpired, sheetState]);
  
  // Animate height changes
  useEffect(() => {
    if (sheetState === 'hidden') {
      controls.start({ y: '100%', opacity: 0 });
    } else {
      controls.start({
        y: 0,
        opacity: 1,
        height: SHEET_HEIGHTS[sheetState],
        transition: { type: 'spring', damping: 30, stiffness: 300 },
      });
    }
  }, [sheetState, controls]);
  
  const handleDragEnd = (event: any, info: PanInfo) => {
    const { offset, velocity } = info;
    
    if (offset.y > 50 || velocity.y > 500) {
      dispatch({ type: 'COLLAPSE' });
    } else if (offset.y < -50 || velocity.y < -500) {
      dispatch({ type: 'EXPAND' });
    }
  };
  
  const handleBackdropClick = () => {
    dispatch({ type: 'TAP_OUTSIDE' });
  };
  
  const handleCancel = () => {
    if (reservation) {
      const pointsLost = reservation.pointsUsed;
      const message = `😔 Are you sure you want to cancel?\n\nYou'll lose ${pointsLost} SmartPoints that were used for this reservation. These points won't be refunded.\n\nWe'd love for you to pick up your order instead! The partner is counting on you. 🙏`;
      
      if (window.confirm(message)) {
        dispatch({ type: 'CANCEL_CONFIRMED' });
        onCancel(reservation.id);
      }
    }
  };
  
  const handleNavigate = () => {
    if (reservation) {
      onNavigate(reservation);
    }
  };
  
  const handleViewQR = () => {
    setShowQRModal(true);
  };
  
  if (!reservation || sheetState === 'hidden') return null;
  
  const pickupTime = formatTime(reservation.pickupWindowStart, reservation.pickupWindowEnd);
  const distance = formatDistance(reservation.distanceMeters, reservation.durationMinutes);
  
  return (
    <>
      {/* QR Code Modal */}
      {showQRModal && reservation && (
        <div
          className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowQRModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG
                  value={reservation.qrPayload}
                  size={240}
                  level="H"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-mono text-gray-600 mb-1">{reservation.qrPayload}</p>
                <p className="text-xs text-gray-400">Show this code to the partner at pickup</p>
              </div>
              <button
                onClick={() => setShowQRModal(false)}
                className="mt-2 px-6 py-2 bg-orange-500 text-white rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Backdrop for tap-outside */}
      {sheetState !== 'collapsed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-black z-40"
        />
      )}
      
      {/* Bottom Sheet */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        initial={{ y: '100%', opacity: 0 }}
        className="fixed left-0 right-0 bg-white z-50 flex flex-col"
        style={{
          bottom: sheetState === 'collapsed' ? '96px' : '80px',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.15)',
          maxWidth: sheetState === 'collapsed' ? '90%' : '100%',
          marginLeft: sheetState === 'collapsed' ? 'auto' : '0',
          marginRight: sheetState === 'collapsed' ? 'auto' : '0',
        }}
      >
        {sheetState === 'collapsed' ? (
          <CollapsedView
            reservation={reservation}
            countdown={formatted}
            onExpand={() => dispatch({ type: 'EXPAND' })}
          />
        ) : sheetState === 'medium' ? (
          <MediumView
            reservation={reservation}
            countdown={formatted}
            pickupTime={pickupTime}
            distance={distance}
            onExpand={() => dispatch({ type: 'EXPAND' })}
            onViewQR={handleViewQR}
            onNavigate={handleNavigate}
            onCancel={handleCancel}
          />
        ) : (
          <ExpandedView
            reservation={reservation}
            countdown={formatted}
            pickupTime={pickupTime}
            distance={distance}
            onNavigate={handleNavigate}
            onCancel={handleCancel}
          />
        )}
      </motion.div>
    </>
  );
}

// ============================================
// COLLAPSED VIEW
// ============================================

function CollapsedView({
  reservation,
  countdown,
  onExpand,
}: {
  reservation: Reservation;
  countdown: string;
  onExpand: () => void;
}) {
  return (
    <div
      onClick={onExpand}
      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <img
        src={reservation.imageUrl}
        alt={reservation.offerTitle}
        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900">
          {reservation.quantity} reservation • {countdown}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {reservation.partnerName}
        </div>
      </div>
      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
    </div>
  );
}

// ============================================
// MEDIUM VIEW
// ============================================

function MediumView({
  reservation,
  countdown,
  pickupTime,
  distance,
  onExpand,
  onViewQR,
  onNavigate,
  onCancel,
}: {
  reservation: Reservation;
  countdown: string;
  pickupTime: string;
  distance: string;
  onExpand: () => void;
  onViewQR: () => void;
  onNavigate: () => void;
  onCancel: () => void;
}) {
  // Determine countdown color
  const minutes = parseInt(countdown.split(':')[0]);
  const countdownColor = minutes < 10 ? 'text-red-500' : minutes < 30 ? 'text-orange-500' : 'text-green-600';
  
  return (
    <div className="flex flex-col" style={{ height: '320px' }}>
      
      <div className="px-5 pt-4 pb-3 space-y-3">
        {/* Header - Ultra Compact */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900">
              {reservation.partnerName}
            </h3>
            <p className="text-sm text-gray-700 font-medium mt-0.5 truncate">
              {reservation.offerTitle}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {reservation.quantity} item{reservation.quantity > 1 ? 's' : ''} reserved
            </p>
          </div>
          <div className="text-right ml-3 flex-shrink-0">
            <div className={`text-lg font-bold font-mono ${countdownColor}`}>
              {countdown}
            </div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">
              Expires
            </div>
          </div>
        </div>
        
        {/* QR Thumbnail - Compact */}
        <motion.div
          whileTap={{ scale: 0.97 }}
          onClick={onViewQR}
          className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-orange-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <QRCodeSVG
                value={reservation.qrPayload}
                size={64}
                level="M"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Show QR at pickup</p>
              <p className="text-xs text-gray-500">Tap to enlarge</p>
            </div>
          </div>
          <ChevronUp className="w-5 h-5 text-orange-400 transform rotate-90" />
        </motion.div>
        
        {/* Info Row - Ultra Compact */}
        <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium">{pickupTime}</span>
          </div>
          <div className="w-px h-3 bg-gray-300" />
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium">{distance}</span>
          </div>
          <div className="w-px h-3 bg-gray-300" />
          <div className="flex items-center gap-1">
            <span className="font-semibold text-orange-600">{reservation.quantity}</span>
            <span className="text-gray-400">item</span>
          </div>
        </div>
        
        {/* Dual CTAs - Compact */}
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onCancel}
            className="flex-1 bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold py-2.5 px-4 rounded-full transition-all text-sm"
          >
            Cancel
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onNavigate}
            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2.5 px-4 rounded-full shadow-md shadow-orange-500/30 transition-all text-sm"
          >
            Navigate
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXPANDED VIEW
// ============================================

function ExpandedView({
  reservation,
  countdown,
  pickupTime,
  distance,
  onNavigate,
  onCancel,
}: {
  reservation: Reservation;
  countdown: string;
  pickupTime: string;
  distance: string;
  onNavigate: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Drag Handle */}
      <div className="flex justify-center pt-2 pb-3">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>
      
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            🎉 Reservation Confirmed!
          </h3>
          <p className="text-sm font-medium text-gray-700 mt-1">
            {reservation.offerTitle}
          </p>
          <p className="text-xs text-gray-500">
            {reservation.partnerName}
          </p>
        </div>
        
        {/* Status Line */}
        <div className="text-sm text-gray-600">
          <span className="font-medium">{reservation.quantity} item reserved</span>
          <span className="mx-2">•</span>
          <span>Expires in <span className="font-bold text-orange-600 font-mono">{countdown}</span></span>
        </div>
        
        {/* Info Chips */}
        <div className="flex gap-2">
          <div className="flex-1 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-700">{pickupTime}</span>
          </div>
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-700">{distance}</span>
          </div>
        </div>
        
        {/* QR Code Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex flex-col items-center space-y-3">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              value={reservation.qrPayload}
              size={160}
              level="M"
            />
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-gray-900 font-mono">
              {reservation.qrPayload}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Show this code to the partner at pickup
            </p>
          </div>
        </div>
        
        {/* Location Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-600" />
            Partner Location
          </h4>
          <p className="text-sm text-gray-600 pl-6">
            {reservation.addressLine}
          </p>
          <button
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reservation.addressLine)}`, '_blank')}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium pl-6 flex items-center gap-1 transition-colors"
          >
            Open in maps →
          </button>
        </div>
        
        {/* Reservation Details */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">📦 Reservation Details</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Quantity:</span>
              <span className="font-medium text-gray-900">
                {reservation.quantity} × {reservation.pickupPriceGel.toFixed(2)} ₾
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reserved with:</span>
              <span className="font-medium text-orange-600">{reservation.pointsUsed} SmartPoints</span>
            </div>
            <div className="pt-2 border-t border-orange-200 text-gray-700">
              <p className="text-xs">
                💡 You'll pay {(reservation.pickupPriceGel * reservation.quantity).toFixed(2)} ₾ at pickup
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onNavigate}
            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
          >
            <Navigation className="w-5 h-5" />
            Start Navigation
          </motion.button>
        </div>
        
        {/* Cancel Link */}
        <div className="text-center pb-2">
          <p className="text-xs text-gray-500 mb-2">
            Need to cancel? You can cancel until {formatTime(reservation.pickupWindowEnd)}. No penalty.
          </p>
          <button
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-gray-700 underline transition-colors"
          >
            Cancel reservation
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatTime(startIso: string, endIso?: string): string {
  const start = new Date(startIso);
  const formatHour = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
  if (endIso) {
    const end = new Date(endIso);
    return `${formatHour(start)}–${formatHour(end)}`;
  }
  return formatHour(start);
}

function formatDistance(meters?: number, minutes?: number): string {
  if (!meters && !minutes) return 'Calculating...';
  
  const distStr = meters 
    ? meters < 1000 
      ? `${meters}m` 
      : `${(meters / 1000).toFixed(1)}km`
    : '';
  
  const timeStr = minutes ? `${minutes} min` : '';
  
  if (distStr && timeStr) return `${distStr} · ${timeStr}`;
  return distStr || timeStr;
}
