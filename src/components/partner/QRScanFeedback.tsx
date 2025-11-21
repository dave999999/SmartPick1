import { Card, CardContent } from '@/components/ui/card';
import { useEffect } from 'react';

export default function QRScanFeedback({ result }: { result: string }) {
  // Trigger haptic feedback when result changes
  useEffect(() => {
    if ('vibrate' in navigator) {
      if (result === 'success') {
        // Success: double vibrate pattern (already handled in QRScanner)
        navigator.vibrate([100, 50, 100]);
      } else {
        // Error: single long vibrate
        navigator.vibrate(300);
      }
    }
  }, [result]);

  return (
    <Card className="mt-2">
      <CardContent>
        <div className={result === 'success' ? 'text-green-600' : 'text-red-600'}>
          {result === 'success' ? 'QR code validated successfully!' : 'Invalid QR code. Please try again.'}
        </div>
      </CardContent>
    </Card>
  );
}

