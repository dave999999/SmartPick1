import { useState, useEffect } from 'react';

export default function SplashScreen() {
  // Show splash ONLY on first entry to the site in this tab (not on refresh or back/forward)
  const initialShouldShow = (() => {
    if (typeof window === 'undefined') return false;
    // Detect navigation type with fallback for older browsers
    let navType: string = 'navigate';
    try {
      const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (entry?.type) navType = entry.type as string;
    } catch {}
    if (navType === 'reload' || navType === 'back_forward') return false;
    // Session gate: only once per tab session
    const seen = sessionStorage.getItem('smartpick-splash-seen') === '1';
    if (seen) return false;
    sessionStorage.setItem('smartpick-splash-seen', '1');
    return true;
  })();
  const [isVisible, setIsVisible] = useState(initialShouldShow);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    // If the page is restored from bfcache, hide the splash immediately
    const onPageShow = (e: PageTransitionEvent) => {
      // When persisted === true, page came from bfcache (back/forward)
      if ((e as any).persisted) {
        setIsVisible(false);
      }
    };
    window.addEventListener('pageshow', onPageShow);

    // Respect reduced motion preferences by shortening the duration.
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Aim for ~3s total on normal motion; ~1.3s on reduced motion.
    const fadeDelay = prefersReduced ? 1000 : 2500; // start fade-out
    const hideDelay = prefersReduced ? 1300 : 3000; // fully hidden

    const fadeOutTimer = setTimeout(() => {
      setIsAnimatingOut(true);
    }, fadeDelay);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, hideDelay);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(hideTimer);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed inset-0 z-[9999]
        flex items-center justify-center
        bg-gradient-to-b from-white via-[#EFFFF8] to-[#C9F9E9]
        ${isAnimatingOut ? 'animate-fade-out' : 'animate-fade-in'}
      `}
    >
      <div className="relative w-full h-full overflow-hidden">
        <img
          src="/splash-screen.webp"
          alt="SmartPick"
          className="absolute inset-0 w-full h-full object-cover animate-scale-in"
          loading="eager"
          decoding="async"
          onError={() => {
            // If image fails to load, don't block the app
            setIsVisible(false);
          }}
        />
      </div>

      {/* Global styles for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-in-out;
        }

        .animate-fade-out {
          animation: fade-out 0.5s ease-in-out;
        }

        .animate-scale-in {
          animation: scale-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}

