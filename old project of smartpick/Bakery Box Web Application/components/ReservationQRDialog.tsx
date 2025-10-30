import React from 'react';
import { Selectable } from 'kysely';
import { Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './Dialog';
import { ReservationTimer } from './ReservationTimer';
import { ReservationQRCode } from './ReservationQRCode';
import { Reservations, Products, Businesses } from '../helpers/schema';
import styles from './ReservationQRDialog.module.css';

export type ReservationWithDetails = Selectable<Reservations> & {
  product: Selectable<Products> & {
    business: Selectable<Businesses>;
  };
};

interface ReservationQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ReservationWithDetails | null;
}

export const ReservationQRDialog = ({
  open,
  onOpenChange,
  reservation,
}: ReservationQRDialogProps) => {
  if (!reservation) {
    return null;
  }

  const {
    id,
    verificationCode,
    expiresAt,
    product,
  } = reservation;

  const {
    title: productName,
    pickupTimeStart,
    pickupTimeEnd,
    business,
  } = product;

  const { name: businessName } = business;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader>
          <DialogTitle>Your Reservation</DialogTitle>
          <DialogDescription className={styles.productName}>
            {productName}
          </DialogDescription>
        </DialogHeader>

        <div className={styles.timerContainer}>
          <ReservationTimer expiresAt={expiresAt} />
        </div>

        <div className={styles.qrContainer}>
          <ReservationQRCode
            reservationId={id}
            verificationCode={verificationCode}
            size={256}
          />
        </div>

        <div className={styles.detailsContainer}>
          <p className={styles.instruction}>
            Show this QR code at <strong>{businessName}</strong> to claim your order.
          </p>
          <div className={styles.pickupTime}>
            <Clock size={16} className={styles.pickupIcon} />
            <span>
              Pickup between {pickupTimeStart} - {pickupTimeEnd}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};