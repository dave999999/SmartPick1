import React from "react";
import { useGetMyBusinessesQuery } from "../helpers/useFoodWasteQueries";
import { Skeleton } from "./Skeleton";
import { AlertTriangle, Info } from "lucide-react";
import styles from "./BusinessList.module.css";

export const BusinessList = () => {
  const { data, isFetching, error } = useGetMyBusinessesQuery();

  if (isFetching) {
    return <BusinessListSkeleton />;
  }

  if (error) {
    return (
      <div className={`${styles.messageContainer} ${styles.error}`}>
        <AlertTriangle size={24} />
        <p>
          Could not load your businesses. Please try again later.
          <br />
          <small>{error.message}</small>
        </p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`${styles.messageContainer} ${styles.info}`}>
        <Info size={24} />
        <p>
          You don't have any businesses associated with your account yet.
          <br />
          Please contact support to get your business registered.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {data.map((business) => (
        <div key={business.id} className={styles.card}>
          <div className={styles.cardHeader}>
            {business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={`${business.name} logo`}
                className={styles.logo}
              />
            )}
            <div className={styles.headerText}>
              <h3 className={styles.businessName}>{business.name}</h3>
              <span className={styles.businessType}>{business.businessType}</span>
            </div>
          </div>
          <p className={styles.description}>{business.description}</p>
          <div className={styles.details}>
            <p>
              <strong>Address:</strong> {business.address}
            </p>
            {business.phone && (
              <p>
                <strong>Phone:</strong> {business.phone}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const BusinessListSkeleton = () => (
  <div className={styles.grid}>
    {[...Array(2)].map((_, i) => (
      <div key={i} className={styles.card}>
        <div className={styles.cardHeader}>
          <Skeleton className={styles.logoSkeleton} />
          <div className={styles.headerText}>
            <Skeleton style={{ height: "1.5rem", width: "12rem", marginBottom: "0.5rem" }} />
            <Skeleton style={{ height: "1rem", width: "6rem" }} />
          </div>
        </div>
        <Skeleton style={{ height: "1rem", width: "90%", marginTop: "1rem" }} />
        <Skeleton style={{ height: "1rem", width: "80%", marginTop: "0.5rem" }} />
        <div className={styles.details} style={{ marginTop: "1.5rem" }}>
          <Skeleton style={{ height: "1rem", width: "100%" }} />
          <Skeleton style={{ height: "1rem", width: "50%", marginTop: "0.5rem" }} />
        </div>
      </div>
    ))}
  </div>
);