import { useState, useEffect } from 'react';

export default function SplashScreen() {
  const initialShouldShow = (() => {
    if (typeof window === 'undefined') return true;
    try {
      const nav = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined);
      if (nav && nav.type === 'back_forward') return false;
    } catch {}
    if ((window as any).__smartpickSplashShownThisLoad) return false;
    return true;
  })();
  const [isVisible, setIsVisible] = useState(initialShouldShow);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    // Do not show when returning via Back/Forward cache (history navigation)
    try {
      const nav = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined);
      if (nav && nav.type === 'back_forward') {
        setIsVisible(false);
        return;
      }
    } catch {}

    // Show splash once per full page load (initial visit or manual refresh).
    // If navigating back to home within SPA, do not show again until a reload.
    if (typeof window !== 'undefined' && (window as any).__smartpickSplashShownThisLoad) {
      setIsVisible(false);
      return;
    }
    (window as any).__smartpickSplashShownThisLoad = true;

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
  }, []);

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
