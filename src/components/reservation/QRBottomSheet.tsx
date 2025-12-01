/**
 * QRBottomSheet - Elegant bottom sheet with QR code
 * 3 states: mini (bubble), half (QR), full (all details)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { QrCode, X, Clock, MapPin, AlertCircle, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Reservation } from '@/lib/types';
import QRCodeStyling from 'qr-code-styling';
import { toast } from 'sonner';

interface QRBottomSheetProps {
  isOpen: boolean;
  reservation: Reservation | null;
  onClose: () => void;
  onMinimize: () => void;
  onCancel: () => void;
  canCancel?: boolean;
}

type SheetState = 'mini' | 'half' | 'full';

export function QRBottomSheet({
  isOpen,
  reservation,
  onClose,
  onMinimize,
  onCancel,
  canCancel = true,
}: QRBottomSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>('half');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Generate QR code
  useEffect(() => {
    if (!reservation?.qr_code) return;

    const qrCode = new QRCodeStyling({
      width: 280,
      height: 280,
      data: reservation.qr_code,
      margin: 10,
      qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'H' },
      imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 8 },
      dotsOptions: {
        color: '#FF7A00',
        type: 'extra-rounded',
      },
      backgroundOptions: { color: '#ffffff' },
      cornersSquareOptions: { color: '#DC2626', type: 'extra-rounded' },
      cornersDotOptions: { color: '#F97316', type: 'dot' },
    });

    qrCode.getRawData('png').then((blob) => {
      if (blob && blob instanceof Blob) {
        const url = URL.createObjectURL(blob);
        setQrDataUrl(url);
      }
    });

    return () => {
      if (qrDataUrl) URL.revokeObjectURL(qrDataUrl);
    };
  }, [reservation?.qr_code]);

  // Timer
  useEffect(() => {
    if (!reservation) return;

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(reservation.expires_at);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [reservation]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 500 || offset > 150) {
      // Swipe down
      if (sheetState === 'full') setSheetState('half');
      else if (sheetState === 'half') onMinimize();
    } else if (velocity < -500 || offset < -150) {
      // Swipe up
      if (sheetState === 'half') setSheetState('full');
    }
  };

  const getSheetHeight = () => {
    switch (sheetState) {
      case 'mini':
        return '0%';
      case 'half':
        return '55%';
      case 'full':
        return '85%';
    }
  };

  const handleCancelReservation = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    onCancel();
    setShowCancelConfirm(false);
    toast.success('Reservation cancelled. Quantity restored to partner.');
  };

  if (!reservation) return null;

  const isExpiringSoon =
    timeRemaining !== 'Expired' &&
    new Date(reservation.expires_at).getTime() - new Date().getTime() < 5 * 60 * 1000;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: sheetState === 'full' ? 0.5 : 0 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheetState('half')}
            className="fixed inset-0 bg-black z-[110]"
          />

          {/* Bottom Sheet */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: `calc(100% - ${getSheetHeight()})` }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[120] bg-white rounded-t-[28px] shadow-2xl"
            style={{ height: '100vh' }}
          >
            {/* Drag Handle */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full cursor-grab active:cursor-grabbing" />

            {/* Header */}
            <div className="pt-8 px-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <QrCode className="w-6 h-6 text-orange-500" />
                  Your QR Code
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMinimize}
                    className="h-9 w-9 rounded-full hover:bg-gray-100"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-9 w-9 rounded-full hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Show this QR code to the bakery staff to claim your reserved offer ❤️
              </p>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-6 pb-8" style={{ height: 'calc(100% - 120px)' }}>
              <div className="space-y-4 pt-6">
                {/* QR Code */}
                <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                  <div className="bg-white rounded-xl p-4 shadow-inner flex items-center justify-center">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR Code" className="w-[280px] h-[280px]" />
                    ) : (
                      <div className="w-[280px] h-[280px] bg-gray-100 rounded-xl animate-pulse" />
                    )}
                  </div>
                  <p className="text-center mt-4 text-xs font-mono text-gray-500 tracking-wider">
                    {reservation.qr_code}
                  </p>
                </div>

                {/* Reservation Details */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-200 space-y-3">
                  <h3 className="font-bold text-gray-900 text-lg">
                    {reservation.offer?.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-orange-600">
                      {reservation.quantity} {reservation.quantity > 1 ? 'items' : 'item'}
                    </span>{' '}
                    reserved at{' '}
                    <span className="font-semibold">{reservation.partner?.business_name}</span>
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Pickup Time */}
                    <div className="bg-white rounded-xl p-3 border border-blue-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-semibold text-blue-900 uppercase">
                          Pickup Window
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-900">
                        {new Date(reservation.offer?.pickup_start || '').toLocaleTimeString(
                          'en-US',
                          { hour: 'numeric', minute: '2-digit' }
                        )}
                        {' - '}
                        {new Date(reservation.offer?.pickup_end || '').toLocaleTimeString(
                          'en-US',
                          { hour: 'numeric', minute: '2-digit' }
                        )}
                      </p>
                    </div>

                    {/* Location */}
                    <div className="bg-white rounded-xl p-3 border border-green-100">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="text-[10px] font-semibold text-green-900 uppercase">
                          Location
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-900 line-clamp-2">
                        {reservation.partner?.address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timer Warning */}
                <Alert
                  className={`border-2 ${
                    isExpiringSoon
                      ? 'bg-orange-50 border-orange-300'
                      : 'bg-purple-50 border-purple-300'
                  }`}
                >
                  <AlertCircle
                    className={`h-4 w-4 ${isExpiringSoon ? 'text-orange-600' : 'text-purple-600'}`}
                  />
                  <AlertDescription
                    className={`font-semibold ${
                      isExpiringSoon ? 'text-orange-900' : 'text-purple-900'
                    }`}
                  >
                    Reservation expires in:{' '}
                    <span className="text-lg tabular-nums">{timeRemaining}</span>
                  </AlertDescription>
                </Alert>

                {/* Instructions */}
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-4 border border-cyan-200">
                  <h4 className="font-bold text-cyan-900 mb-2 text-sm">📱 How to Use:</h4>
                  <ol className="text-xs text-cyan-800 space-y-1 list-decimal list-inside">
                    <li>Arrive during the pickup window</li>
                    <li>Show this QR code to the staff</li>
                    <li>They'll scan it and give you your reserved items</li>
                    <li>Enjoy your SmartPick! 🎉</li>
                  </ol>
                </div>

                {/* Cancel Button */}
                {canCancel && !showCancelConfirm && (
                  <Button
                    variant="outline"
                    onClick={handleCancelReservation}
                    className="w-full border-2 border-red-300 text-red-600 hover:bg-red-50 rounded-xl h-11 font-semibold"
                  >
                    Cancel Reservation
                  </Button>
                )}

                {/* Cancel Confirmation */}
                {showCancelConfirm && (
                  <div className="bg-red-50 rounded-2xl p-4 border-2 border-red-300 space-y-3">
                    <p className="text-sm font-semibold text-red-900">
                      ⚠️ Are you sure? You will lose your SmartPoints as penalty.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCancelConfirm(false)}
                        className="border-gray-300"
                      >
                        Keep It
                      </Button>
                      <Button
                        onClick={confirmCancel}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Yes, Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Friendly Footer */}
                <p className="text-center text-xs text-gray-500 font-medium pt-2">
                  We'll guide you there — safe trip! 🚶‍♂️✨
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
