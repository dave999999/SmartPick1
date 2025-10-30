import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../helpers/usePWAInstall';
import { Button } from './Button';
import { Download, X, Package } from 'lucide-react';
import styles from './PWAInstallBanner.module.css';

const DISMISS_KEY = 'pwaInstallDismissedAt';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const PWAInstallBanner = () => {
  const { canInstallPWA, promptInstall, isStandalone, isAppInstalled } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    const isDismissedRecently = dismissedAt && (Date.now() - parseInt(dismissedAt, 10) < DISMISS_DURATION);

    if (canInstallPWA && !isStandalone && !isAppInstalled && !isDismissedRecently) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [canInstallPWA, isStandalone, isAppInstalled]);

  const handleInstallClick = () => {
    promptInstall();
    setIsVisible(false);
  };

  const handleDismissClick = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`${styles.banner} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <Package size={32} />
        </div>
        <div className={styles.textWrapper}>
          <p className={styles.title}>Install SmartPick</p>
          <p className={styles.description}>Add SmartPick to your home screen for quick access to the best local deals.</p>
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="primary" size="sm" onClick={handleInstallClick}>
          <Download size={16} />
          Install
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleDismissClick} aria-label="Dismiss install banner">
          <X size={18} />
        </Button>
      </div>
    </div>
  );
};