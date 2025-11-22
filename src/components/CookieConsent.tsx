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
      {/* Cookie Banner - Elegant Modern Design */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom-5 duration-700">
        <div className="max-w-5xl mx-auto">
          <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-teal-200/50 dark:border-teal-800/50 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden">
            {/* Decorative gradient line */}
            <div className="h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-green-400" />

            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Icon with gradient background */}
                <div className="hidden sm:flex p-4 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-emerald-950/50 rounded-2xl flex-shrink-0 shadow-inner">
                  <Cookie className="h-8 w-8 text-teal-600 dark:text-teal-400" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                        🍪 We value your privacy
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
                        We use cookies to enhance your browsing experience, analyze site traffic, and personalize content.
                        By clicking <span className="font-semibold text-teal-600 dark:text-teal-400">"Accept All"</span>, you consent to our use of cookies.{' '}
                        <Link
                          to="/privacy#cookies"
                          className="inline-flex items-center text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium underline decoration-teal-300 underline-offset-4 transition-colors"
                        >
                          Learn more
                        </Link>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => setIsVisible(false)}
                    >
                      <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </Button>
                  </div>

                  {/* Action Buttons - Modern gradient design */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      onClick={handleAcceptAll}
                      className="relative overflow-hidden bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all duration-300 rounded-xl font-semibold px-6"
                    >
                      <span className="relative z-10">Accept All</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                    </Button>
                    <Button
                      onClick={handleRejectAll}
                      variant="outline"
                      className="border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-semibold px-6 transition-all duration-300"
                    >
                      Reject All
                    </Button>
                    <Button
                      onClick={() => setShowSettings(true)}
                      variant="outline"
                      className="border-2 border-teal-200 dark:border-teal-800 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-teal-600 dark:text-teal-400 rounded-xl font-semibold px-6 transition-all duration-300 group"
                    >
                      <Settings className="mr-2 h-4 w-4 group-hover:rotate-45 transition-transform duration-300" />
                      Customize
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Dialog - Elegant Design */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-teal-200/50 dark:border-teal-800/50">
          {/* Decorative gradient header */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-green-400" />

          <DialogHeader className="space-y-4 pt-2">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-emerald-950/50 rounded-xl">
                <Cookie className="h-6 w-6 text-teal-600 dark:text-teal-400" strokeWidth={2} />
              </div>
              <span className="bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent font-bold">
                Cookie Preferences
              </span>
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 dark:text-gray-300">
              Choose which cookies you want to allow. You can change these settings at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Necessary Cookies */}
            <div className="p-6 rounded-2xl border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded-lg">
                      <span className="text-xs font-bold text-green-700 dark:text-green-300">ALWAYS ACTIVE</span>
                    </div>
                  </div>
                  <Label className="text-lg font-bold text-gray-900 dark:text-white">
                    ✅ Necessary Cookies
                  </Label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    These cookies are essential for the website to function properly. They enable basic features like page navigation and access to secure areas.
                  </p>
                  <div className="pt-2 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <p className="font-semibold">Examples:</p>
                    <p>• Authentication & session management</p>
                    <p>• Security features & CSRF protection</p>
                    <p>• User preferences & settings</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.necessary}
                  disabled
                  className="ml-4 data-[state=checked]:bg-green-500"
                />
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
              preferences.analytics
                ? 'border-teal-300 dark:border-teal-700 bg-gradient-to-br from-teal-50/50 to-cyan-50/50 dark:from-teal-950/20 dark:to-cyan-950/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <Label htmlFor="analytics" className="text-lg font-bold text-gray-900 dark:text-white cursor-pointer">
                    📊 Analytics Cookies
                  </Label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    These cookies help us understand how visitors interact with our website by collecting anonymous data. This helps us improve the user experience.
                  </p>
                  <div className="pt-2 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <p className="font-semibold">Examples:</p>
                    <p>• Page views & traffic analysis</p>
                    <p>• User behavior patterns</p>
                    <p>• Performance metrics (Core Web Vitals)</p>
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

            {/* Marketing Cookies */}
            <div className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
              preferences.marketing
                ? 'border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <Label htmlFor="marketing" className="text-lg font-bold text-gray-900 dark:text-white cursor-pointer">
                    🎯 Marketing Cookies
                  </Label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    These cookies track visitors across websites to display relevant advertisements and promotional content.
                  </p>
                  <div className="pt-2 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <p className="font-semibold">Examples:</p>
                    <p>• Personalized advertising</p>
                    <p>• Social media integration</p>
                    <p>• Campaign performance tracking</p>
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

          <Separator className="my-4" />

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleSaveCustom}
              className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-lg shadow-teal-500/30 rounded-xl font-semibold text-base h-12"
            >
              💾 Save Preferences
            </Button>
            <Button
              onClick={handleAcceptAll}
              variant="outline"
              className="flex-1 border-2 border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/30 rounded-xl font-semibold text-base h-12"
            >
              Accept All
            </Button>
          </div>

          <p className="text-sm text-center text-gray-500 dark:text-gray-400 pt-4 pb-2">
            For more information, please read our{' '}
            <Link to="/privacy" className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium underline decoration-teal-300 underline-offset-4">
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
