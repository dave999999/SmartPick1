import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Store, Map, List } from "lucide-react";
import { useTranslation } from "../helpers/useTranslation";
import { useGetProductsQuery, useCreateReservationMutation } from "../helpers/useFoodWasteQueries";
import { useAuth } from "../helpers/useAuth";
import { ProductsMap } from "../components/ProductsMap";
import { ProductFilters, type FilterState } from "../components/ProductFilters";
import { HowItWorks } from "../components/HowItWorks";
import { NotificationBanner } from "../components/NotificationBanner";
import { ProductCard } from "../components/ProductCard";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";

import type { OutputType } from "../endpoints/products/list_GET.schema";
import styles from "./_index.module.css";

type ProductWithBusiness = OutputType[0];

const BANNER_DISMISS_KEY = "bakerybox_banner_dismissed";
const PENALTY_BANNER_DISMISS_KEY = "bakerybox_penalty_banner_dismissed";

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    minPrice: "",
    maxPrice: "",
    businessType: "",
    distance: "",
    sortBy: "",
  });

  // User location state
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // View mode state (map or list)
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Banner dismissed states
  const [isPenaltyBannerDismissed, setIsPenaltyBannerDismissed] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    try {
      const dismissed = localStorage.getItem(BANNER_DISMISS_KEY);
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const now = Date.now();
        const oneDayInMs = 24 * 60 * 60 * 1000;
        // Check if dismissed within the last 24 hours
        if (now - dismissedTime < oneDayInMs) {
          return true;
        }
      }
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
    return false;
  });

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("User location obtained:", {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Geolocation permission denied or error:", error.message);
          // Silently fail - user can still browse without distance filtering
        }
      );
    } else {
      console.log("Geolocation not supported by browser");
    }
  }, []);

  // Build query parameters from filters
  const queryParams = useMemo(() => {
    const params: any = {};
    
    if (filters.search) params.search = filters.search;
    if (filters.minPrice) params.minPrice = parseFloat(filters.minPrice);
    if (filters.maxPrice) params.maxPrice = parseFloat(filters.maxPrice);
    if (filters.businessType && filters.businessType !== "__all") {
      params.businessType = filters.businessType;
    }
    if (filters.sortBy && filters.sortBy !== "__none") {
      params.sortBy = filters.sortBy;
    }
    
    // Add user location if available
    if (userLocation) {
      params.userLat = userLocation.latitude;
      params.userLng = userLocation.longitude;
      
      // Add distance filter if specified and location is available
      if (filters.distance && filters.distance !== "__all") {
        params.distance = parseFloat(filters.distance);
      }
    }
    
    return params;
  }, [filters, userLocation]);

  // Fetch products with filters
  const { data, isFetching, error } = useGetProductsQuery(queryParams);

  // Fetch total count without filters for comparison
  const { data: totalData } = useGetProductsQuery(
    userLocation
      ? { userLat: userLocation.latitude, userLng: userLocation.longitude }
      : undefined
  );

  // Auth and mutations
  const { authState } = useAuth();
  const createReservationMutation = useCreateReservationMutation();

  const handleReserveClick = async (item: ProductWithBusiness) => {
    // Check if user is authenticated
    if (authState.type !== "authenticated") {
      console.log("User not authenticated, cannot reserve");
      return;
    }

    console.log("Creating reservation for product:", item.product.id);

    try {
      await createReservationMutation.mutateAsync({
        productId: item.product.id,
        quantity: 1,
      });
      // Success toast and query invalidation is handled by the mutation hook
    } catch (error) {
      console.error("Failed to create reservation:", error);
      // Error toast is handled by the mutation hook
    }
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    console.log("Filters updated:", newFilters);
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    console.log("Clearing all filters");
    setFilters({
      search: "",
      minPrice: "",
      maxPrice: "",
      businessType: "",
      distance: "",
      sortBy: "",
    });
  };

  const handleBannerDismiss = () => {
    console.log("Banner dismissed");
    setIsBannerDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISS_KEY, Date.now().toString());
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
  };

  const handlePenaltyBannerDismiss = () => {
    console.log("Penalty banner dismissed");
    setIsPenaltyBannerDismissed(true);
  };

  // Helper to format time remaining
  const formatTimeRemaining = useCallback((penaltyUntil: Date) => {
    const now = new Date();
    const diff = penaltyUntil.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} ${t('penalty.days')}`;
    } else if (hours > 0) {
      return `${hours} ${t('penalty.hours')}`;
    } else {
      return `${minutes} ${t('penalty.minutes')}`;
    }
  }, [t]);

  // Check if user has active penalty
  const userPenalty = useMemo(() => {
    if (authState.type !== "authenticated" || !authState.user.penaltyUntil) {
      return null;
    }
    
    const penaltyUntil = new Date(authState.user.penaltyUntil);
    const now = new Date();
    
    if (penaltyUntil > now) {
      const timeRemaining = formatTimeRemaining(penaltyUntil);
      return timeRemaining ? { penaltyUntil, timeRemaining } : null;
    }
    
    return null;
  }, [authState, formatTimeRemaining]);

  // Reset penalty banner dismissal when penalty changes or expires
  useEffect(() => {
    if (!userPenalty) {
      setIsPenaltyBannerDismissed(false);
    }
  }, [userPenalty]);

  const resultsCount = data?.length || 0;
  const totalCount = totalData?.length || 0;

  // Determine if banners should be shown
  const shouldShowPenaltyBanner = !isPenaltyBannerDismissed && userPenalty !== null;
  const shouldShowBanner = !isBannerDismissed && userLocation && data && data.length > 0;

  return (
    <>
      <Helmet>
        <title>{t("home.pageTitle")}</title>
        <meta name="description" content={t("home.pageDescription")} />
      </Helmet>

      {shouldShowPenaltyBanner && (
        <div className={styles.bannerContainer}>
          <NotificationBanner
            message={`⚠️ ${t('penalty.active')}: ${t('penalty.message')} ${t('penalty.timeRemaining')}: ${userPenalty.timeRemaining}.`}
            variant="error"
            dismissible={true}
            onDismiss={handlePenaltyBannerDismiss}
          />
        </div>
      )}

      {shouldShowBanner && (
        <div className={styles.bannerContainer}>
          <NotificationBanner
            message={`✨ ${resultsCount} exclusive deals available near you!`}
            variant="info"
            dismissible={true}
            onDismiss={handleBannerDismiss}
          />
        </div>
      )}

      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{t("hero.headline")}</h1>
          <p className={styles.heroSubtitle}>{t("hero.subheading")}</p>
          <div className={styles.heroActions}>
            <Button variant="primary" size="lg" asChild>
              <a href="#browse-section">
                {t("hero.ctaButton")}
              </a>
            </Button>
            <Button variant="outline" size="md" asChild>
              <Link to="/partner/register">
                <Store />
                {t("home.businessOwnerCta")}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      

      <section className={styles.howItWorksSection}>
        <HowItWorks />
      </section>

      <section id="browse-section" className={styles.filtersSection}>
        <div className={styles.filtersSectionHeader}>
          <h2 className={styles.sectionTitle}>{t("home.availableProducts")}</h2>
          <div className={styles.viewToggle}>
            <Button
              variant={viewMode === "map" ? "primary" : "outline"}
              size="sm"
              onClick={() => setViewMode("map")}
              className={styles.viewToggleButton}
            >
              <Map size={18} />
              Map View
            </Button>
            <Button
              variant={viewMode === "list" ? "primary" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={styles.viewToggleButton}
            >
              <List size={18} />
              List View
            </Button>
          </div>
        </div>
        <ProductFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          resultsCount={resultsCount}
          totalCount={totalCount}
        />
      </section>

      {viewMode === "map" && (
        <section className={styles.mapSection}>
          <ProductsMap
            items={data || []}
            onReserveClick={handleReserveClick}
            isAuthenticated={authState.type === "authenticated"}
          />
        </section>
      )}

      {viewMode === "list" && (
        <section className={styles.listSection}>
          {isFetching && (
            <div className={styles.productsGrid}>
              {[...Array(6)].map((_, index) => (
                <div key={index} className={styles.skeletonCard}>
                  <Skeleton style={{ width: "100%", height: "200px" }} />
                  <div style={{ padding: "var(--spacing-6)" }}>
                    <Skeleton style={{ width: "80%", height: "1.5rem", marginBottom: "var(--spacing-3)" }} />
                    <Skeleton style={{ width: "60%", height: "1rem", marginBottom: "var(--spacing-4)" }} />
                    <Skeleton style={{ width: "100%", height: "3rem" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className={styles.errorState}>
              <h2>{t("home.errorLoading")}</h2>
              <p>
                {error instanceof Error ? error.message : t("home.errorUnknown")}
              </p>
            </div>
          )}

          {!isFetching && data && data.length === 0 && (
            <div className={styles.emptyState}>
              <h2>{t("home.noProductsFound")}</h2>
              <p>{t("home.noProductsDefault")}</p>
            </div>
          )}

          {!isFetching && data && data.length > 0 && (
            <div className={styles.productsGrid}>
              {data.map((item) => (
                <ProductCard
                  key={item.product.id}
                  item={item}
                  onReserveClick={
                    authState.type === "authenticated"
                      ? () => handleReserveClick(item)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
};

export default HomePage;