/**
 * QRModal - Full-screen QR code preview
 * 
 * Triggers on single tap of QR in ActiveReservationCard
 * Displays large QR with reservation details
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrPayload: string;
  offerTitle: string;
  partnerName: string;
  expiresIn: string;
  quantity: number;
}

export function QRModal({
  isOpen,
  onClose,
  qrPayload,
  offerTitle,
  partnerName,
  expiresIn,
  quantity,
}: QRModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-[6px]"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[90vw] max-w-[340px] bg-white/75 backdrop-blur-[28px] border border-white/40 rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden"
          >
            {/* Header - Compact Green Theme */}
            <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-400 px-4 py-3">
              <button
                onClick={onClose}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm flex items-center justify-center transition-all"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              <div className="text-white pr-8">
                <h2 className="text-base font-semibold mb-0.5 leading-tight">Show at Pickup</h2>
                <p className="text-[11px] text-emerald-50/90 leading-tight">Present this code to staff</p>
              </div>
            </div>

            {/* QR Code - Compact Size */}
            <div className="flex flex-col items-center px-3 py-3">
              <div className="bg-white/90 rounded-xl p-3 shadow-md border border-white/60">
                <QRCodeSVG
                  value={qrPayload}
                  size={typeof window !== 'undefined' && window.innerWidth < 380 ? 160 : 200}
                  level="H"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Timer Section */}
            <div className="px-3 pb-2 text-center">
              <p className="text-[11px] text-gray-500 mb-1 flex items-center justify-center gap-1">
                <span className="text-purple-500">⏱</span> Time remaining
              </p>
              <p className="text-3xl font-bold text-emerald-500 font-mono tracking-tight leading-none mb-1">
                {expiresIn}
              </p>
              <p className="text-xs font-semibold text-gray-700 flex items-center justify-center gap-1">
                <span>🎉</span> Ready to pick up!
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Show this QR code to the partner staff
              </p>
            </div>

            {/* QR Payload with Copy - Compact */}
            <div className="px-3 py-2">
              <div 
                onClick={handleCopy}
                className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/80 transition-all group border border-white/50"
              >
                <code className="text-xs font-mono font-semibold text-gray-700 tracking-wide truncate">
                  {qrPayload}
                </code>
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600 ml-2 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors ml-2 flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Reservation Details - Compact */}
            <div className="px-3 pb-3 space-y-2">
              <div className="bg-white/60 rounded-lg p-2.5 border border-white/50 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{offerTitle}</p>
                    <p className="text-[10px] text-gray-600 truncate leading-tight mt-0.5">{partnerName}</p>
                  </div>
                  <div className="bg-white/90 px-2 py-1 rounded-full border border-emerald-200 flex-shrink-0">
                    <span className="text-xs font-bold text-gray-900">{quantity}</span>
                    <span className="text-[10px] text-gray-500 ml-0.5">item{quantity > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {/* Pro Tip - Compact */}
              <div className="bg-gradient-to-r from-blue-50/80 to-blue-100/60 rounded-lg px-3 py-2 border border-blue-200/50">
                <p className="text-[10px] text-center text-gray-600 leading-snug">
                  <span className="font-semibold text-gray-700">💡 Pro Tip:</span> Screenshot this code for backup
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
