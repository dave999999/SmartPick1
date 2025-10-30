import React from 'react';
import { Selectable } from 'kysely';
import { Clock, MapPin, Package, QrCode, XCircle } from 'lucide-react';
import { DB } from '../helpers/schema';
import { Badge } from './Badge';
import { Button } from './Button';
import { ReservationTimer } from './ReservationTimer';
import styles from './ReservationCard.module.css';

type Reservation = Selectable<DB['reservations']>;
type Product = Selectable<DB['products']>;
type Business = Selectable<DB['businesses']>;

export interface ReservationWithDetails extends Reservation {
  product: Product & {
    business: Business;
  };
}

interface ReservationCardProps {
  reservation: ReservationWithDetails;
  onViewQR: (reservation: ReservationWithDetails) => void;
  onCancel: (reservationId: number) => void;
  className?: string;
  showActions?: boolean;
}

export const ReservationCard = ({
  reservation,
  onViewQR,
  onCancel,
  className,
  showActions = true,
}: ReservationCardProps) => {
  const { product, status, expiresAt } = reservation;
  const { business } = product;

  const getStatusVariant = (): 'success' | 'default' | 'destructive' | 'outline' => {
    switch (status) {
      case 'redeemed':
        return 'success';
      case 'reserved':
        return 'default';
      case 'cancelled':
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className={`${styles.card} ${className || ''}`}>
      <div className={styles.imageContainer}>
        <img
          src={product.imageUrl || '/placeholder-image.svg'}
          alt={product.title}
          className={styles.image}
        />
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.productTitle}>{product.title}</h3>
          <Badge variant={getStatusVariant()} className={styles.badge}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
        <p className={styles.businessName}>
          <MapPin size={14} />
          {business.name}
        </p>

        <div className={styles.details}>
          <div className={styles.detailItem}>
            <Package size={16} />
            <span>Quantity: {reservation.quantity}</span>
          </div>
          <div className={styles.detailItem}>
            <Clock size={16} />
            <span>
              Pickup: {product.pickupTimeStart} - {product.pickupTimeEnd}
            </span>
          </div>
        </div>

        {status === 'reserved' && (
          <ReservationTimer expiresAt={expiresAt} className={styles.timer} />
        )}

        {showActions && status === 'reserved' && (
          <div className={styles.actions}>
            <Button onClick={() => onViewQR(reservation)}>
              <QrCode size={16} />
              View QR Code
            </Button>
            <Button variant="outline" onClick={() => onCancel(reservation.id)}>
              <XCircle size={16} />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};