import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { useAuth } from "../helpers/useAuth";
import { useTranslation } from "../helpers/useTranslation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/Tabs";
import { PartnerReservations } from "../components/PartnerReservations";
import { StatCard } from "../components/StatCard";
import { FloatingActionButton } from "../components/FloatingActionButton";
import { ProductStatusBadge } from "../components/ProductStatusBadge";
import { CountdownTimer } from "../components/CountdownTimer";
import { RepostProductDialog } from "../components/RepostProductDialog";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { Button } from "../components/Button";
import { Switch } from "../components/Switch";
import { AddProductForm } from "../components/AddProductForm";
import { BusinessRegistrationForm } from "../components/BusinessRegistrationForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/Dialog";
import { Skeleton } from "../components/Skeleton";
import { NotificationBanner } from "../components/NotificationBanner";
import {
  useGetMyProductsQuery,
  useGetMyBusinessesQuery,
  useGetPartnerStatsQuery,
  useGetPartnerReservationsQuery,
  usePauseProductMutation,
  useRepostProductMutation,
  useDeleteProductMutation,
} from "../helpers/useFoodWasteQueries";
import { Bell, BellOff, Plus, Edit, RefreshCw, Pause, Trash2, Package, QrCode, BarChart3, Settings, AlertCircle } from "lucide-react";
import type { MyProduct } from "../endpoints/products/my_GET.schema";
import styles from "./dashboard.partner.module.css";

