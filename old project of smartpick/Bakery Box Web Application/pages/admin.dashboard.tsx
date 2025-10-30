import React, { useState } from "react";
import { Helmet } from "react-helmet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/Tabs";
import { useAdminStats } from "../helpers/useAdminQueries";
import {
  Users,
  Building,
  ClipboardList,
  Package,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "../components/Skeleton";
import AdminBusinessTable from "../components/AdminBusinessTable";
import AdminPartnerTable from "../components/AdminPartnerTable";
import AdminUserTable from "../components/AdminUserTable";
import AdminProductsTable from "../components/AdminProductsTable";
import { useTranslation } from "../helpers/useTranslation";
import styles from "./admin.dashboard.module.css";

const StatCard = ({
  title,
  value,
  icon,
  isLoading,
  onClick,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  isLoading: boolean;
  onClick?: () => void;
}) => (
  <div 
    className={`${styles.statCard} ${onClick ? styles.statCardClickable : ''}`}
    onClick={onClick}
  >
    <div className={styles.statIcon}>{icon}</div>
    <div className={styles.statContent}>
      <h3 className={styles.statTitle}>{title}</h3>
      {isLoading ? (
        <Skeleton style={{ height: "2rem", width: "50px" }} />
      ) : (
        <p className={styles.statValue}>{value}</p>
      )}
    </div>
  </div>
);

const OverviewTab = ({ onProductsClick }: { onProductsClick: () => void }) => {
  const { data, isFetching, error } = useAdminStats();
  const { t } = useTranslation();

  if (error) {
    return (
      <div className={styles.errorState}>
        <AlertCircle /> {t("common.error")}
      </div>
    );
  }

  return (
    <div className={styles.statsGrid}>
      <StatCard
        title={t("admin.totalUsers")}
        value={data?.totalUsers ?? 0}
        icon={<Users />}
        isLoading={isFetching}
      />
      <StatCard
        title={t("admin.totalPartners")}
        value={data?.totalPartners ?? 0}
        icon={<Building />}
        isLoading={isFetching}
      />
      <StatCard
        title="Total Orders"
        value={data?.totalOrders ?? 0}
        icon={<ClipboardList />}
        isLoading={isFetching}
      />
      <StatCard
        title="Total Products"
        value={data?.totalProducts ?? 0}
        icon={<Package />}
        isLoading={isFetching}
        onClick={onProductsClick}
      />
      <StatCard
        title={t("admin.pendingRegistrations")}
        value={data?.pendingRegistrations ?? 0}
        icon={<Clock />}
        isLoading={isFetching}
      />
    </div>
  );
};

const AdminDashboardPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      <Helmet>
        <title>{t("nav.adminDashboard")} | SmartPick</title>
      </Helmet>
      <div className={styles.container}>
        <h1 className={styles.title}>{t("nav.adminDashboard")}</h1>
        <Tabs value={activeTab} onValueChange={setActiveTab} className={styles.tabs}>
          <TabsList>
            <TabsTrigger value="overview">{t("admin.overview")}</TabsTrigger>
            <TabsTrigger value="businesses">ბიზნესები</TabsTrigger>
            <TabsTrigger value="partners">პარტნიორები</TabsTrigger>
            <TabsTrigger value="users">მომხმარებლები</TabsTrigger>
            <TabsTrigger value="products">პროდუქტები</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className={styles.tabContent}>
            <OverviewTab onProductsClick={() => setActiveTab("products")} />
          </TabsContent>
          <TabsContent value="businesses" className={styles.tabContent}>
            <AdminBusinessTable />
          </TabsContent>
          <TabsContent value="partners" className={styles.tabContent}>
            <AdminPartnerTable />
          </TabsContent>
          <TabsContent value="users" className={styles.tabContent}>
            <AdminUserTable />
          </TabsContent>
          <TabsContent value="products" className={styles.tabContent}>
            <AdminProductsTable />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default AdminDashboardPage;