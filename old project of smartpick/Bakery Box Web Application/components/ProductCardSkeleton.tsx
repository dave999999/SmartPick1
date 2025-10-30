import React from "react";
import { Skeleton } from "./Skeleton";
import styles from "./ProductCard.module.css";

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className={styles.card}>
      <Skeleton style={{ height: "200px", borderRadius: 0 }} />
      <div className={styles.content}>
        <Skeleton style={{ height: "1.5rem", width: "80%" }} />
        <Skeleton style={{ height: "1rem", width: "60%" }} />
        <Skeleton style={{ height: "3rem", width: "100%" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2)" }}>
          <Skeleton style={{ height: "1rem", width: "70%" }} />
          <Skeleton style={{ height: "1rem", width: "50%" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
          <Skeleton style={{ height: "2rem", width: "4rem" }} />
          <Skeleton style={{ height: "2.5rem", width: "6rem" }} />
        </div>
      </div>
    </div>
  );
};