const PartnerDashboardPage = () => {
  const { authState } = useAuth();
  const { t } = useTranslation();
  const { data: businesses, isFetching: businessesLoading } = useGetMyBusinessesQuery();
  const { data: products, isFetching: productsLoading } = useGetMyProductsQuery();
  const { data: stats, isFetching: statsLoading } = useGetPartnerStatsQuery();
  const { data: reservations, isFetching: reservationsLoading } = useGetPartnerReservationsQuery();
  const pauseMutation = usePauseProductMutation();
  const deleteMutation = useDeleteProductMutation();

  const [activeTab, setActiveTab] = useState("my-listings");
  const [newReservationsCount, setNewReservationsCount] = useState(0);
  const [showReservationBanner, setShowReservationBanner] = useState(false);
  const hasRequestedNotificationPermission = useRef(false);
  const hasCheckedReservations = useRef(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('partner-notifications-enabled');
      return stored !== null ? stored === 'true' : true;
    } catch (error) {
      console.error('Failed to read notification preference from localStorage:', error);
      return true;
    }
  });
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [repostProduct, setRepostProduct] = useState<MyProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<MyProduct | null>(null);
  const [pauseProduct, setPauseProduct] = useState<MyProduct | null>(null);

  const hasBusinesses = businesses && businesses.length > 0;

  // Request notification permission on first load
  useEffect(() => {
    if (hasRequestedNotificationPermission.current) return;
    hasRequestedNotificationPermission.current = true;

    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, [notificationsEnabled]);

  // Check for new reservations on mount
  useEffect(() => {
    if (hasCheckedReservations.current || reservationsLoading || !reservations || !notificationsEnabled) {
      return;
    }

    hasCheckedReservations.current = true;

    try {
      const lastCheckStr = localStorage.getItem('partner-last-reservations-check');
      const lastCheck = lastCheckStr ? new Date(lastCheckStr) : null;

      // Filter reservations created after last check
      const newReservations = lastCheck
        ? reservations.filter(r => new Date(r.expiresAt) > lastCheck)
        : [];

      if (newReservations.length > 0) {
        setNewReservationsCount(newReservations.length);
        setShowReservationBanner(true);

        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Reservations!', {
            body: `You have ${newReservations.length} new reservation${newReservations.length > 1 ? 's' : ''}.`,
            icon: '/icon-192x192.png',
          });
        }

        // Play sound alert
        playNotificationSound();
      }
    } catch (error) {
      console.error('Error checking new reservations:', error);
    }
  }, [reservations, reservationsLoading, notificationsEnabled]);

  // Redirect to registration if no businesses
  useEffect(() => {
    if (!businessesLoading && !hasBusinesses) {
      setActiveTab("register-business");
    }
  }, [hasBusinesses, businessesLoading]);

  // Update last check timestamp when user views reservations tab
  useEffect(() => {
    if (activeTab === 'reservations') {
      updateLastCheckTimestamp();
      setShowReservationBanner(false);
    }
  }, [activeTab]);

  const welcomeMessage =
    authState.type === "authenticated"
      ? t("partner.welcome").replace("{name}", authState.user.displayName)
      : t("partner.welcomeDefault");

  const playNotificationSound = () => {
    try {
      if (!('AudioContext' in window) && !('webkitAudioContext' in window)) {
        console.log('Web Audio API not supported');
        return;
      }

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      
      // Create oscillator for beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure beep sound (800 Hz frequency)
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      // Set volume and envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      // Play the beep
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log('Notification sound played');
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  const updateLastCheckTimestamp = () => {
    try {
      const now = new Date().toISOString();
      localStorage.setItem('partner-last-reservations-check', now);
      console.log('Updated last reservations check timestamp:', now);
    } catch (error) {
      console.error('Failed to update last check timestamp:', error);
    }
  };

  const handleNotificationToggle = (checked: boolean) => {
    setNotificationsEnabled(checked);
    try {
      localStorage.setItem('partner-notifications-enabled', checked.toString());
      console.log(`Partner notifications ${checked ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to save notification preference to localStorage:', error);
    }
  };

  const handleBannerDismiss = () => {
    setShowReservationBanner(false);
    updateLastCheckTimestamp();
  };

  const handleBannerAction = () => {
    setActiveTab('reservations');
  };

  const handlePauseConfirm = () => {
    if (pauseProduct) {
      pauseMutation.mutate({ productId: pauseProduct.id });
      setPauseProduct(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteProduct) {
      deleteMutation.mutate({ productId: deleteProduct.id });
      setDeleteProduct(null);
    }
  };

  const calculateSecondsRemaining = (expiresAt: Date | string | null): number => {
    if (!expiresAt) return 0;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    return Math.max(0, Math.floor(diffMs / 1000));
  };

  const renderProductCard = (product: MyProduct) => {
    const isExpired = product.status === 'expired' || product.status === 'sold_out';
    const secondsRemaining = calculateSecondsRemaining(product.expiresAt);

    return (
      <div key={product.id} className={styles.productCard}>
        <div className={styles.cardImage}>
          <img
            src={product.imageUrl || "https://via.placeholder.com/300x200"}
            alt={product.title}
          />
          <div className={styles.cardBadge}>
            <ProductStatusBadge status={product.status ?? "available"} />
          </div>
        </div>
        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>{product.title}</h3>
          <p className={styles.cardBusiness}>{product.businessName}</p>
          <div className={styles.cardPrice}>
            <span className={styles.originalPrice}>${parseFloat(product.originalPrice).toFixed(2)}</span>
            <span className={styles.discountedPrice}>${parseFloat(product.discountedPrice).toFixed(2)}</span>
          </div>
          {!isExpired && secondsRemaining > 0 && (
            <div className={styles.cardTimer}>
              <CountdownTimer seconds={secondsRemaining} />
            </div>
          )}
          {isExpired && (
            <p className={styles.cardExpiredText}>
              This offer has ended. Reactivate to make it available today.
            </p>
          )}
        </div>
        <div className={styles.cardActions}>
          {isExpired ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setRepostProduct(product)}
            >
              <RefreshCw size={16} /> Reactivate
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRepostProduct(product)}
                title="Repost"
              >
                <RefreshCw size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPauseProduct(product)}
                title="Pause"
              >
                <Pause size={16} />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteProduct(product)}
            title="Delete"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    );
  };

  if (!hasBusinesses && !businessesLoading) {
    return (
      <>
        <Helmet>
          <title>{t("partner.dashboardTitle")} - {t("nav.appName")}</title>
        </Helmet>
        <div className={styles.dashboardContainer}>
          <header className={styles.header}>
            <h1 className={styles.title}>Welcome to SmartPick Partner</h1>
            <p className={styles.welcomeMessage}>
              Register your business to start listing products
            </p>
          </header>
          <div className={styles.registrationContainer}>
            <BusinessRegistrationForm onSuccess={() => window.location.reload()} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t("partner.dashboardTitle")} - {t("nav.appName")}</title>
        <meta name="description" content={t("partner.pageDescription")} />
      </Helmet>
      <div className={styles.dashboardContainer}>
        {showReservationBanner && (
        <div className={styles.bannerContainer}>
            <NotificationBanner
              message={t("partner.newReservationsMessage")
                .replace("{count}", newReservationsCount.toString())
                .replace("{plural}", newReservationsCount > 1 ? 's' : '')}
              variant="success"
              dismissible={true}
              onDismiss={handleBannerDismiss}
              actionText={t("partner.viewReservations")}
              onAction={handleBannerAction}
            />
          </div>
        )}
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>Partner Dashboard</h1>
              <p className={styles.welcomeMessage}>{welcomeMessage}</p>
            </div>
            <div className={styles.notificationToggle}>
              <div className={styles.toggleContainer}>
                {notificationsEnabled ? (
                  <Bell className={styles.notificationIcon} size={20} />
                ) : (
                  <BellOff className={styles.notificationIcon} size={20} />
                )}
                <div className={styles.toggleLabels}>
                  <label htmlFor="notification-toggle" className={styles.toggleLabel}>
                    {t("partner.enableNotifications") || "Enable Notifications"}
                  </label>
                  <span className={styles.toggleStatus}>
                    {notificationsEnabled
                      ? t("partner.notificationsEnabled") || "Notifications Enabled"
                      : t("partner.notificationsDisabled") || "Notifications Disabled"}
                  </span>
                </div>
                <Switch
                  id="notification-toggle"
                  checked={notificationsEnabled}
                  onCheckedChange={handleNotificationToggle}
                />
              </div>
            </div>
          </div>
        </header>

        <section className={styles.statsSection}>
          <StatCard
            title="Active Deals"
            value={stats?.activeDeals ?? 0}
            icon={<Package size={32} />}
            isLoading={statsLoading}
          />
          <StatCard
            title="Reservations Today"
            value={stats?.reservationsToday ?? 0}
            icon={<QrCode size={32} />}
            isLoading={statsLoading}
            variant="warning"
          />
          <StatCard
            title="Redeemed This Week"
            value={stats?.redeemedThisWeek ?? 0}
            icon={<BarChart3 size={32} />}
            isLoading={statsLoading}
          />
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className={styles.tabs}>
          <TabsList>
            <TabsTrigger value="my-listings">
              <Package size={16} /> My Listings
            </TabsTrigger>
            <TabsTrigger value="reservations">
              <QrCode size={16} /> Reservations
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 size={16} /> Stats & Insights
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings size={16} /> Account Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-listings" className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>My Listings</h2>
              <Button onClick={() => setShowAddProductModal(true)}>
                <Plus size={16} /> Add New Offer
              </Button>
            </div>
            {productsLoading ? (
              <div className={styles.productGrid}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={styles.productCard}>
                    <Skeleton style={{ height: '200px', marginBottom: 'var(--spacing-3)' }} />
                    <Skeleton style={{ height: '1.5rem', marginBottom: 'var(--spacing-2)' }} />
                    <Skeleton style={{ height: '1rem', marginBottom: 'var(--spacing-2)' }} />
                    <Skeleton style={{ height: '1rem' }} />
                  </div>
                ))}
              </div>
            ) : !products || products.length === 0 ? (
              <div className={styles.emptyState}>
                <Package size={48} />
                <h3>No products listed yet</h3>
                <p>Create your first offer to start selling</p>
                <Button onClick={() => setShowAddProductModal(true)}>
                  <Plus size={16} /> Add Your First Offer
                </Button>
              </div>
            ) : (
              <div className={styles.productGrid}>
                {products.map(renderProductCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reservations" className={styles.tabContent}>
            <PartnerReservations notificationsEnabled={notificationsEnabled} />
          </TabsContent>

          <TabsContent value="stats" className={styles.tabContent}>
            <div className={styles.emptyState}>
              <BarChart3 size={48} />
              <h3>Stats & Insights</h3>
              <p>Detailed analytics and insights coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="settings" className={styles.tabContent}>
            <div className={styles.emptyState}>
              <Settings size={48} />
              <h3>Account Settings</h3>
              <p>Account management features coming soon</p>
            </div>
          </TabsContent>
        </Tabs>

        <FloatingActionButton onClick={() => setShowAddProductModal(true)}>
          <Plus size={24} />
        </FloatingActionButton>
      </div>

      <Dialog open={showAddProductModal} onOpenChange={setShowAddProductModal}>
        <DialogContent className={styles.addProductDialog}>
          <DialogHeader>
            <DialogTitle>Add New Offer</DialogTitle>
            <DialogDescription>
              Create a new product listing for your customers
            </DialogDescription>
          </DialogHeader>
          <AddProductForm />
        </DialogContent>
      </Dialog>

      <RepostProductDialog
        product={repostProduct}
        isOpen={!!repostProduct}
        onClose={() => setRepostProduct(null)}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        description="This action cannot be undone. This will permanently delete the product from your listings."
        itemName={deleteProduct?.title || ""}
      />

      <Dialog open={!!pauseProduct} onOpenChange={(open) => !open && setPauseProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to pause "{pauseProduct?.title}"? It will no longer be visible to customers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPauseProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handlePauseConfirm}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PartnerDashboardPage;