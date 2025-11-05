import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);

  useEffect(() => {
    // Get available cameras on mount
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
        } else {
          setError('No cameras found on this device');
        }
      })
      .catch((err) => {
        console.error('Error getting cameras:', err);
        setError('Unable to access camera');
      });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!cameras.length) {
      setError('No cameras available');
      return;
    }

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // Use back camera if available
        {
          fps: 10, // Frames per second
          qrbox: { width: 250, height: 250 }, // Scanning box size
        },
        (decodedText) => {
          // Success callback
          console.log('QR Code scanned:', decodedText);
          onScan(decodedText);
          stopScanning(); // Stop after successful scan
        },
        (errorMessage) => {
          // Error callback (called continuously while scanning)
          // We don't want to show these continuous scan errors
        }
      );

      setIsScanning(true);
      setError(null);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(err.message || 'Failed to start camera');
      onError?.(err.message || 'Failed to start camera');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Scanner Container */}
      <div className="relative rounded-lg overflow-hidden bg-black">
        <div id="qr-reader" className="w-full"></div>

        {!isScanning && (
          <div className="aspect-video flex items-center justify-center bg-gray-100">
            <div className="text-center p-6">
              <CameraOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Camera not active</p>
              <p className="text-sm text-gray-500 mt-2">
                Click "Start Camera" to begin scanning
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

      {/* Controls */}
      <div className="flex gap-3">
        {!isScanning ? (
          <Button
            onClick={startScanning}
            disabled={!cameras.length}
            className="flex-1 bg-[#00C896] hover:bg-[#00B588]"
          >
            <Camera className="w-4 h-4 mr-2" />
            Start Camera
          </Button>
        ) : (
          <Button
            onClick={stopScanning}
            variant="destructive"
            className="flex-1"
          >
            <CameraOff className="w-4 h-4 mr-2" />
            Stop Camera
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 space-y-2">
        <p className="font-semibold">Instructions:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Click "Start Camera" to activate your device camera</li>
          <li>Point the camera at the customer's QR code</li>
          <li>Hold steady until the code is recognized</li>
          <li>The camera will stop automatically after scanning</li>
        </ol>
      </div>
    </div>
  );
}
