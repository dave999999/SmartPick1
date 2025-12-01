/**
 * MiniBubble - Floating circular button when reservation is minimized
 * Glows gently to draw attention, always accessible
 */

import { motion } from 'framer-motion';
import { QrCode } from 'lucide-react';

interface MiniBubbleProps {
  isVisible: boolean;
  onClick: () => void;
  expiresAt: string;
}

export function MiniBubble({ isVisible, onClick, expiresAt }: MiniBubbleProps) {
  // Check if expiring soon (less than 5 minutes)
  const isExpiringSoon =
    new Date(expiresAt).getTime() - new Date().getTime() < 5 * 60 * 1000;

  if (!isVisible) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-20 right-3 sm:right-4 z-[100] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-2xl shadow-orange-500/50 flex items-center justify-center cursor-pointer safe-bottom"
      style={{
        boxShadow: isExpiringSoon
          ? '0 0 30px rgba(249, 115, 22, 0.8), 0 0 60px rgba(249, 115, 22, 0.4)'
          : '0 0 20px rgba(249, 115, 22, 0.6)',
      }}
    >
      {/* Pulse Animation */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`absolute inset-0 rounded-full ${
          isExpiringSoon ? 'bg-red-500' : 'bg-orange-500'
        }`}
      />

      {/* Icon */}
      <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-white relative z-10" />

      {/* Badge Counter (if expiring soon) */}
      {isExpiringSoon && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] sm:text-[10px] font-bold shadow-lg"
        >
          !
        </motion.div>
      )}
    </motion.button>
  );
}
