import React from "react";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { useTranslation } from "../helpers/useTranslation";
import { Package, Clock } from "lucide-react";
import type { OutputType } from "../endpoints/products/list_GET.schema";
import type { BusinessStatus } from "../helpers/schema";
import styles from "./BusinessPopup.module.css";

type ProductWithBusiness = OutputType[0];

interface BusinessPopupProps {
  business: {
    id: number;
    name: string;
    description: string | null;
    address: string;
    logoUrl: string | null;
    status: BusinessStatus;
  };
  products: ProductWithBusiness[];
  onReserveClick?: (item: ProductWithBusiness) => void;
  isAuthenticated?: boolean;
}

export const BusinessPopup: React.FC<BusinessPopupProps> = ({
  business,
  products,
  onReserveClick,
  isAuthenticated,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.popup}>
      <div className={styles.header}>
        {business.logoUrl && (
          <div className={styles.logoContainer}>
            <img
              src={business.logoUrl}
              alt={business.name}
              className={styles.logo}
            />
          </div>
        )}
        <div className={styles.businessInfo}>
          <div className={styles.businessNameRow}>
            <h3 className={styles.businessName}>{business.name}</h3>
            {business.status === "approved" && (
              <Badge variant="default" className={styles.verifiedBadge}>
                ✅ {t("common.verified")}
              </Badge>
            )}
          </div>
          {business.description && (
            <p className={styles.description}>{business.description}</p>
          )}
          <p className={styles.address}>{business.address}</p>
        </div>
      </div>

      <div className={styles.productsSection}>
        <h4 className={styles.productsTitle}>
          {t("common.availableProducts")} ({products.length})
        </h4>
        <div className={styles.products}>
          {products.map((item) => {
            const isAvailable = item.product.quantity > 0;
            const isLowStock = item.product.quantity > 0 && item.product.quantity <= 5;
            
            return (
              <div key={item.product.id} className={styles.product}>
                {item.product.imageUrl && (
                  <div className={styles.productImageContainer}>
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.title}
                      className={styles.productImage}
                    />
                    {!isAvailable && (
                      <div className={styles.soldOutOverlay}>
                        {t("productCard.soldOut")}
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.productInfo}>
                  <h4 className={styles.productTitle}>{item.product.title}</h4>
                  
                  <div className={styles.productMeta}>
                    <div className={styles.metaItem}>
                      <Clock size={14} />
                      <span>{item.product.pickupTimeStart} - {item.product.pickupTimeEnd}</span>
                    </div>
                    <div className={`${styles.metaItem} ${styles.availability} ${!isAvailable ? styles.unavailable : isLowStock ? styles.lowStock : ''}`}>
                      <Package size={14} />
                      <span>
                        {item.product.quantity} {t("productCard.available")}
                      </span>
                    </div>
                  </div>

                  <div className={styles.priceRow}>
                    <div className={styles.prices}>
                      <span className={styles.discountedPrice}>
                        {Number(item.product.discountedPrice).toFixed(2)} ₾
                      </span>
                      <span className={styles.originalPrice}>
                        {Number(item.product.originalPrice).toFixed(2)} ₾
                      </span>
                      <span className={styles.discount}>
                        {Math.round(
                          ((Number(item.product.originalPrice) -
                            Number(item.product.discountedPrice)) /
                            Number(item.product.originalPrice)) *
                            100
                        )}
                        % {t("productCard.off")}
                      </span>
                    </div>
                    {isAuthenticated && onReserveClick && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onReserveClick(item)}
                        disabled={!isAvailable}
                        className={styles.reserveButton}
                      >
                        {isAvailable ? t("productCard.reserve") : t("productCard.soldOut")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};