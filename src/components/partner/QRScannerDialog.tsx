/**
 * QR Scanner Dialog Component
 * Extracted from PartnerDashboard - handles QR code validation for pickups
 */

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, QrCode, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { validateQRCode } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import QRScanner from '@/components/QRScanner';
import QRScanFeedback from './QRScanFeedback';

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QRScannerDialog({ open, onOpenChange, onSuccess }: QRScannerDialogProps) {
  const { t } = useI18n();
  const [qrInput, setQrInput] = useState('');
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [lastQrResult, setLastQrResult] = useState<'success' | 'error' | null>(null);
  const isProcessingQRRef = useRef(false);

  const handleValidateQR = async () => {
    if (!qrInput.trim()) {
      toast.error('Please enter a QR code');
      return;
    }

    setIsProcessingQR(true);
    try {
      const result = await validateQRCode(qrInput, true);
      if (result.valid && result.reservation) {
        setQrInput('');
        onOpenChange(false);
        toast.success(t('partner.dashboard.toast.pickupConfirmed'));
        setLastQrResult('success');
        onSuccess();
      } else {
        toast.error(result.error || 'Invalid QR code');
        setLastQrResult('error');
      }
    } catch (error) {
      toast.error(`Failed to validate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLastQrResult('error');
    } finally {
      setIsProcessingQR(false);
    }
  };

  const handleScan = async (code: string) => {
    // Prevent race conditions with synchronous check
    if (isProcessingQRRef.current) {
      toast.info('Please wait, processing previous scan...');
      return;
    }

    // Set ref immediately to block other scans
    isProcessingQRRef.current = true;
    setIsProcessingQR(true);
    
    try {
      const cleanCode = code.trim();
      setQrInput(cleanCode);

      // Automatically validate and mark as picked up
      const result = await validateQRCode(cleanCode, true);

      if (result.valid && result.reservation) {
        setQrInput('');
        onOpenChange(false);
        toast.success(t('partner.dashboard.toast.pickupConfirmed'));
        setLastQrResult('success');
        onSuccess();
      } else {
        toast.error(result.error || 'Invalid QR code');
        setLastQrResult('error');
      }
    } catch (error) {
      toast.error(`Failed to validate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLastQrResult('error');
    } finally {
      // Reset processing flag after brief delay
      setTimeout(() => {
        isProcessingQRRef.current = false;
        setIsProcessingQR(false);
      }, 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-transparent bg-clip-text">
            📱 {t('partner.dashboard.qr.validateTitle')}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t('partner.dashboard.qr.descriptionPartner')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="camera" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100">
            <TabsTrigger value="camera" aria-label={t('partner.dashboard.qr.aria.camera')} className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              {t('partner.dashboard.qr.tab.camera')}
            </TabsTrigger>
            <TabsTrigger value="manual" aria-label={t('partner.dashboard.qr.aria.manual')} className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              {t('partner.dashboard.qr.tab.manual')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4 mt-4">
            {isProcessingQR && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-700 font-medium">Processing QR code...</span>
              </div>
            )}
            <QRScanner
              onScan={handleScan}
              onError={(error) => {
                toast.error(error);
              }}
            />
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-4">
              <Input
                aria-label="Enter QR code manually"
                placeholder="SP-2024-XY7K9"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleValidateQR()}
                className="text-base py-6 rounded-xl border-[#DFF5ED] focus:border-[#00C896] focus:ring-[#00C896] font-mono"
              />
              <Button
                aria-label={t('partner.dashboard.qr.validateAction')}
                onClick={handleValidateQR}
                disabled={isProcessingQR}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-6 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {t('partner.dashboard.qr.validateAction')}
              </Button>
              {lastQrResult && <QRScanFeedback result={lastQrResult} />}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
