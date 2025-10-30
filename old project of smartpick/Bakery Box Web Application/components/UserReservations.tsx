import React, { useState, useMemo } from 'react';
import { AlertCircle, ShoppingBag } from 'lucide-react';
import { useGetMyReservationsQuery, useCancelReservationMutation } from '../helpers/useFoodWasteQueries';
import { ReservationCard, ReservationWithDetails } from './ReservationCard';
import { ReservationQRDialog } from './ReservationQRDialog';
import { Skeleton } from './Skeleton';
import { useTranslation } from '../helpers/useTranslation';
import { type MyReservation } from '../endpoints/reservations/my_GET.schema';
import styles from './UserReservations.module.css';

const mapMyReservationToWithDetails = (
  myReservation: MyReservation,
): ReservationWithDetails => {
  return {
    id: myReservation.reservationId,
    status: myReservation.reservationStatus,
    expiresAt: myReservation.expiresAt,
    redeemedAt: myReservation.redeemedAt,
    verificationCode: myReservation.verificationCode,
    quantity: myReservation.quantity,
    productId: myReservation.productId,
    userId: 0, // Not provided by the endpoint, but not used by the card
    createdAt: new Date(), // Not provided, placeholder
    updatedAt: new Date(), // Not provided, placeholder
    reservedAt: new Date(), // Not provided, placeholder
    product: {
      id: myReservation.productId,
      title: myReservation.productTitle,
      imageUrl: myReservation.productImageUrl,
      discountedPrice: myReservation.discountedPrice,
      originalPrice: myReservation.originalPrice,
      pickupTimeStart: myReservation.pickupTimeStart,
      pickupTimeEnd: myReservation.pickupTimeEnd,
      availableDate: myReservation.availableDate,
      businessId: myReservation.businessId,
      description: '', // Not provided, placeholder
      quantity: 1, // Not provided, placeholder
      status: 'available', // Not provided, placeholder
      createdAt: new Date(), // Not provided, placeholder
      updatedAt: new Date(), // Not provided, placeholder
      expiresAt: null, // Not provided, placeholder
      business: {
        id: myReservation.businessId,
        name: myReservation.businessName,
        address: myReservation.businessAddress,
        businessType: '', // Not provided, placeholder
        description: '', // Not provided, placeholder
        ownerId: 0, // Not provided, placeholder
        status: 'approved', // Not provided, placeholder
        contactEmail: null,
        logoUrl: null,
        latitude: null,
        longitude: null,
        phone: null,
        createdAt: null,
        updatedAt: null,
      },
    },
  };
};

const ReservationSkeleton = () => (
  <div className={styles.skeletonCard}>
    <Skeleton className={styles.skeletonImage} />
    <div className={styles.skeletonContent}>
      <div className={styles.skeletonHeader}>
        <Skeleton style={{ height: '1.5rem', width: '60%' }} />
        <Skeleton style={{ height: '1.5rem', width: '80px' }} />
      </div>
      <Skeleton style={{ height: '1rem', width: '40%', marginTop: 'var(--spacing-2)' }} />
      <div className={styles.skeletonDetails}>
        <Skeleton style={{ height: '1rem', width: '100%' }} />
        <Skeleton style={{ height: '1rem', width: '100%' }} />
      </div>
      <div className={styles.skeletonActions}>
        <Skeleton style={{ height: '2.5rem', width: '150px' }} />
        <Skeleton style={{ height: '2.5rem', width: '100px' }} />
      </div>
    </div>
  </div>
);

export const UserReservations = () => {
  const { t } = useTranslation();
  const { data: reservationsData, isFetching, error } = useGetMyReservationsQuery();
  const cancelMutation = useCancelReservationMutation();

  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);

  const handleViewQR = (reservation: ReservationWithDetails) => {
    setSelectedReservation(reservation);
    setIsQrDialogOpen(true);
  };

  const handleCancel = (reservationId: number) => {
    cancelMutation.mutate({ reservationId });
  };

  const { activeReservations, pastReservations } = useMemo(() => {
    if (!reservationsData) {
      return { activeReservations: [], pastReservations: [] };
    }
    const mappedReservations = reservationsData.map(mapMyReservationToWithDetails);
    const active = mappedReservations.filter(r => r.status === 'reserved');
    const past = mappedReservations.filter(r => r.status !== 'reserved');
    return { activeReservations: active, pastReservations: past };
  }, [reservationsData]);

  const renderContent = () => {
    if (isFetching) {
      return (
        <div className={styles.grid}>
          <ReservationSkeleton />
          <ReservationSkeleton />
          <ReservationSkeleton />
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.messageContainer}>
          <AlertCircle className={styles.messageIconError} />
          <p>{t('reservations.error')}</p>
          <p className={styles.errorMessage}>{error instanceof Error ? error.message : 'An unknown error occurred.'}</p>
        </div>
      );
    }

    if (!reservationsData || reservationsData.length === 0) {
      return (
        <div className={styles.messageContainer}>
          <ShoppingBag className={styles.messageIcon} />
          <p>{t('reservations.empty')}</p>
        </div>
      );
    }

    return (
      <>
        {activeReservations.length > 0 && (
          <section>
            <h3 className={styles.sectionTitle}>{t('reservations.activeTitle')}</h3>
            <div className={styles.grid}>
              {activeReservations.map(reservation => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onViewQR={handleViewQR}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          </section>
        )}

        {pastReservations.length > 0 && (
          <section>
            <h3 className={styles.sectionTitle}>{t('reservations.pastTitle')}</h3>
            <div className={styles.grid}>
              {pastReservations.map(reservation => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onViewQR={handleViewQR}
                  onCancel={handleCancel}
                  showActions={false}
                />
              ))}
            </div>
          </section>
        )}
      </>
    );
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.mainTitle}>{t('reservations.mainTitle')}</h2>
      {renderContent()}
      <ReservationQRDialog
        open={isQrDialogOpen}
        onOpenChange={setIsQrDialogOpen}
        reservation={selectedReservation}
      />
    </div>
  );
};