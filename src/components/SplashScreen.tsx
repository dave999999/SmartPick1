import { useState, useEffect } from 'react';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    // Check if splash was already shown
    const hasSeenSplash = localStorage.getItem('smartpick-splash-shown');

    if (hasSeenSplash === 'true') {
      // If user has seen splash before, don't show it
      setIsVisible(false);
      return;
    }

    // Start fade-out animation after 2 seconds
    const fadeOutTimer = setTimeout(() => {
      setIsAnimatingOut(true);
    }, 2000);

    // Completely hide splash after fade-out animation completes
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      // Mark splash as shown
      localStorage.setItem('smartpick-splash-shown', 'true');
    }, 2500);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(hideTimer);
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
      <div className="relative w-full h-full max-w-md max-h-screen flex items-center justify-center p-8">
        <img
          src="/splash-screen.webp"
          alt="SmartPick"
          className="w-full h-auto object-contain animate-scale-in"
          style={{ maxHeight: '80vh' }}
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
