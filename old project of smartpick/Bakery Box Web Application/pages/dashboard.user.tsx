import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { useAuth } from "../helpers/useAuth";
import { useTranslation } from "../helpers/useTranslation";
import {
  useGetProductsQuery,
  useGetMyOrdersQuery,
  useCreateReservationMutation,
} from "../helpers/useFoodWasteQueries";
import { ProductsMap } from "../components/ProductsMap";
import { OrderCard } from "../components/OrderCard";
import { Skeleton } from "../components/Skeleton";
import { Button } from "../components/Button";
import { UserReservations } from "../components/UserReservations";
import { AlertCircle, Heart, MapPin, ShoppingBag, Ticket } from "lucide-react";
import styles from "./dashboard.user.module.css";
import { type OutputType as ProductsType } from "../endpoints/products/list_GET.schema";

const UserDashboardPage = () => {
  const { authState } = useAuth();
  const { t } = useTranslation();
  const {
    data: productsData,
    isFetching: isProductsFetching,
    error: productsError,
  } = useGetProductsQuery();
  const {
    data: ordersData,
    isFetching: isOrdersFetching,
    error: ordersError,
  } = useGetMyOrdersQuery();

  const createReservationMutation = useCreateReservationMutation();

  const isAuthenticated = authState.type === "authenticated";

  const handleReserveClick = (item: ProductsType[0]) => {
    createReservationMutation.mutate({
      productId: item.product.id,
      quantity: 1,
    });
  };

  const welcomeMessage =
    authState.type === "authenticated"
      ? t("partner.welcome").replace("{name}", authState.user.displayName)
      : t("partner.welcomeDefault");

  const recentOrders = ordersData?.slice(0, 3);

  const renderRecentOrders = () => {
    if (isOrdersFetching) {
      return (
        <div className={styles.ordersGrid}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className={styles.orderSkeleton} />
          ))}
        </div>
      );
    }

    if (ordersError) {
      return (
        <div className={styles.errorState}>
          <AlertCircle />
          <span>{t("orders.errorLoading")}</span>
        </div>
      );
    }

    if (!recentOrders || recentOrders.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>{t("orders.noOrders")}</p>
          <Button asChild>
            <Link to="/">{t("orders.browseBakeries")}</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className={styles.ordersGrid}>
        {recentOrders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>My Dashboard - {t("nav.appName")}</title>
        <meta name="description" content="Your personal dashboard on SmartPick." />
      </Helmet>
      <div className={styles.dashboardContainer}>
        <header className={styles.header}>
          <h1 className={styles.title}>My Dashboard</h1>
          <p className={styles.welcomeMessage}>{welcomeMessage}</p>
        </header>

        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.mapCard}`}>
            <div className={styles.cardHeader}>
              <MapPin />
              <h2 className={styles.cardTitle}>Nearby Bakeries</h2>
            </div>
            <div className={styles.cardContent}>
              {isProductsFetching && (
                <Skeleton className={styles.mapSkeleton} />
              )}
              {productsError && (
                <div className={styles.errorState}>
                  <AlertCircle />
                  <span>Could not load map data.</span>
                </div>
              )}
              {productsData && (
                <ProductsMap
                  items={productsData}
                  isAuthenticated={isAuthenticated}
                  onReserveClick={handleReserveClick}
                />
              )}
            </div>
          </section>

          <div className={styles.sideGrid}>
            <section className={`${styles.card} ${styles.ordersGrid}`}>
              <div className={styles.cardHeader}>
                <ShoppingBag />
                <h2 className={styles.cardTitle}>Recent Orders</h2>
                {ordersData && ordersData.length > 3 && (
                  <Link to="/orders" className={styles.viewAllLink}>
                    View All
                  </Link>
                )}
              </div>
              <div className={styles.cardContent}>{renderRecentOrders()}</div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <Ticket />
                <h2 className={styles.cardTitle}>My Reservations</h2>
              </div>
              <div className={styles.cardContent}>
                <UserReservations />
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <Heart />
                <h2 className={styles.cardTitle}>My Favorites</h2>
              </div>
              <div className={`${styles.cardContent} ${styles.placeholderContent}`}>
                <p>Your favorite bakeries will appear here.</p>
                <span>Feature coming soon!</span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDashboardPage;