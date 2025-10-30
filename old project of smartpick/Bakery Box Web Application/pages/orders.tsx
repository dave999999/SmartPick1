import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { useGetMyReservationsQuery, useCancelReservationMutation } from "../helpers/useFoodWasteQueries";
import { useTranslation } from "../helpers/useTranslation";
import { useAuth } from "../helpers/useAuth";
import { NotificationBanner } from "../components/NotificationBanner";
import { MyReservation } from "../endpoints/reservations/my_GET.schema";
import { ReservationStatus } from "../helpers/schema";
import { Skeleton } from "../components/Skeleton";
import { Button } from "../components/Button";
import { ReservationTimer } from "../components/ReservationTimer";
import { AlertCircle, ShoppingBag, MapPin, Package, Calendar, Hash, DollarSign, Clock, Key, X } from "lucide-react";
import styles from "./orders.module.css";

const groupOrdersByDate = (reservations: MyReservation[], t: (key: string) => string) => {
  const groups: Record<string, MyReservation[]> = {
    [t('orders.today')]: [],
    [t('orders.yesterday')]: [],
    [t('orders.thisWeek')]: [],
    [t('orders.earlier')]: [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const todayKey = t('orders.today');
  const yesterdayKey = t('orders.yesterday');
  const thisWeekKey = t('orders.thisWeek');
  const earlierKey = t('orders.earlier');

  reservations.forEach((reservation) => {
    if (!reservation.reservedAt) {
      groups[earlierKey].push(reservation);
      return;
    }
    const reservationDate = new Date(reservation.reservedAt);
    if (reservationDate >= today) {
      groups[todayKey].push(reservation);
    } else if (reservationDate >= yesterday) {
      groups[yesterdayKey].push(reservation);
    } else if (reservationDate >= startOfWeek) {
      groups[thisWeekKey].push(reservation);
    } else {
      groups[earlierKey].push(reservation);
    }
  });

  return Object.entries(groups).filter(([, reservations]) => reservations.length > 0);
};

const OrderStatusBadge: React.FC<{ status: ReservationStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const statusClass = styles[status] || styles.reserved;
  const statusKey = `orders.status${status.charAt(0).toUpperCase() + status.slice(1)}`;
  return (
    <span className={`${styles.statusBadge} ${statusClass}`}>
      {t(statusKey)}
    </span>
  );
};

const OrderCard: React.FC<{ reservation: MyReservation }> = ({ reservation }) => {
  const { t, language } = useTranslation();
  const cancelMutation = useCancelReservationMutation();
  const formattedDate = reservation.reservedAt
    ? new Intl.DateTimeFormat(language === 'ka' ? 'ka-GE' : 'en-US', {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(reservation.reservedAt))
    : t('orders.unknownDate');

  const pickupTime = `${reservation.pickupTimeStart} - ${reservation.pickupTimeEnd}`;
  const totalPrice = Number(reservation.discountedPrice) * reservation.quantity;
  
  const showVerificationCode = reservation.reservationStatus === 'reserved' || reservation.reservationStatus === 'redeemed';
  const canCancel = reservation.reservationStatus === 'reserved';

  const handleCancel = () => {
    if (window.confirm(t('orders.confirmCancel'))) {
      cancelMutation.mutate({ reservationId: reservation.reservationId });
    }
  };

  return (
    <div className={styles.orderCard}>
      <div className={styles.cardHeader}>
        <div className={styles.headerInfo}>
          <Calendar size={16} />
          <span>{formattedDate}</span>
        </div>
        <div className={styles.headerRight}>
          {reservation.reservationStatus === 'reserved' && reservation.expiresAt && (
            <ReservationTimer expiresAt={reservation.expiresAt} />
          )}
          <OrderStatusBadge status={reservation.reservationStatus} />
        </div>
      </div>
      <div className={styles.cardBody}>
        <img
          src={reservation.productImageUrl || "/placeholder-image.svg"}
          alt={reservation.productTitle}
          className={styles.productImage}
        />
        <div className={styles.productDetails}>
          <h3 className={styles.productTitle}>{reservation.productTitle}</h3>
          <p className={styles.businessInfo}>
            <Package size={14} /> {reservation.businessName}
          </p>
          <p className={styles.businessInfo}>
            <MapPin size={14} /> {reservation.businessAddress}
          </p>
          <p className={styles.businessInfo}>
            <Clock size={14} /> {t('orders.pickupTime')}: {pickupTime}
          </p>
        </div>
        <div className={styles.orderDetails}>
          <div className={styles.detailItem}>
            <Hash size={14} />
            <span>{t('orders.quantity')}: {reservation.quantity}</span>
          </div>
          <div className={styles.detailItem}>
            <DollarSign size={14} />
            <span>{t('orders.totalPrice')}: ${totalPrice.toFixed(2)}</span>
          </div>
          {showVerificationCode && (
            <div className={styles.detailItem}>
              <Key size={14} />
              <span className={styles.verificationCode}>{reservation.verificationCode}</span>
            </div>
          )}
        </div>
      </div>
      {canCancel && (
        <div className={styles.cardActions}>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
          >
            <X size={16} />
            {cancelMutation.isPending ? t('orders.cancelling') : t('orders.cancelReservation')}
          </Button>
        </div>
      )}
    </div>
  );
};

const OrdersLoadingSkeleton = () => (
  <div className={styles.skeletonContainer}>
    {[...Array(3)].map((_, i) => (
      <div key={i} className={styles.skeletonCard}>
        <div className={styles.skeletonHeader}>
          <Skeleton style={{ width: "150px", height: "24px" }} />
          <Skeleton style={{ width: "80px", height: "24px" }} />
        </div>
        <div className={styles.skeletonBody}>
          <Skeleton style={{ width: "100px", height: "100px", flexShrink: 0 }} />
          <div className={styles.skeletonDetails}>
            <Skeleton style={{ width: "80%", height: "24px" }} />
            <Skeleton style={{ width: "60%", height: "20px" }} />
            <Skeleton style={{ width: "70%", height: "20px" }} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const OrdersPage = () => {
  const { t } = useTranslation();
  const { authState } = useAuth();
  const { data: reservations, isFetching, error } = useGetMyReservationsQuery();
  const [isPenaltyBannerDismissed, setIsPenaltyBannerDismissed] = useState(false);

  // Helper to format time remaining
  const formatTimeRemaining = useCallback((penaltyUntil: Date) => {
    const now = new Date();
    const diff = penaltyUntil.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} ${t('penalty.days')}`;
    } else if (hours > 0) {
      return `${hours} ${t('penalty.hours')}`;
    } else {
      return `${minutes} ${t('penalty.minutes')}`;
    }
  }, [t]);

  // Check if user has active penalty
  const userPenalty = useMemo(() => {
    if (authState.type !== "authenticated" || !authState.user.penaltyUntil) {
      return null;
    }
    
    const penaltyUntil = new Date(authState.user.penaltyUntil);
    const now = new Date();
    
    if (penaltyUntil > now) {
      const timeRemaining = formatTimeRemaining(penaltyUntil);
      return timeRemaining ? { penaltyUntil, timeRemaining } : null;
    }
    
    return null;
  }, [authState, formatTimeRemaining]);

  // Reset penalty banner dismissal when penalty changes or expires
  useEffect(() => {
    if (!userPenalty) {
      setIsPenaltyBannerDismissed(false);
    }
  }, [userPenalty]);

  const handlePenaltyBannerDismiss = () => {
    console.log("Penalty banner dismissed");
    setIsPenaltyBannerDismissed(true);
  };

  const shouldShowPenaltyBanner = !isPenaltyBannerDismissed && userPenalty !== null;

  const renderContent = () => {
    if (isFetching) {
      return <OrdersLoadingSkeleton />;
    }

    if (error) {
      return (
        <div className={styles.centeredMessage}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h2>{t('orders.errorLoading')}</h2>
          <p>{error.message}</p>
        </div>
      );
    }

    if (!reservations || reservations.length === 0) {
      return (
        <div className={styles.centeredMessage}>
          <ShoppingBag size={48} className={styles.emptyIcon} />
          <h2>{t('orders.noOrders')}</h2>
          <p>{t('orders.noOrdersDescription')} <Link to="/">{t('orders.browseProducts')}</Link></p>
        </div>
      );
    }

    const groupedReservations = groupOrdersByDate(reservations, t);

    return (
      <div className={styles.ordersList}>
        {groupedReservations.map(([groupName, groupReservations]) => (
          <section key={groupName} className={styles.orderGroup}>
            <h2 className={styles.groupTitle}>{groupName}</h2>
            <div className={styles.groupContent}>
              {groupReservations.map((reservation) => (
                <OrderCard key={reservation.reservationId} reservation={reservation} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>{t('orders.myOrders')} - {t('nav.appName')}</title>
        <meta name="description" content={t('orders.pageDescription')} />
      </Helmet>
      <div className={styles.pageContainer}>
        <h1 className={styles.pageTitle}>{t('orders.myOrders')}</h1>
        {shouldShowPenaltyBanner && (
          <div className={styles.bannerContainer}>
            <NotificationBanner
              message={`⚠️ ${t('penalty.active')} — ${t('penalty.message')} ${t('penalty.timeRemaining')}: ${userPenalty.timeRemaining}.`}
              variant="error"
              dismissible={true}
              onDismiss={handlePenaltyBannerDismiss}
            />
          </div>
        )}
        {renderContent()}
      </div>
    </>
  );
};

export default OrdersPage;