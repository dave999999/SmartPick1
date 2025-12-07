import { useState, useEffect } from 'react';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide after 4 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 4000);

    return () => clearTimeout(hideTimer);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      <video
        src="/smartpick.mp4"
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
        onEnded={() => setIsVisible(false)}
      />
    </div>
  );
}

