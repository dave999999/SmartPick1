import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Check, X, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export default function HapticTest() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [lastPattern, setLastPattern] = useState<string>('');

  const checkSupport = () => {
    const isSupported = 'vibrate' in navigator;
    setSupported(isSupported);
    return isSupported;
  };

  const testPattern = (pattern: number | number[], description: string) => {
    if (!checkSupport()) {
      alert('Vibration API not supported on this device');
      return;
    }
    
    try {
      navigator.vibrate(pattern);
      setLastPattern(description);
    } catch (error) {
      alert('Error triggering vibration: ' + error);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-6 h-6" />
            Haptic Feedback Test
          </CardTitle>
          <CardDescription>
            Test vibration patterns for QR scanner feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Support Check */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Device Support</h3>
            <Button onClick={checkSupport} variant="outline" className="w-full">
              Check Vibration Support
            </Button>
            {supported !== null && (
              <div className={`mt-2 p-3 rounded ${supported ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {supported ? (
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    <span>Vibration API is supported! ✅</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <X className="w-5 h-5" />
                    <span>Vibration API not supported ❌</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Patterns */}
          <div className="space-y-3">
            <h3 className="font-semibold">Test Patterns</h3>
            
            <Button 
              onClick={() => testPattern([100, 50, 100], 'Success Pattern (QR Scan)')}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Success Pattern (Double Vibrate)
            </Button>

            <Button 
              onClick={() => testPattern(300, 'Error Pattern')}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              Error Pattern (Long Vibrate)
            </Button>

            <Button 
              onClick={() => testPattern(200, 'Standard Pattern')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Standard Pattern (Single Vibrate)
            </Button>

            <Button 
              onClick={() => testPattern([50, 50, 50, 50, 50], 'Multiple Pulses')}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Multiple Short Pulses
            </Button>
          </div>

          {/* Last Pattern */}
          {lastPattern && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Last tested:</strong> {lastPattern}
              </p>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <h4 className="font-semibold text-yellow-900 mb-2">📱 Note:</h4>
            <ul className="space-y-1 text-yellow-800 text-xs">
              <li>• This must be tested on a real mobile device (not desktop)</li>
              <li>• Some browsers require HTTPS for vibration API</li>
              <li>• iOS Safari may have limited or no support</li>
              <li>• Android Chrome/Firefox typically work well</li>
              <li>• User must have vibration enabled in device settings</li>
            </ul>
          </div>

          {/* Patterns Used */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
            <h4 className="font-semibold mb-2">QR Scanner Patterns:</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <strong className="text-green-600">Success (QR Scan):</strong> [100, 50, 100]
                <br />
                <span className="text-gray-600">Vibrate 100ms, pause 50ms, vibrate 100ms</span>
              </li>
              <li>
                <strong className="text-red-600">Error:</strong> 300
                <br />
                <span className="text-gray-600">Single 300ms vibration</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
