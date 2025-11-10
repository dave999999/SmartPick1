import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Share, Plus } from 'lucide-react';

export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Check if already installed (in standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
    setIsInStandaloneMode(isStandalone);

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('ios-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Show prompt after 5 seconds if iOS and not installed
    if (isIOSDevice && !isStandalone) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-install-dismissed', Date.now().toString());
  };

  // Don't show if not iOS, already installed, or dismissed
  if (!isIOS || isInStandaloneMode || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom duration-300">
      <Card className="shadow-2xl border-2 border-[#4CC9A8] bg-white">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#4CC9A8] to-[#3db891] rounded-lg flex items-center justify-center">
              <img src="/icon-192.png" alt="SmartPick" className="w-10 h-10 rounded-lg" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">
                Install SmartPick App
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Install our app for faster access and notifications!
              </p>

              <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  How to install on iPhone:
                </p>

                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                    1
                  </span>
                  <div className="flex-1">
                    <span>Tap the </span>
                    <Share className="inline w-4 h-4 mx-1" />
                    <span className="font-semibold">Share</span>
                    <span> button below</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                    2
                  </span>
                  <div className="flex-1">
                    <span>Select </span>
                    <span className="font-semibold">"Add to Home Screen"</span>
                    <Plus className="inline w-4 h-4 mx-1" />
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                    3
                  </span>
                  <div className="flex-1">
                    <span>Tap </span>
                    <span className="font-semibold">"Add"</span>
                    <span> in the top right</span>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                className="w-full"
              >
                Got it, thanks!
              </Button>
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

