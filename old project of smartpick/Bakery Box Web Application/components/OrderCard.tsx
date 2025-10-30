import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../helpers/useTranslation";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { Calendar, MapPin, Package, Store } from "lucide-react";
import styles from "./OrderCard.module.css";
import { type OrderDetails } from "../endpoints/orders/my_GET.schema";

interface OrderCardProps {
  order: OrderDetails;
  className?: string;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, className }) => {
  const { t } = useTranslation();

  const formattedDate = new Intl.DateTimeFormat(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  ).format(order.createdAt ? new Date(order.createdAt) : new Date());

  const formattedPrice = `${Number(order.totalPrice).toFixed(2)} ₾`;

  return (
    <div className={`${styles.card} ${className || ""}`}>
      <div className={styles.cardHeader}>
        <img
          src={order.product.imageUrl || "/placeholder-image.svg"}
          alt={order.product.title}
          className={styles.productImage}
        />
        <div className={styles.headerText}>
          <h3 className={styles.productTitle}>{order.product.title}</h3>
          <div className={styles.statusAndPrice}>
            <OrderStatusBadge status={order.status} />
            <span className={styles.price}>{formattedPrice}</span>
          </div>
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.detailItem}>
          <Store size={16} />
          <span>{order.business.name}</span>
        </div>
        <div className={styles.detailItem}>
          <MapPin size={16} />
          <span>{order.business.address}</span>
        </div>
        <div className={styles.detailItem}>
          <Package size={16} />
          <span>
            {t("orders.quantity")}: {order.quantity}
          </span>
        </div>
        <div className={styles.detailItem}>
          <Calendar size={16} />
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};