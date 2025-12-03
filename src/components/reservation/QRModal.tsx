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
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-orange-500 to-orange-400 p-6 pb-8">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <div className="text-white">
                <h2 className="text-2xl font-bold mb-1">Show at Pickup</h2>
                <p className="text-sm text-orange-100">Present this code to staff</p>
              </div>
            </div>

            {/* QR Code */}
            <div className="px-6 -mt-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border-4 border-white">
                <QRCodeSVG
                  value={qrPayload}
                  size={240}
                  level="H"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* QR Payload with Copy */}
            <div className="px-6 py-4">
              <div 
                onClick={handleCopy}
                className="flex items-center justify-between bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-all group"
              >
                <code className="text-lg font-mono font-bold text-gray-900 tracking-wider">
                  {qrPayload}
                </code>
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                )}
              </div>
            </div>

            {/* Reservation Details */}
            <div className="px-6 pb-6 space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{offerTitle}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{partnerName}</p>
                  </div>
                  <div className="bg-white px-3 py-1 rounded-full">
                    <span className="text-sm font-bold text-gray-900">{quantity}</span>
                    <span className="text-xs text-gray-500 ml-1">item{quantity > 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Expires in</span>
                  <span className="text-sm font-bold font-mono text-green-600">{expiresIn}</span>
                </div>
              </div>

              <p className="text-xs text-center text-gray-400">
                Do not share this code • Valid for one-time pickup only
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
