import { useState, useEffect } from 'react';

export default function SplashScreen() {
  // Show splash on first entry OR hard refresh (Ctrl+Shift+R / Ctrl+F5)
  const initialShouldShow = (() => {
    if (typeof window === 'undefined') return false;
    // Detect navigation type with fallback for older browsers
    let navType: string = 'navigate';
    try {
      const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (entry?.type) navType = entry.type as string;
    } catch (e) {
      // Performance API not available in this browser
    }
    // Don't show on back/forward navigation
    if (navType === 'back_forward') return false;
    // Show on reload (including hard refresh) and navigate
    if (navType === 'reload') {
      sessionStorage.removeItem('smartpick-splash-seen');
      return true;
    }
    // Session gate: only once per tab session for normal navigation
    const seen = sessionStorage.getItem('smartpick-splash-seen') === '1';
    if (seen) return false;
    sessionStorage.setItem('smartpick-splash-seen', '1');
    return true;
  })();
  const [isVisible, setIsVisible] = useState(initialShouldShow);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted by default
  const [showUnmuteButton, setShowUnmuteButton] = useState(false);

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
        bg-black
        ${isAnimatingOut ? 'animate-fade-out' : 'animate-fade-in'}
      `}
      onClick={() => {
        // Unmute on click
        const video = document.querySelector('video');
        if (video) {
          video.muted = false;
          setIsMuted(false);
        }
      }}
    >
      <div 
        className="relative w-full h-full overflow-hidden"
        onClick={() => {
          // Enable sound on any click
          const video = document.querySelector('video') as HTMLVideoElement;
          if (video && video.muted) {
            video.muted = false;
            video.volume = 1.0;
            setShowUnmuteButton(false);
          }
        }}
      >
        <video
          ref={(videoEl) => {
            if (videoEl) {
              // Force unmute and play with sound on every load
              videoEl.muted = false;
              videoEl.volume = 1.0;
              videoEl.play().catch(() => {
                // If blocked, show unmute button
                videoEl.muted = true;
                videoEl.play();
                setShowUnmuteButton(true);
              });
            }
          }}
          src="/smartpick.mp4"
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => {
            setIsVisible(false);
          }}
        />
        
        {/* Click anywhere to unmute */}
        {showUnmuteButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <button
              className="bg-white/90 backdrop-blur-sm rounded-full p-6 hover:bg-white transition-all transform hover:scale-110 shadow-2xl"
              onClick={(e) => {
                e.stopPropagation();
                const video = document.querySelector('video') as HTMLVideoElement;
                if (video) {
                  video.muted = false;
                  video.volume = 1.0;
                  setShowUnmuteButton(false);
                }
              }}
            >
              <svg className="w-8 h-8 text-[#FF7A1A]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Global styles for animations */}
      <style>{`
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

