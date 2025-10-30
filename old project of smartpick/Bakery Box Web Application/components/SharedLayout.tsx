import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../helpers/useAuth";
import { useTranslation } from "../helpers/useTranslation";
import { Button } from "./Button";
import { NotificationBell } from "./NotificationBell";
import { LogIn, LogOut, User as UserIcon, Loader, ShoppingBag, Shield, LayoutDashboard, MapPin, Menu, X } from "lucide-react";
import { LanguageSwitch } from "./LanguageSwitch";
import styles from "./SharedLayout.module.css";

export const SharedLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { authState, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const renderAdminNav = () => {
    if (authState.type === "authenticated" && authState.user.role === "admin") {
      return (
        <Link to="/admin/dashboard" className={styles.adminLink} onClick={closeMobileMenu}>
          <Shield size={18} />
          {t("nav.adminDashboard")}
        </Link>
      );
    }
    return null;
  };

  const renderDashboardLink = () => {
    if (authState.type !== "authenticated") {
      return null;
    }

    const { role } = authState.user;

    if (role === "user") {
      return (
        <Link to="/dashboard/user" className={styles.navLink} onClick={closeMobileMenu}>
          <LayoutDashboard size={16} />
          {t("nav.myDashboard")}
        </Link>
      );
    }

    if (role === "partner") {
      return (
        <Link to="/dashboard/partner" className={styles.navLink} onClick={closeMobileMenu}>
          <LayoutDashboard size={16} />
          {t("nav.partnerDashboard")}
        </Link>
      );
    }

    return null;
  };

  const renderAuthControls = () => {
    if (authState.type === "loading") {
      return (
        <Button variant="ghost" disabled>
          <Loader className={styles.spinner} size={18} />
        </Button>
      );
    }

    if (authState.type === "authenticated") {
      return (
        <div className={styles.authControls}>
          <span className={styles.userName}>
            <UserIcon size={16} />
            {authState.user.displayName}
          </span>
          {renderDashboardLink()}
          {authState.user.role === "user" && (
            <Link to="/orders" className={styles.navLink} onClick={closeMobileMenu}>
              <ShoppingBag size={16} />
              {t("nav.myOrders")}
            </Link>
          )}
          <NotificationBell />
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut size={16} />
            {t("nav.logout")}
          </Button>
        </div>
      );
    }

    return (
      <Button asChild size="sm">
        <Link to="/login" onClick={closeMobileMenu}>
          <LogIn size={16} />
          {t("nav.login")}
        </Link>
      </Button>
    );
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo} onClick={closeMobileMenu}>
            <MapPin size={24} className={styles.logoIcon} />
            {t("nav.appName")}
            <span className={styles.tagline}>
              {t("nav.tagline")}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className={styles.desktopNav}>
            <Link to="/" className={styles.mainNavLink}>
              {t("nav.home")}
            </Link>
            <Link to="/partner/register" className={styles.mainNavLink}>
              {t("auth.newPartner") ? t("auth.newPartner").replace("?", "") : "Join Us"}
            </Link>
            {renderAdminNav()}
            <LanguageSwitch className={styles.languageSwitch} />
            {renderAuthControls()}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className={styles.mobileMenuButton}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className={styles.mobileNav}>
            <Link to="/" className={styles.mobileNavLink} onClick={closeMobileMenu}>
              {t("nav.home")}
            </Link>
            <Link to="/partner/register" className={styles.mobileNavLink} onClick={closeMobileMenu}>
              {t("auth.newPartner") ? t("auth.newPartner").replace("?", "") : "Join Us"}
            </Link>
            {renderAdminNav()}
            <div className={styles.mobileNavDivider} />
            {renderAuthControls()}
            <div className={styles.mobileLanguageSwitch}>
              <LanguageSwitch />
            </div>
          </div>
        )}
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>{t("footer.copyright").replace("{year}", new Date().getFullYear().toString())}</p>
      </footer>
    </div>
  );
};