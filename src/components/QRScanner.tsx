import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import type { Html5Qrcode } from 'html5-qrcode';

interface CameraDevice {
  id: string;
  label: string;
}

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const hasScannedRef = useRef(false); // Prevent multiple scans
  const autoStartAttemptedRef = useRef(false); // Prevent multiple auto-start attempts

  const startScanning = async () => {
    if (!cameras.length) {
      setError('No cameras available');
      return;
    }

    try {
      setError(null);
      setPermissionDenied(false);
      
      // Stop any existing scanner first
      if (scannerRef.current) {
        logger.log('⚠️ Stopping existing scanner before starting new one');
        await stopScanning();
      }

      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      logger.log('📷 Initializing scanner...');

      await scanner.start(
        { facingMode: 'environment' }, // Use back camera if available
        {
          fps: 30, // Increased FPS for better detection on mobile
          qrbox: function(viewfinderWidth, viewfinderHeight) {
            // Responsive qrbox size - 70% of the smaller dimension
            const minEdgePercentage = 0.7;
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return {
              width: qrboxSize,
              height: qrboxSize
            };
          },
          aspectRatio: 1.0, // Square scanning box
          disableFlip: false, // Allow flipped QR codes
        },
        (decodedText) => {
          // Success callback - only process first scan
          if (hasScannedRef.current) {
            logger.log('✋ Already processed a scan, ignoring duplicate');
            return;
          }
          
          // Set flag IMMEDIATELY to block any further scans
          hasScannedRef.current = true;
          logger.log('✅ QR Code detected and scanned:', decodedText);
          
          // Stop scanner IMMEDIATELY to prevent duplicate scans
          stopScanning();
          
          // Haptic feedback on mobile - success pattern (double vibrate)
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]); // Success pattern: vibrate-pause-vibrate
          }
          
          // Visual feedback
          const readerElement = document.getElementById('qr-reader');
          if (readerElement) {
            readerElement.style.border = '4px solid #00ff00';
            setTimeout(() => {
              readerElement.style.border = '';
            }, 1000);
          }
          
          // Call the onScan callback after a brief delay to ensure scanner has stopped
          setTimeout(() => {
            try {
              onScan(decodedText);
              logger.log('📤 Sent QR code to onScan callback');
            } catch (e) {
              logger.error('❌ Error in onScan callback:', e);
            }
          }, 100);
        },
        (_errorMessage) => {
          // Error callback (called continuously while scanning)
          // We don't want to show these continuous scan errors
        }
      );

      setIsScanning(true);
      setError(null);
      logger.log('📷 Camera started successfully');
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
      logger.error('❌ Error starting scanner:', err);
      
      // Check if permission was denied
      if (err.name === 'NotAllowedError' || errorMessage.includes('Permission denied') || errorMessage.includes('permission')) {
        setPermissionDenied(true);
        setError('📸 Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else {
        setError(errorMessage);
      }
      
      onError?.(errorMessage);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        if (isScanning) {
          await scannerRef.current.stop();
          logger.log('🛑 Scanner stopped');
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        logger.error('❌ Error stopping scanner:', err);
      }
      setIsScanning(false);
      // DON'T reset hasScannedRef here - keep it true to prevent rescans
      // It will be reset when dialog is closed and reopened
    }
  };

  // Get available cameras and auto-start on mount
  useEffect(() => {
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          
          // Auto-start camera if not already attempted
          if (!autoStartAttemptedRef.current) {
            autoStartAttemptedRef.current = true;
            logger.log('🚀 Auto-starting camera...');
            setTimeout(() => startScanning(), 500); // Small delay to ensure DOM is ready
          }
        } else {
          setError('No cameras found on this device');
        }
      } catch (err) {
        logger.error('Error getting cameras:', err);
        setError('Unable to access camera');
      }
    })();

    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Reset scan flag when scanner is mounted (dialog opens)
  useEffect(() => {
    hasScannedRef.current = false;
    logger.log('🔄 QR Scanner mounted, reset scan flag');
  }, []);

  return (
    <div className="space-y-4">
      {/* Scanner Container */}
      <div className="relative rounded-lg overflow-hidden bg-black">
        <div id="qr-reader" className="w-full"></div>

        {!isScanning && (
          <div className="aspect-video flex items-center justify-center bg-gray-100">
            <div className="text-center p-6">
              <CameraOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {permissionDenied ? 'Camera Permission Needed' : 'Camera Starting...'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {permissionDenied 
                  ? 'Please allow camera access in your browser and refresh' 
                  : 'Please wait while we initialize the camera'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls - Only show manual start button if permission denied or error */}
      {(permissionDenied || (error && !isScanning)) && (
        <div className="flex gap-3">
          <Button
            onClick={startScanning}
            disabled={!cameras.length}
            className="flex-1 bg-[#00C896] hover:bg-[#00B588]"
          >
            <Camera className="w-4 h-4 mr-2" />
            {permissionDenied ? 'Request Camera Access' : 'Retry Camera'}
          </Button>
        </div>
      )}

      {/* Stop button when scanning */}
      {isScanning && (
        <div className="flex gap-3">
          <Button
            onClick={stopScanning}
            variant="outline"
            className="flex-1"
          >
            <CameraOff className="w-4 h-4 mr-2" />
            Stop Camera
          </Button>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 space-y-2">
        <p className="font-semibold">Instructions:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Click "Start Camera" to activate your device camera</li>
          <li>Point the camera at the customer's QR code (starts with "SP-")</li>
          <li>Hold steady and ensure good lighting</li>
          <li>Keep the QR code within the scanning square</li>
          <li>The camera will stop automatically after scanning</li>
        </ol>
        
        {isScanning && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-900">📷 Scanner Active</p>
            <p className="text-xs text-blue-700 mt-1">Looking for QR codes (format: SP-XXXX-XXXXX)</p>
          </div>
        )}
      </div>
    </div>
  );
}

