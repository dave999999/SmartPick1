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
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { usePickupBroadcast } from '@/hooks/usePickupBroadcast';
import { getUserCancellationWarning } from '@/lib/api/penalty';
import { logger } from '@/lib/logger';

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
  onPickupConfirmed?: (data: { savedAmount: number; pointsEarned: number }) => void;
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
      <DialogContent className="max-w-[320px] p-0 border-none bg-transparent shadow-none overflow-visible">
        <VisuallyHidden>
          <DialogTitle>Reservation QR Code</DialogTitle>
          <DialogDescription>Scan this QR code at the partner location to pick up your order</DialogDescription>
        </VisuallyHidden>
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 24 }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="bg-white/75 backdrop-blur-[28px] border border-white/40 rounded-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden"
        >
          {/* Compact Emerald Header */}
          <div className="relative bg-gradient-to-br from-[#2ECC71] to-[#27AE60] px-3 py-2.5">
            <button
              onClick={onClose}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm flex items-center justify-center transition-all"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </button>
            <div className="text-white pr-8">
              <h2 className="text-sm font-semibold leading-tight mb-0.5">ქორბანი</h2>
              <p className="text-[10px] text-white/80 leading-tight">ქორბანის საქმრობა</p>
            </div>
          </div>

          {/* Compact QR Section */}
          <div className="flex flex-col items-center px-3 py-3">
            <div className="bg-white/90 rounded-xl p-2.5 shadow-md border border-white/60">
              <QRCodeSVG 
                value={qrPayload} 
                size={180}
                level="H" 
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Timer Section */}
          <div className="px-3 pb-2 text-center">
            <p className="text-[10px] text-gray-500 mb-1 flex items-center justify-center gap-1">
              <span className="text-purple-500">⏱</span> Time remaining
            </p>
            <p className="text-3xl font-bold text-[#2ECC71] font-mono tracking-tight leading-none mb-0.5">
              {expiresIn}
            </p>
            <p className="text-xs font-semibold text-gray-700 flex items-center justify-center gap-1 mb-1">
              <span>🎉</span> Ready to pick up!
            </p>
            <p className="text-[10px] text-gray-500">
              Show this QR code to the partner staff
            </p>
          </div>

          {/* Compact Details */}
          <div className="px-3 pb-3 space-y-2">
            <div className="bg-white/60 rounded-lg p-2 border border-white/50">
              <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{offerTitle}</p>
              <p className="text-[10px] text-gray-600 truncate leading-tight mt-0.5">{partnerName}</p>
            </div>
            <div className="bg-gradient-to-r from-blue-50/80 to-blue-100/60 rounded-lg px-2.5 py-1.5 border border-blue-200/50">
              <p className="text-[9px] text-center text-gray-600 leading-snug">
                <span className="font-semibold text-gray-700">💡 Pro Tip:</span> Screenshot this code for backup
              </p>
            </div>
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
  onPickupConfirmed,
  variant = 'glossy'
}: ActiveReservationCardProps) {
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelCount, setCancelCount] = useState(0);
  const [loadingCancelCount, setLoadingCancelCount] = useState(true);
  const { formatted, isExpired, minutes } = useCountdown(reservation?.expiresAt || null);
  const { t } = useI18n();

  // Debug QR modal state
  useEffect(() => {
    logger.debug('[ActiveReservationCard] QR Modal state changed:', { showQRModal, reservationId: reservation?.id });
  }, [showQRModal, reservation?.id]);

  // Poll for pickup status when QR modal is open (lightweight fallback)
  useEffect(() => {
    if (!showQRModal || !reservation?.id) return;
    
    logger.debug('[ActiveReservationCard] Starting pickup polling for reservation:', reservation.id);
    
    const checkPickupStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('reservations')
          .select('status')
          .eq('id', reservation.id)
          .single();
        
        if (!error && data?.status === 'PICKED_UP') {
          logger.debug('[ActiveReservationCard] Pickup detected via polling');
          
          // Check if already celebrated
          const celebrationKey = `pickup-celebrated-${reservation.id}`;
          if (!localStorage.getItem(celebrationKey)) {
            localStorage.setItem(celebrationKey, 'true');
            
            // Close QR modal
            setShowQRModal(false);
            
            // Calculate savings
            const savedAmount = 9.00; // TODO: Calculate from reservation data
            const pointsEarned = Math.floor(savedAmount * 10);
            
            // Show pickup success modal via parent callback
            if (onPickupConfirmed) {
              onPickupConfirmed({ savedAmount, pointsEarned });
            }
            
            // Note: Don't call onExpired() here - it shows "expired" toast
            // The pickup modal handles the success message
          }
        }
      } catch (err) {
        logger.error('[ActiveReservationCard] Error checking pickup status:', err);
      }
    };
    
    // Poll every 2 seconds while QR modal is open
    const interval = setInterval(checkPickupStatus, 2000);
    
    return () => {
      logger.debug('[ActiveReservationCard] Stopping pickup polling');
      clearInterval(interval);
    };
  }, [showQRModal, reservation?.id, onExpired]);

  // Function to fetch user's recent cancellation count
  const fetchCancelCount = async () => {
    if (!reservation) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      logger.debug('[ActiveReservationCard] Fetching cancellation count for user');
      
      // Use the proper API function that calls get_user_daily_cancellation_count
      const warning = await getUserCancellationWarning(user.id);
      
      logger.debug('[ActiveReservationCard] Cancellation warning:', warning);
      setCancelCount(warning.cancellationCount);
    } catch (error) {
      logger.error('[ActiveReservationCard] Error fetching cancel count:', error);
    } finally {
      setLoadingCancelCount(false);
    }
  };

  // Fetch cancellation count on mount
  useEffect(() => {
    fetchCancelCount();
  }, [reservation]);

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
      {/* QR Circle - Positioned to overflow 50% above modal */}
      <div 
        className="fixed left-0 right-0 flex justify-center pointer-events-auto z-[62]"
        style={{ 
          bottom: 'clamp(200px, 40vh - 80px, 280px)', // Responsive positioning with min/max constraints
        }}
      >
        <FloatingQRModule
          expiresAt={reservation.expiresAt}
          qrPayload={reservation.qrPayload}
          onTap={() => setShowQRModal(true)}
          variant={variant}
        />
      </div>

      {/* Compact Modal Frame - Shortened to allow QR overflow */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className="fixed bottom-0 left-0 right-0 z-[60] overflow-visible pointer-events-auto pb-safe"
        style={{
          height: 'clamp(280px, 40vh, 360px)', // Min 280px, max 360px, ideal 40vh
          background: isGlossy 
            ? 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(250,252,252,0.96) 100%)'
            : 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(40px) saturate(180%)',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.15), 0 -4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.4)',
        }}
      >
        {/* Top gloss highlight */}
        <div 
          className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
          }}
        />

        {/* Modal Content - starts below QR space */}
        <div className="relative h-full flex flex-col pt-[85px] sm:pt-[90px] px-4 sm:px-5 pb-3 sm:pb-4">
          {/* iOS Drag Handle */}
          <div className="absolute top-2 sm:top-3 left-0 right-0 flex justify-center">
            <div className="w-10 h-1 bg-[#D1D1D6] rounded-full opacity-60" />
          </div>

          {/* Timer Section - Large & Bold */}
          <div className="text-center mb-2 sm:mb-3">
            <div className={`text-[48px] sm:text-[56px] font-bold font-mono tracking-tighter leading-none ${colorClass}`}
              style={{
                fontFeatureSettings: '"tnum"',
                letterSpacing: '-0.02em'
              }}
            >
              {formatted}
            </div>
            <div className="text-[9px] sm:text-[10px] text-[#86868B] uppercase tracking-[0.18em] font-bold mt-0.5 sm:mt-1">
              EXPIRES
            </div>
          </div>

          {/* Reserved Offer Card - Wallet Style */}
          <div 
            className="rounded-[16px] sm:rounded-[20px] p-2.5 sm:p-3 mb-3 sm:mb-4 flex items-center gap-2.5 sm:gap-3"
            style={{
              background: isGlossy
                ? 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(248,250,252,0.75) 100%)'
                : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(24px)',
              boxShadow: isGlossy 
                ? '0 8px 24px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)'
                : '0 4px 16px rgba(0,0,0,0.06)',
              border: '1px solid rgba(255,255,255,0.6)',
            }}
          >
            {/* Offer Image */}
            <div 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gray-100 overflow-hidden flex-shrink-0"
              style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <img 
                src={reservation.imageUrl} 
                alt={reservation.offerTitle}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Offer Details */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] sm:text-[14px] font-semibold text-[#1D1D1F] leading-snug truncate">
                {reservation.offerTitle} ({reservation.quantity})
              </p>
              <p className="text-[11px] sm:text-[12px] text-[#86868B] mt-0.5 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3" strokeWidth={2.5} />
                {reservation.partnerName}
              </p>
            </div>
          </div>

          {/* Action Buttons - iOS Standard */}
          <div className="flex gap-2.5 sm:gap-3 mt-auto">
            <motion.button
              onClick={async () => {
                // Fetch latest count before showing dialog
                await fetchCancelCount();
                setShowCancelDialog(true);
              }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', damping: 18, stiffness: 420 }}
              className="flex-1 h-10 sm:h-11 rounded-[12px] sm:rounded-[14px] font-semibold text-[14px] sm:text-[15px] transition-all"
              style={{
                background: 'rgba(255,255,255,0.9)',
                color: '#FF7A00',
                border: '1.5px solid rgba(255,122,0,0.3)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
              }}
            >
              Cancel
            </motion.button>

            <motion.button
              onClick={() => onNavigate(reservation)}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', damping: 18, stiffness: 420 }}
              className="flex-1 h-10 sm:h-11 rounded-[12px] sm:rounded-[14px] text-white font-bold text-[14px] sm:text-[15px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all"
              style={{
                background: isGlossy
                  ? 'linear-gradient(135deg, #FF8A00 0%, #FF7000 100%)'
                  : '#FF7A00',
                boxShadow: '0 10px 20px rgba(255,122,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              <Navigation className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
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
      <Dialog open={showCancelDialog} onOpenChange={(open) => {
        if (open) {
          logger.debug('[ActiveReservationCard] Opening cancel dialog with count:', cancelCount);
        }
        setShowCancelDialog(open);
      }}>
        <DialogContent className="max-w-[320px] rounded-[16px] p-0 border-none bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <DialogTitle className="text-[17px] font-semibold text-gray-900 leading-tight text-center px-5 pt-5">
            {cancelCount >= 4 ? '⚠️ მე-5 გაუქმება' : 
             cancelCount >= 3 ? '⚠️ მე-4 გაუქმება' : 
             cancelCount >= 2 ? t('cancelDialog.critical.title') : 
             cancelCount >= 1 ? t('cancelDialog.warning.title') : 
             t('cancelDialog.title')}
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
                  {cancelCount >= 4 ? '🚨' : 
                   cancelCount >= 3 ? '😰' : 
                   cancelCount >= 2 ? t('cancelDialog.critical.emoji') : 
                   cancelCount >= 1 ? t('cancelDialog.warning.emoji') : 
                   t('cancelDialog.emoji')}
                </div>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed mt-2 px-2">
                {cancelCount >= 4 ? (
                  <>
                    <strong className="text-red-600">ბოლო შესაძლებლობა! 🙏</strong>
                    <br /><br />
                    ეს იქნება თქვენი მე-5 გაუქმება დღეს. თუ გააუქმებთ ამ რეზერვაციას, მომდევნო რეზერვაცია შეძლებთ მხოლოდ ხვალ.
                    <br /><br />
                    💙 პარტნიორებს სჭირდებათ სტაბილურობა. მადლობა გაგებისთვის!
                  </>
                ) : cancelCount >= 3 ? (
                  <>
                    დღეს უკვე 3-ჯერ გააუქმეთ რეზერვაცია.
                    <br /><br />
                    შეგიძლიათ გააუქმოთ ეს რეზერვაციაც, თუმცა ამ შემთხვევაში დაგეკისრებათ შეზღუდვა, რომლის მოხსნა შესაძლებელი იქნება მხოლოდ 100 ქულის გამოყენებით.
                    <br /><br />
                    გთხოვთ, გააუქმოთ მხოლოდ მაშინ, თუ დარწმუნებული ხართ თქვენს გადაწყვეტილებაში 🙂
                    <br /><br />
                    💡 შეზღუდვა აისახება თქვენს ანგარიშზე დაუყოვნებლივ
                  </>
                ) : cancelCount >= 2 ? (
                  <>
                    {t('cancelDialog.critical.message1')}
                    <br /><br />
                    {t('cancelDialog.critical.message2')}
                  </>
                ) : cancelCount >= 1 ? (
                  <>
                    {t('cancelDialog.warning.message1')
                      .replace('{offerTitle}', reservation.offerTitle)
                      .replace('{partnerName}', reservation.partnerName)}
                    <br /><br />
                    {t('cancelDialog.warning.message2')}
                  </>
                ) : (
                  <>
                    {t('cancelDialog.message1')
                      .replace('{offerTitle}', reservation.offerTitle)
                      .replace('{partnerName}', reservation.partnerName)}
                    <br /><br />
                    {t('cancelDialog.message2')}
                  </>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 pt-3 flex flex-col gap-2.5">
              <motion.button
                onClick={() => setShowCancelDialog(false)}
                whileTap={{ scale: 0.98 }}
                className="w-full h-11 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-[15px] rounded-xl shadow-lg shadow-blue-500/25 transition-all"
              >
                {cancelCount >= 4 ? '🛡️ არ გავაუქმო' : 
                 cancelCount >= 3 ? '✨ შევინარჩუნო' : 
                 cancelCount >= 2 ? t('cancelDialog.critical.keepButton') : 
                 cancelCount >= 1 ? t('cancelDialog.warning.keepButton') : 
                 t('cancelDialog.keepButton')}
              </motion.button>
              <motion.button
                onClick={() => {
                  onCancel(reservation.id);
                  setShowCancelDialog(false);
                }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-10 bg-transparent hover:bg-gray-50 text-gray-500 font-medium text-[14px] rounded-xl transition-colors"
              >
                {cancelCount >= 2 ? t('cancelDialog.critical.cancelButton') : cancelCount >= 1 ? t('cancelDialog.warning.cancelButton') : t('cancelDialog.cancelButton')}
              </motion.button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}