import React, { useState, useEffect } from 'react';
import { Bell, Package, CheckCircle, AlertCircle, Clock, UserCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Selectable } from 'kysely';

import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { Button } from './Button';
import { Badge } from './Badge';
import { Skeleton } from './Skeleton';
import { useAuth } from '../helpers/useAuth';
import { useUnreadCount, useNotifications, useMarkAsRead, NOTIFICATIONS_QUERY_KEYS } from '../helpers/useNotifications';
import { useTimeAgo } from '../helpers/useTimeAgo';
import { Notifications as NotificationType } from '../helpers/schema';

import styles from './NotificationBell.module.css';

const NotificationIcon = ({ type }: { type: NotificationType['type'] }) => {
  switch (type) {
    case 'new_listing':
      return <Package className={styles.notificationIcon} />;
    case 'reservation_confirmed':
      return <CheckCircle className={`${styles.notificationIcon} ${styles.success}`} />;
    case 'reservation_expired':
      return <AlertCircle className={`${styles.notificationIcon} ${styles.error}`} />;
    case 'reservation_expiring':
      return <Clock className={`${styles.notificationIcon} ${styles.warning}`} />;
    case 'new_reservation_partner':
      return <UserCheck className={`${styles.notificationIcon} ${styles.info}`} />;
    default:
      return <Bell className={styles.notificationIcon} />;
  }
};

const NotificationItem = ({ notification }: { notification: Selectable<NotificationType> }) => {
  const { mutate: markAsRead } = useMarkAsRead();
    const timeAgo = useTimeAgo(notification.createdAt ?? new Date());

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead({ notificationIds: [notification.id] });
    }
  };

  const content = (
    <div className={styles.notificationItemContent}>
      <NotificationIcon type={notification.type} />
      <div className={styles.notificationText}>
        <p className={styles.notificationTitle}>{notification.title}</p>
        <p className={styles.notificationMessage}>{notification.message}</p>
        <p className={styles.notificationTime}>{timeAgo}</p>
      </div>
      {!notification.isRead && <div className={styles.unreadIndicator} title="Unread"></div>}
    </div>
  );

  if (notification.link) {
    return (
      <Link to={notification.link} className={styles.notificationItem} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <div className={styles.notificationItem} onClick={handleClick}>
      {content}
    </div>
  );
};

const NotificationList = () => {
  const { data, fetchNextPage, hasNextPage, isFetching, isError } = useNotifications(10);
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAsRead();
  const queryClient = useQueryClient();

  const handleMarkAllAsRead = () => {
    markAllAsRead({ markAllAsRead: true }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.all });
      }
    });
  };

  const notifications = data?.pages.flat() ?? [];

  if (isFetching && !data) {
    return (
      <div className={styles.notificationList}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.skeletonItem}>
            <Skeleton style={{ width: '2rem', height: '2rem', borderRadius: '50%' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <Skeleton style={{ height: '1rem', width: '80%' }} />
              <Skeleton style={{ height: '0.75rem', width: '60%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <div className={styles.emptyState}>Error loading notifications.</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Bell size={48} strokeWidth={1} />
        <p>No notifications yet</p>
        <span>Check back later for updates.</span>
      </div>
    );
  }

  return (
    <>
      <header className={styles.popoverHeader}>
        <h3>Notifications</h3>
        <Button variant="link" size="sm" onClick={handleMarkAllAsRead} disabled={isMarkingAll}>
          Mark all as read
        </Button>
      </header>
      <div className={styles.notificationList}>
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
        {hasNextPage && (
          <Button variant="ghost" onClick={() => fetchNextPage()} disabled={isFetching}>
            Load More
          </Button>
        )}
      </div>
    </>
  );
};

export const NotificationBell = ({ className }: { className?: string }) => {
  const { authState } = useAuth();
  const { data: unreadData } = useUnreadCount();
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [hasPulsed, setHasPulsed] = useState(false);

  const unreadCount = unreadData?.count ?? 0;

  useEffect(() => {
    if (unreadCount > 0 && !hasPulsed) {
      setHasPulsed(true);
    }
  }, [unreadCount, hasPulsed]);

  if (authState.type !== 'authenticated') {
    return null;
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`${styles.bellButton} ${className ?? ''}`}
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <Badge className={`${styles.unreadBadge} ${hasPulsed ? styles.pulse : ''}`}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={styles.popoverContent}
        align="end"
        sideOffset={8}
        removeBackgroundAndPadding
      >
        <NotificationList />
      </PopoverContent>
    </Popover>
  );
};