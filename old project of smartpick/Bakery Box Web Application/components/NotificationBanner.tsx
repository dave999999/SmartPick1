import React, { useState, useEffect } from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import { Button } from './Button';
import styles from './NotificationBanner.module.css';

type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

export interface NotificationBannerProps {
  /** The notification message to display */
  message: string;
  /** Visual style variant of the banner */
  variant?: NotificationVariant;
  /** Whether the banner can be dismissed. Defaults to true. */
  dismissible?: boolean;
  /** Callback function when the banner is dismissed */
  onDismiss?: () => void;
  /** Optional text for an action button */
  actionText?: string;
  /** Optional callback for the action button */
  onAction?: () => void;
  /** Optional className to be added to the component */
  className?: string;
}

const variantIcons: Record<NotificationVariant, React.ElementType> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

export const NotificationBanner = ({
  message,
  variant = 'info',
  dismissible = true,
  onDismiss,
  actionText,
  onAction,
  className,
}: NotificationBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mount with animation
    const timer = setTimeout(() => setIsMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsMounted(false); // Animate out
    setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    }, 300); // Match animation duration
  };

  const IconComponent = variantIcons[variant];

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`${styles.banner} ${styles[variant]} ${isMounted ? styles.visible : ''} ${className || ''}`}
    >
      <div className={styles.iconWrapper}>
        <IconComponent className={styles.icon} size={20} aria-hidden="true" />
      </div>
      <p className={styles.message}>{message}</p>
      {actionText && onAction && (
        <Button
          variant="link"
          size="sm"
          onClick={onAction}
          className={styles.actionButton}
        >
          {actionText}
        </Button>
      )}
      {dismissible && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          className={styles.dismissButton}
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </Button>
      )}
    </div>
  );
};