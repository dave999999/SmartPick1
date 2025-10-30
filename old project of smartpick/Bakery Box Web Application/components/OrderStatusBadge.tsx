import React from "react";
import { useTranslation } from "../helpers/useTranslation";
import styles from "./OrderStatusBadge.module.css";
import { type OrderStatus } from "../helpers/schema";

interface OrderStatusBadgeProps {
  status: OrderStatus | null;
  className?: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  className,
}) => {
  const { t } = useTranslation();

  const getStatusInfo = (
    status: OrderStatus | null
  ): { text: string; style: string } => {
    switch (status) {
      case "pending":
        return { text: t("orders.statusPending"), style: styles.pending };
      case "confirmed":
        return { text: t("orders.statusConfirmed"), style: styles.confirmed };
      case "completed":
        return { text: t("orders.statusCompleted"), style: styles.completed };
      case "cancelled":
        return { text: t("orders.statusCancelled"), style: styles.cancelled };
      default:
        return { text: "Unknown", style: styles.unknown };
    }
  };

  const { text, style } = getStatusInfo(status);

  return <span className={`${styles.badge} ${style} ${className || ""}`}>{text}</span>;
};