import React from "react";
import { Button } from "./Button";
import { Clock, MapPin, Package } from "lucide-react";
import styles from "./ProductCard.module.css";
import type { OutputType } from "../endpoints/products/list_GET.schema";
import { useTranslation } from "../helpers/useTranslation";

type ProductWithBusiness = OutputType[0];

interface ProductCardProps {
  item: ProductWithBusiness;
  onReserveClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onReserveClick,
}) => {
  const { t } = useTranslation();
  const { product, business } = item;

    const formatPrice = (price: string | number) => {
    return `${Number(price).toFixed(2)} ₾`;
  };

  const discount = Math.round(
    ((Number(product.originalPrice) - Number(product.discountedPrice)) /
      Number(product.originalPrice)) *
      100
  );

  return (
    <div className={styles.card}>
      {product.imageUrl && (
        <div className={styles.imageContainer}>
          <img
            src={product.imageUrl}
            alt={product.title}
            className={styles.image}
          />
          <div className={styles.discountBadge}>{discount}% {t("productCard.off")}</div>
        </div>
      )}
      <div className={styles.content}>
        <h3 className={styles.title}>{product.title}</h3>
        <div className={styles.businessName}>
          <MapPin size={14} />
          {business.name}
        </div>
        <p className={styles.description}>{product.description}</p>

        <div className={styles.details}>
          <div className={styles.detailItem}>
            <Clock size={16} />
            <span>
              {t("productCard.pickup")} {product.pickupTimeStart} - {product.pickupTimeEnd}
            </span>
          </div>
          <div className={styles.detailItem}>
            <Package size={16} />
            <span>{product.quantity} {t("productCard.available")}</span>
          </div>
        </div>

        <div className={styles.priceSection}>
          <div className={styles.prices}>
            <span className={styles.originalPrice}>
              {formatPrice(product.originalPrice)}
            </span>
            <span className={styles.discountedPrice}>
              {formatPrice(product.discountedPrice)}
            </span>
          </div>
          <div className={styles.singleButton}>
            {onReserveClick ? (
              <Button 
                variant="primary" 
                onClick={onReserveClick} 
                disabled={product.quantity === 0}
              >
                {product.quantity === 0 ? t("productCard.soldOut") : t("productCard.reserve")}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                disabled={true}
              >
                {t("productCard.unavailable")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};