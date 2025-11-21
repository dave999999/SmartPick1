import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Cookie, X, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface CookiePreferences {
  necessary: boolean; // Always true, can't be disabled
  analytics: boolean;
  marketing: boolean;
}

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const savedConsent = localStorage.getItem('cookieConsent');
    if (!savedConsent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setIsVisible(true), 1000);
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(savedConsent);
        setPreferences(saved);
        applyPreferences(saved);
      } catch (e) {
        console.error('Failed to parse cookie preferences', e);
      }
    }
  }, []);

  const applyPreferences = (prefs: CookiePreferences) => {
    // Apply analytics cookies if enabled
    if (prefs.analytics) {
      // Enable Google Analytics, Vercel Analytics, etc.
      console.log('Analytics cookies enabled');
      // Example: gtag('consent', 'update', { analytics_storage: 'granted' });
    } else {
      console.log('Analytics cookies disabled');
      // Example: gtag('consent', 'update', { analytics_storage: 'denied' });
    }

    // Apply marketing cookies if enabled
    if (prefs.marketing) {
      console.log('Marketing cookies enabled');
      // Example: Enable marketing tracking pixels
    } else {
      console.log('Marketing cookies disabled');
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    savePreferences(onlyNecessary);
  };

  const handleSaveCustom = () => {
    savePreferences(preferences);
    setShowSettings(false);
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookieConsent', JSON.stringify(prefs));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setPreferences(prefs);
    applyPreferences(prefs);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5 duration-500">
        <Card className="max-w-4xl mx-auto shadow-2xl border-2 border-teal-100">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="hidden sm:block p-3 bg-teal-100 rounded-lg flex-shrink-0">
                <Cookie className="h-6 w-6 text-teal-700" />
              </div>

              {/* Content */}
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    We value your privacy
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => setIsVisible(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed">
                  We use cookies to enhance your browsing experience, analyze site traffic, and personalize content.
                  By clicking "Accept All", you consent to our use of cookies. You can manage your preferences or learn more in our{' '}
                  <Link to="/privacy#cookies" className="text-teal-600 hover:text-teal-700 underline font-medium">
                    Privacy Policy
                  </Link>
                  .
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={handleAcceptAll}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Accept All
                  </Button>
                  <Button
                    onClick={handleRejectAll}
                    variant="outline"
                    className="border-gray-300"
                  >
                    Reject All
                  </Button>
                  <Button
                    onClick={() => setShowSettings(true)}
                    variant="outline"
                    className="border-gray-300"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Customize
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Cookie className="h-5 w-5 text-teal-600" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Choose which cookies you want to allow. You can change these settings at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Necessary Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <Label className="text-base font-semibold text-gray-900">
                    Necessary Cookies
                  </Label>
                  <p className="text-sm text-gray-600">
                    These cookies are essential for the website to function properly. They enable basic features like page navigation and access to secure areas. The website cannot function properly without these cookies.
                  </p>
                  <div className="pt-2 space-y-1">
                    <p className="text-xs text-gray-500"><strong>Examples:</strong></p>
                    <p className="text-xs text-gray-500">• Authentication tokens</p>
                    <p className="text-xs text-gray-500">• Session management</p>
                    <p className="text-xs text-gray-500">• Security features</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.necessary}
                  disabled
                  className="ml-4"
                />
              </div>
            </div>

            <Separator />

            {/* Analytics Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="analytics" className="text-base font-semibold text-gray-900">
                    Analytics Cookies
                  </Label>
                  <p className="text-sm text-gray-600">
                    These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve the user experience.
                  </p>
                  <div className="pt-2 space-y-1">
                    <p className="text-xs text-gray-500"><strong>Examples:</strong></p>
                    <p className="text-xs text-gray-500">• Page views and traffic sources</p>
                    <p className="text-xs text-gray-500">• User behavior patterns</p>
                    <p className="text-xs text-gray-500">• Performance monitoring</p>
                  </div>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked })
                  }
                  className="ml-4"
                />
              </div>
            </div>

            <Separator />

            {/* Marketing Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="marketing" className="text-base font-semibold text-gray-900">
                    Marketing Cookies
                  </Label>
                  <p className="text-sm text-gray-600">
                    These cookies are used to track visitors across websites to display relevant advertisements and promotional content that may be of interest to you.
                  </p>
                  <div className="pt-2 space-y-1">
                    <p className="text-xs text-gray-500"><strong>Examples:</strong></p>
                    <p className="text-xs text-gray-500">• Targeted advertising</p>
                    <p className="text-xs text-gray-500">• Social media integration</p>
                    <p className="text-xs text-gray-500">• Campaign tracking</p>
                  </div>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketing: checked })
                  }
                  className="ml-4"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleSaveCustom}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              Save Preferences
            </Button>
            <Button
              onClick={handleAcceptAll}
              variant="outline"
              className="flex-1"
            >
              Accept All
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center pt-2">
            For more information, please read our{' '}
            <Link to="/privacy" className="text-teal-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export function to allow users to open cookie settings from anywhere
export const openCookieSettings = () => {
  // Dispatch custom event to open settings
  window.dispatchEvent(new CustomEvent('openCookieSettings'));
};
