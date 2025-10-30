import React from 'react';
import { Badge } from './Badge';
import { ProductStatus } from '../helpers/schema';
import { CheckCircle2, XCircle, TimerOff, PauseCircle } from 'lucide-react';
import styles from './ProductStatusBadge.module.css';

interface ProductStatusBadgeProps {
  status: ProductStatus | null;
  className?: string;
}

const statusConfig: Record<ProductStatus, { variant: React.ComponentProps<typeof Badge>['variant'], icon: React.ElementType, label: string }> = {
  available: {
    variant: 'success',
    icon: CheckCircle2,
    label: 'Available',
  },
  sold_out: {
    variant: 'destructive',
    icon: XCircle,
    label: 'Sold Out',
  },
  expired: {
    variant: 'outline',
    icon: TimerOff,
    label: 'Expired',
  },
  paused: {
    variant: 'warning',
    icon: PauseCircle,
    label: 'Paused',
  },
};

export const ProductStatusBadge = ({ status, className }: ProductStatusBadgeProps) => {
  // Default to "available" if status is null
  const actualStatus: ProductStatus = status ?? 'available';
  const config = statusConfig[actualStatus];

  if (!config) {
    return null;
  }

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${styles.statusBadge} ${className || ''}`}>
      <Icon size={14} className={styles.icon} />
      <span>{config.label}</span>
    </Badge>
  );
};