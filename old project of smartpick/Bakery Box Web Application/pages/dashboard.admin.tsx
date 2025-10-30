import React from "react";
import { Helmet } from "react-helmet";
import { useAuth } from "../helpers/useAuth";
import { useTranslation } from "../helpers/useTranslation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/Tabs";
import AdminUserTable from "../components/AdminUserTable";
import AdminBusinessTable from "../components/AdminBusinessTable";
import AdminProductsTable from "../components/AdminProductsTable";
import {
  useAdminStats,
  useAdminBusinesses,
  useAdminUsers,
  useAdminProducts,
} from "../helpers/useAdminQueries";
import { StatCard } from "../components/StatCard";
import {
  Building,
  Users,
  Package,
  ClipboardList,
  LayoutDashboard,
  PackageSearch,
  Store,
} from "lucide-react";
import styles from "./dashboard.admin.module.css";

const AdminDashboardPage = () => {
  const { authState } = useAuth();
  const { t } = useTranslation();
  const { data: stats, isFetching: isStatsFetching } = useAdminStats();

  const welcomeMessage =
    authState.type === "authenticated"
      ? t("partner.welcome").replace("{name}", authState.user.displayName)
      : t("partner.welcomeDefault");

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - {t("nav.appName")}</title>
        <meta name="description" content="Manage SmartPick users, businesses, and products." />
      </Helmet>
      <div className={styles.dashboardContainer}>
        <header className={styles.header}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.welcomeMessage}>{welcomeMessage}</p>
        </header>

        <Tabs defaultValue="overview" className={styles.tabs}>
          <TabsList>
            <TabsTrigger value="overview">
              <LayoutDashboard size={16} />
              {t("admin.overview")}
            </TabsTrigger>
            <TabsTrigger value="businesses">
              <Store size={16} />
              {t("admin.businesses")}
            </TabsTrigger>
            <TabsTrigger value="products">
              <PackageSearch size={16} />
              Products
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users size={16} />
              {t("admin.users")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className={styles.tabContent}>
            <div className={styles.statsGrid}>
              <StatCard
                title={t("admin.totalUsers")}
                value={stats?.totalUsers ?? 0}
                icon={<Users />}
                isLoading={isStatsFetching}
              />
              <StatCard
                title={t("admin.totalPartners")}
                value={stats?.totalPartners ?? 0}
                icon={<Building />}
                isLoading={isStatsFetching}
              />
              <StatCard
                title={t("admin.pendingRegistrations")}
                value={stats?.pendingRegistrations ?? 0}
                icon={<ClipboardList />}
                isLoading={isStatsFetching}
                variant="warning"
              />
              <StatCard
                title={t("admin.totalProducts")}
                value={stats?.totalProducts ?? 0}
                icon={<Package />}
                isLoading={isStatsFetching}
              />
            </div>
          </TabsContent>

          <TabsContent value="businesses" className={styles.tabContent}>
            <AdminBusinessTable />
          </TabsContent>

          <TabsContent value="products" className={styles.tabContent}>
            <AdminProductsTable />
          </TabsContent>

          <TabsContent value="users" className={styles.tabContent}>
            <AdminUserTable />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default AdminDashboardPage;