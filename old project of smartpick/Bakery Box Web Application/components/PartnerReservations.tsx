import React, { useState } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { useGetPartnerReservationsQuery } from '../helpers/useFoodWasteQueries';
import { useReservationNotifications } from '../helpers/useReservationNotifications';
import { type PartnerReservation } from '../endpoints/reservations/partner_GET.schema';
import { Skeleton } from './Skeleton';
import { Button } from './Button';
import { RedeemReservationDialog } from './RedeemReservationDialog';
import { ReservationTimer } from './ReservationTimer';
import styles from './PartnerReservations.module.css';

const ReservationItemSkeleton = () => (
  <div className={styles.reservationItem}>
    <div className={styles.itemHeader}>
      <Skeleton style={{ height: '1.5rem', width: '60%' }} />
      <Skeleton style={{ height: '1.25rem', width: '100px' }} />
    </div>
    <div className={styles.itemDetails}>
      <Skeleton style={{ height: '1rem', width: '80%' }} />
      <Skeleton style={{ height: '1rem', width: '70%' }} />
    </div>
    <div className={styles.itemActions}>
      <Skeleton style={{ height: '2.5rem', width: '120px', borderRadius: 'var(--radius)' }} />
    </div>
  </div>
);

export const PartnerReservations = ({ 
  className,
  notificationsEnabled = true 
}: { 
  className?: string;
  notificationsEnabled?: boolean;
}) => {
  const [selectedReservation, setSelectedReservation] = useState<PartnerReservation | null>(null);
  const { data: reservations, isFetching, error } = useGetPartnerReservationsQuery();

  // Enable notifications for new reservations
  useReservationNotifications(reservations, notificationsEnabled);

  const handleRedeemClick = (reservation: PartnerReservation) => {
    setSelectedReservation(reservation);
  };

  const handleDialogClose = () => {
    setSelectedReservation(null);
  };

  const renderContent = () => {
    if (isFetching) {
      return (
        <div className={styles.grid}>
          {Array.from({ length: 3 }).map((_, index) => (
            <ReservationItemSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.stateContainer}>
          <AlertCircle className={styles.stateIcon} size={48} />
          <h3 className={styles.stateTitle}>Error Loading Reservations</h3>
          <p className={styles.stateDescription}>
            {error instanceof Error ? error.message : 'An unknown error occurred.'}
          </p>
        </div>
      );
    }

    if (!reservations || reservations.length === 0) {
      return (
        <div className={styles.stateContainer}>
          <Inbox className={styles.stateIcon} size={48} />
          <h3 className={styles.stateTitle}>No Pending Reservations</h3>
          <p className={styles.stateDescription}>
            When a customer reserves an item, it will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className={styles.grid}>
        {reservations.map((reservation) => (
          <div key={reservation.reservationId} className={styles.reservationItem}>
            <div className={styles.itemHeader}>
              <h4 className={styles.productTitle}>{reservation.productTitle}</h4>
              <ReservationTimer expiresAt={reservation.expiresAt} />
            </div>
            <div className={styles.itemDetails}>
              <p>
                <strong>Customer:</strong> {reservation.userDisplayName}
              </p>
              <p>
                <strong>Email:</strong> {reservation.userEmail}
              </p>
              <p>
                <strong>Quantity:</strong> {reservation.quantity}
              </p>
              <p>
                <strong>Business:</strong> {reservation.businessName}
              </p>
            </div>
            <div className={styles.itemActions}>
              <Button onClick={() => handleRedeemClick(reservation)}>
                Redeem
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className={`${styles.container} ${className || ''}`}>
      <h2 className={styles.title}>Pending Reservations</h2>
      {renderContent()}
      {selectedReservation && (
        <RedeemReservationDialog
          open={!!selectedReservation}
          onOpenChange={(isOpen) => !isOpen && handleDialogClose()}
          reservation={selectedReservation}
        />
      )}
    </section>
  );
};