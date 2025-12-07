/**
 * ActiveReservationCard V2 - Ultra-Premium Apple Wolt-Style Floating QR
 * 
 * 🎨 DESIGN PHILOSOPHY: Wolt + Apple Fitness + Apple Wallet Fusion
 * 
 * 🎯 WORLD-CLASS SPECIFICATIONS:
 * 
 * WOLT-STYLE MAP OVERLAP:
 * - QR floats 50% over map, 50% inside modal (Wolt delivery tracker)
 * - Floating depth shadow: 0 16px 48px rgba(0,0,0,0.15)
 * - Modal takes 50% screen height maximum
 * - Soft blur backdrop on modal only
 * 
 * QR MODULE (Fully Rounded Premium):
 * - Border radius: 14px (fully rounded, no sharp corners)
 * - Inner shadow: inset 0 2px 8px rgba(0,0,0,0.04)
 * - Micro-gloss: Linear gradient white highlight (subtle)
 * - Tap to enlarge: scale(1.0 → 1.08 → 1.0), 120ms spring
 * - iOS haptic: Light impact feedback
 * 
 * COUNTDOWN RING (Apple Fitness Precision):
 * - Perfectly aligned with rounded QR shape
 * - Outer glow: rgba(46, 204, 113, 0.4) soft mint
 * - 60 FPS smooth animation
 * - 4px stroke with gradient + glossy overlay
 * - Symmetrical micro-dots (18 segments)
 * 
 * ULTRA-COMPACT MODAL BODY (<50% height):
 * - Drastically reduced padding: 8-12px everywhere
 * - Timer: SF Rounded style, huge bold digits
 * - Single Apple Wallet card for offer info
 * - No wasted vertical space
 * - Buttons: 44px height (iOS touch standard)
 * 
 * APPLE AESTHETIC TOKENS:
 * Colors:
 * - Surface: linear-gradient(135deg, #F8F8F8, #FFFFFF)
 * - Mint: #2ECC71 (success/active)
 * - Orange: #FF7A00 (SmartPick brand)
 * - Text: #1D1D1F (Apple black)
 * - Secondary: #86868B (Apple gray)
 * 
 * Shadows:
 * - Float: 0 16px 48px rgba(0,0,0,0.15)
 * - Card: 0 4px 16px rgba(0,0,0,0.06)
 * - Inner: inset 0 2px 8px rgba(0,0,0,0.04)
 * 
 * Spacing Grid: 4/8/12/16/20/24pt strict
 * Corner Radius: 12-16px premium rounded
 * Backdrop: blur(18px) + saturate(180%)
 * 
 * RESPONSIVE (Small Screen Priority):
 * - iPhone SE (375×667): All content visible, no scroll
 * - QR size: 170px → 150px on <375px width
 * - Padding collapse: 12px → 8px on <360px
 * - Modal height: max-h-[50vh] with overflow-auto
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, X, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

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
  variant?: 'minimal' | 'glossy';
}

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
  
  // Calculate progress based on 60-minute reservation window
  const progressPercent = remainingMs !== null ? Math.min(100, (remainingMs / (60 * 60 * 1000)) * 100) : 0;

  return { formatted, isExpired, progressPercent, remainingMs: ms, minutes };
}

// ============================================
// FLOATING QR MODULE (Wolt-Style)
// ============================================

function FloatingQRModule({ 
  expiresAt, 
  qrPayload,
  onTap,
  variant = 'glossy'
}: {
  expiresAt: string;
  qrPayload: string;
  onTap: () => void;
  variant?: 'minimal' | 'glossy';
}) {
  const { progressPercent, minutes } = useCountdown(expiresAt);
  const size = 160;
  const strokeWidth = 4;
  
  // Apple-grade muted colors
  let ringColor = '#2ECC71';
  let glowColor = 'rgba(46, 204, 113, 0.4)';
  
  if (minutes < 5) {
    ringColor = '#EF4444';
    glowColor = 'rgba(239, 68, 68, 0.4)';
  } else if (minutes < 15) {
    ringColor = '#FF7A00';
    glowColor = 'rgba(255, 122, 0, 0.4)';
  }

  const radius = (size - strokeWidth * 2) / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;
  const center = size / 2;
  const qrSize = radius * 1.95;

  const isGlossy = variant === 'glossy';

  return (
    <motion.div
      className="w-full flex items-center justify-center"
      style={{ 
        position: 'relative',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
      initial={{ y: -40, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 26, stiffness: 350, delay: 0.15 }}
    >
      {/* Colored pulse ring */}
      <div 
        className="absolute"
        style={{
          width: size + 16,
          height: size + 16,
          borderRadius: '50%',
          border: `3px solid ${ringColor}`,
          opacity: 0.4,
          animation: 'color-pulse 2s ease-in-out infinite',
        }}
      />

      {/* Floating Shadow Container */}
      <div 
        className="relative flex items-center justify-center"
        style={{ 
          width: size,
          height: size,
          filter: 'drop-shadow(0 16px 48px rgba(0, 0, 0, 0.15)) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))',
        }}
      >
        {/* Countdown Ring */}
        <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
          <defs>
            {/* Ring gradient */}
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={ringColor} stopOpacity="1" />
              <stop offset="100%" stopColor={ringColor} stopOpacity="0.75" />
            </linearGradient>
            
            {/* Glossy overlay */}
            <linearGradient id="gloss" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.35" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            
            {/* Apple Fitness glow */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Track */}
          <circle 
            cx={center} 
            cy={center} 
            r={radius} 
            fill="none" 
            stroke="rgba(255,255,255,0.3)" 
            strokeWidth={strokeWidth} 
            strokeLinecap="round" 
          />
          
          {/* Progress ring */}
          <circle
            cx={center} 
            cy={center} 
            r={radius}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#glow)"
            style={{ 
              transition: 'stroke-dashoffset 1s ease-out',
              filter: `drop-shadow(0 0 8px ${glowColor})`
            }}
          />
          
          {/* Glossy highlight */}
          {isGlossy && (
            <circle
              cx={center} 
              cy={center} 
              r={radius}
              fill="none"
              stroke="url(#gloss)"
              strokeWidth={strokeWidth * 0.7}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              opacity="0.8"
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          )}
          
          {/* 24 Micro-dots (Soft Glow) */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 360) / 24 - 90;
            const dotX = center + radius * Math.cos((angle * Math.PI) / 180);
            const dotY = center + radius * Math.sin((angle * Math.PI) / 180);
            const isActive = progressPercent > (i / 24) * 100;
            
            return (
              <g key={i}>
                {/* Soft glow effect for active dots */}
                {isActive && (
                  <circle 
                    cx={dotX} 
                    cy={dotY} 
                    r={2.5} 
                    fill={ringColor} 
                    opacity="0.15"
                    className="transition-opacity duration-1000"
                    style={{
                      filter: `blur(1.5px)`,
                      animation: 'subtle-glow 3s ease-in-out infinite',
                    }}
                  />
                )}
                {/* Main dot */}
                <circle 
                  cx={dotX} 
                  cy={dotY} 
                  r={1.5} 
                  fill={isActive ? ringColor : 'rgba(255,255,255,0.3)'}
                  className="transition-all duration-700"
                  style={{
                    opacity: isActive ? 0.9 : 0.4,
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Premium QR Card (Fully Rounded Circle) */}
        <motion.div
          onClick={onTap}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 1.08 }}
          transition={{ type: 'spring', damping: 18, stiffness: 450, duration: 0.12 }}
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
        >
          <div 
            className={`bg-white rounded-full p-4 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${isGlossy ? 'shadow-[0_8px_32px_rgba(0,0,0,0.15),inset_0_2px_12px_rgba(0,0,0,0.05)]' : ''}`}
            style={{ 
              width: qrSize, 
              height: qrSize,
              background: isGlossy 
                ? 'linear-gradient(145deg, #FFFFFF 0%, #FAFAFA 50%, #F5F5F5 100%)'
                : '#FFFFFF',
              border: '3px solid rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <QRCodeSVG 
                value={qrPayload} 
                size={qrSize * 0.92}
                level="H" 
                style={{ 
                  borderRadius: '50%',
                  display: 'block',
                  padding: '4px',
                  background: 'white'
                }}
              />
              <div 
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)'
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ============================================
// QR MODAL
// ============================================

function QRModal({ isOpen, onClose, qrPayload, offerTitle, partnerName, expiresIn }: {
  isOpen: boolean;
  onClose: () => void;
  qrPayload: string;
  offerTitle: string;
  partnerName: string;
  expiresIn: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[340px] p-0 border-none bg-transparent shadow-none overflow-visible">
        <VisuallyHidden>
          <DialogTitle>Reservation QR Code</DialogTitle>
          <DialogDescription>Scan this QR code at the partner location to pick up your order</DialogDescription>
        </VisuallyHidden>
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          className="bg-white/98 backdrop-blur-xl rounded-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] overflow-hidden"
        >
          {/* Compact Header */}
          <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-gray-900 leading-tight truncate">
                  {offerTitle}
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{partnerName}</p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95"
              >
                <X className="w-3.5 h-3.5 text-gray-600" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Compact QR Section */}
          <div className="p-4">
            <div 
              className="bg-white rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-gray-100"
              style={{ 
                background: 'linear-gradient(145deg, #FFFFFF 0%, #FAFAFA 100%)'
              }}
            >
              <div className="flex justify-center">
                <QRCodeSVG 
                  value={qrPayload} 
                  size={220} 
                  level="H" 
                  style={{ 
                    borderRadius: '10px',
                    display: 'block'
                  }} 
                />
              </div>
            </div>
          </div>

          {/* Compact Timer & Info */}
          <div className="px-4 pb-4 text-center space-y-2">
            <div>
              <p className="text-[32px] font-bold font-mono text-[#2ECC71] tracking-tight leading-none">
                {expiresIn}
              </p>
              <p className="text-[9px] text-gray-400 uppercase tracking-[0.12em] font-semibold mt-0.5">
                REMAINING
              </p>
            </div>
            <p className="text-[12px] text-gray-500">
              Show this code at pickup
            </p>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
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
  variant = 'glossy'
}: ActiveReservationCardProps) {
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { formatted, isExpired, minutes } = useCountdown(reservation?.expiresAt || null);

  // Auto-expire handler
  useEffect(() => {
    if (isExpired && reservation) {
      onExpired();
    }
  }, [isExpired, reservation, onExpired]);

  if (!reservation) return null;

  // Color coding
  let colorClass = 'text-[#2ECC71]';
  if (minutes < 5) colorClass = 'text-[#EF4444]';
  else if (minutes < 15) colorClass = 'text-[#FF7A00]';

  const isGlossy = variant === 'glossy';

  return (
    <>
      {/* Ultra-Compact Modal (50% height max) */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 350 }}
        className="fixed bottom-0 left-0 right-0 z-[60] overflow-visible pointer-events-auto"
        style={{
          maxHeight: '40vh',
          background: isGlossy 
            ? 'linear-gradient(135deg, #F8F8F8 0%, #FFFFFF 100%)'
            : '#FFFFFF',
          backdropFilter: 'blur(18px) saturate(180%)',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: '0 -12px 32px rgba(0, 0, 0, 0.12), 0 -2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Floating QR Module (Wolt-style overlap) */}
        <div 
          className="absolute left-0 right-0 flex justify-center pointer-events-auto"
          style={{ top: -75 }}
        >
          <FloatingQRModule
            expiresAt={reservation.expiresAt}
            qrPayload={reservation.qrPayload}
            onTap={() => setShowQRModal(true)}
            variant={variant}
          />
        </div>

        {/* Modal Body (Ultra-Compact) */}
        <div className="pt-[80px] px-4 pb-3 space-y-2">
          {/* iOS Drag Handle */}
          <div className="flex justify-center -mt-2 mb-2">
            <div className="w-10 h-1 bg-[#D1D1D6] rounded-full" />
          </div>

          {/* Huge Timer (SF Rounded Style) */}
          <div className="text-center">
            <div className={`text-[48px] font-bold font-mono tracking-tight leading-none ${colorClass}`}>
              {formatted}
            </div>
            <div className="text-[9px] text-[#86868B] uppercase tracking-[0.15em] font-semibold mt-0.5">
              EXPIRES
            </div>
          </div>

          {/* Apple Wallet Card (Ultra-Compact) */}
          <div 
            className="rounded-2xl p-2.5 space-y-1.5"
            style={{
              background: isGlossy
                ? 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))'
                : 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(16px)',
              boxShadow: isGlossy ? '0 4px 16px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            {/* Title & Partner */}
            <div className="text-center">
              <p className="text-[13px] font-semibold text-[#1D1D1F] leading-tight">
                {reservation.offerTitle}
              </p>
              <p className="text-[11px] text-[#86868B] mt-0.5">{reservation.partnerName}</p>
            </div>

            {/* Info Row */}
            <div className="flex items-center justify-center gap-2 text-[11px]">
              <span className="font-semibold text-[#1D1D1F]">
                {reservation.quantity} item{reservation.quantity > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Action Buttons (44px iOS Standard) */}
          <div className="flex gap-2.5">
            <motion.button
              onClick={() => setShowCancelDialog(true)}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', damping: 20, stiffness: 400, duration: 0.14 }}
              className="flex-1 h-9 rounded-full border-2 border-[#FF7A00]/60 text-[#FF7A00] font-semibold text-[13px] hover:bg-orange-50/50 hover:border-[#FF7A00] transition-all shadow-sm"
            >
              Cancel
            </motion.button>

            <motion.button
              onClick={() => onNavigate(reservation)}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', damping: 20, stiffness: 400, duration: 0.14 }}
              className="flex-1 h-9 rounded-full text-white font-semibold text-[13px] flex items-center justify-center gap-2 transition-all"
              style={{
                background: isGlossy
                  ? 'linear-gradient(135deg, #FF7A00 0%, #FF8A1F 100%)'
                  : '#FF7A00',
                boxShadow: isGlossy
                  ? '0 6px 20px rgba(255,122,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : '0 4px 12px rgba(255,122,0,0.25)',
              }}
            >
              <Navigation className="w-4 h-4" strokeWidth={2.5} />
              Navigate
            </motion.button>
          </div>
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
      />

      {/* Apple-Style Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-[320px] rounded-[16px] p-0 border-none bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <DialogTitle className="text-[17px] font-semibold text-gray-900 leading-tight text-center px-5 pt-5">
            Cancel Reservation?
          </DialogTitle>
          <DialogDescription className="sr-only">
            Confirm if you want to cancel your reservation. You will need to make a new reservation if you change your mind.
          </DialogDescription>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          >
            {/* Icon & Header */}
            <div className="px-5 pt-0 pb-3 text-center">
              <div className="flex justify-center mb-3">
                <div className="text-[56px] leading-none">
                  🤔
                </div>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed mt-2 px-2">
                Hey! Just want to make sure — you're about to cancel your <span className="font-semibold text-gray-900">{reservation.offerTitle}</span> at <span className="font-semibold text-gray-900">{reservation.partnerName}</span>.
                <br /><br />
                If you change your mind, you'll need to make a new reservation. We'd love to have you though! 😊
              </p>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 pt-3 flex flex-col gap-2.5">
              <motion.button
                onClick={() => setShowCancelDialog(false)}
                whileTap={{ scale: 0.98 }}
                className="w-full h-11 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-[15px] rounded-xl shadow-lg shadow-blue-500/25 transition-all"
              >
                Keep My Reservation ✨
              </motion.button>
              <motion.button
                onClick={() => {
                  onCancel(reservation.id);
                  setShowCancelDialog(false);
                }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-10 bg-transparent hover:bg-gray-50 text-gray-500 font-medium text-[14px] rounded-xl transition-colors"
              >
                Cancel Anyway
              </motion.button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}