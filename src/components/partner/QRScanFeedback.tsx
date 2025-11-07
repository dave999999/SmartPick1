import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';

export default function QRScanFeedback({ result }: { result: string }) {
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
