import { useState, useEffect, useRef } from 'react';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [canPlayWithSound, setCanPlayWithSound] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Try to play with sound first
    const attemptPlayWithSound = async () => {
      try {
        video.muted = false;
        video.volume = 1.0;
        await video.play();
        setCanPlayWithSound(true);
        console.log('✅ Splash video playing with sound');
      } catch (error) {
        console.warn('⚠️ Autoplay with sound blocked, falling back to muted:', error);
        // Fallback to muted autoplay (required by most browsers)
        try {
          video.muted = true;
          await video.play();
          setCanPlayWithSound(false);
          console.log('✅ Splash video playing muted');
        } catch (mutedError) {
          console.error('❌ Video autoplay failed completely:', mutedError);
          setHasError(true);
          // Hide splash immediately if video can't play
          setIsVisible(false);
        }
      }
    };

    // Wait for video to be ready before attempting play
    const handleCanPlay = () => {
      setIsVideoLoaded(true);
      attemptPlayWithSound();
    };

    const handleError = (e: Event) => {
      console.error('❌ Video failed to load:', e);
      setHasError(true);
      // Hide splash if video fails to load
      setIsVisible(false);
    };

    // Add event listeners
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    // Preload video
    video.load();

    // Cleanup
    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // Handle video end
  const handleVideoEnded = () => {
    console.log('✅ Splash video ended');
    setIsVisible(false);
  };

  // Safety timeout: hide after max 5 seconds even if video hasn't ended
  useEffect(() => {
    hideTimerRef.current = setTimeout(() => {
      console.log('⏱️ Splash timeout - hiding after 5s');
      setIsVisible(false);
    }, 5000);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      {/* Loading spinner while video loads */}
      {!isVideoLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        src="/smartpick.mp4"
        playsInline
        preload="auto"
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isVideoLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onEnded={handleVideoEnded}
      />

      {/* Sound indicator (optional - shows if sound is playing) */}
      {canPlayWithSound && isVideoLoaded && (
        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <span className="text-white text-sm">🔊</span>
        </div>
      )}
    </div>
  );
}

