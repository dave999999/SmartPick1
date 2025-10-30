import React from "react";
import { Skeleton } from "./Skeleton";
import styles from "./StatCard.module.css";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  isLoading?: boolean;
  variant?: "default" | "warning";
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  isLoading = false,
  variant = "default",
  className,
}) => {
  return (
    <div
      className={`${styles.card} ${styles[variant]} ${className || ""}`}
    >
      <div className={styles.iconWrapper}>{icon}</div>
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        {isLoading ? (
          <Skeleton className={styles.valueSkeleton} />
        ) : (
          <p className={styles.value}>{value}</p>
        )}
      </div>
    </div>
  );
};