/**
 * QR Scanner Dialog Component - Mobile-First, Zero Friction Design
 * Premium PWA experience optimized for bakery/grocery partners
 * 
 * Features:
 * - Auto-start camera (no manual button click)
 * - Clean, compact Georgian UI
 * - Segmented control toggle (QR Scanner / Manual Entry)
 * - Visual feedback on successful scan
 * - Large touch targets for messy hands
 */

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { validateQRCode } from '@/lib/api';
import QRScanner from '@/components/QRScanner';
import { motion, AnimatePresence } from 'framer-motion';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId?: string;
  onSuccess?: () => void;
}

export function QRScannerDialog({ open, onOpenChange, partnerId, onSuccess }: QRScannerDialogProps) {
  const [activeTab, setActiveTab] = useState<'scanner' | 'manual'>('scanner');
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const isProcessingRef = useRef(false);

  const handleValidateCode = async (code: string) => {
    if (isProcessingRef.current) {
      return;
    }

    const cleanCode = code.trim();
    if (!cleanCode) {
      toast.error('გთხოვთ შეიყვანოთ კოდი');
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    
    try {
      const result = await validateQRCode(cleanCode, true);

      if (result.valid && result.reservation) {
        setScanSuccess(true);
        toast.success('✅ აღება დადასტურდა!');
        
        // Close dialog faster to prevent phone overheating from camera
        setTimeout(() => {
          setManualCode('');
          setScanSuccess(false);
          onOpenChange(false);
          onSuccess?.();
        }, 800); // Reduced from 1200ms
      } else {
        toast.error(result.error || '❌ არასწორი კოდი');
      }
    } catch (error) {
      toast.error(`შეცდომა: ${error instanceof Error ? error.message : 'უცნობი შეცდომა'}`);
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 500);
    }
  };

  const handleManualSubmit = () => {
    handleValidateCode(manualCode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-[95vw] sm:max-w-md border-none bg-gradient-to-b from-white to-gray-50 rounded-3xl overflow-hidden shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>აღების დადასტურება - QR სკანერი</DialogTitle>
        </VisuallyHidden>
        
        {/* Header with Close Button */}
        <div className="relative px-4 py-3 bg-white border-b border-gray-100">
          <h2 className="text-center text-lg font-bold text-gray-900">
            აღების დადასტურება
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="დახურვა"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Segmented Control Toggle */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'scanner'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📷 QR სკანერი
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'manual'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⌨️ კოდის შეყვანა
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-3 pb-4">
          <AnimatePresence mode="wait">
            {activeTab === 'scanner' ? (
              <motion.div
                key="scanner"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* Camera Viewport with Frame Overlay */}
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-h-[70vh]">
                  <QRScanner
                    onScan={(code) => handleValidateCode(code)}
                    onError={(error) => toast.error(`კამერა: ${error}`)}
                  />
                  
                  {/* Scanning Frame Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-8 border-2 border-white/30 rounded-2xl">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl" />
                    </div>
                  </div>

                  {/* Success Overlay */}
                  <AnimatePresence>
                    {scanSuccess && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-emerald-500/90 flex items-center justify-center"
                      >
                        <div className="text-center text-white">
                          <CheckCircle2 className="w-20 h-20 mx-auto mb-3" />
                          <p className="text-xl font-bold">წარმატებულია!</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Processing Indicator */}
                  {isProcessing && !scanSuccess && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium text-gray-800">დამუშავება...</span>
                    </div>
                  )}
                </div>

                <p className="text-center text-xs text-gray-500">
                  მიმართეთ კამერა მომხმარებლის QR კოდს
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="manual"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 pt-2"
              >
                {/* Large Manual Input Field */}
                <div className="space-y-3">
                  <Input
                    placeholder="SP-2024-XY7K9"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                    className="text-center text-lg py-6 rounded-2xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 font-mono tracking-wider"
                    disabled={isProcessing}
                    autoFocus
                  />
                  
                  <Button
                    onClick={handleManualSubmit}
                    disabled={isProcessing || !manualCode.trim()}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 rounded-2xl font-semibold text-base shadow-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        დამუშავება...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        დადასტურება
                      </>
                    )}
                  </Button>
                </div>

                {/* Success/Error State */}
                <AnimatePresence>
                  {scanSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3"
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      <span className="text-emerald-800 font-medium">აღება დადასტურდა!</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-center text-xs text-gray-500">
                  შეიყვანეთ კოდი რეზერვაციის დამადასტურებლად
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
