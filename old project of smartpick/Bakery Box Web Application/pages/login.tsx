import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { PasswordLoginForm } from "../components/PasswordLoginForm";
import { OAuthButtonGroup } from "../components/OAuthButtonGroup";
import { Separator } from "../components/Separator";
import { Store } from "lucide-react";
import { useTranslation } from "../helpers/useTranslation";
import styles from "./login.module.css";

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <>
      <Helmet>
        <title>{t("auth.pageTitle")}</title>
        <meta name="description" content={t("auth.pageDescription")} />
      </Helmet>
      <div className={styles.container}>
        <div className={styles.loginCard}>
          {/* Logo and Welcome Section */}
          <div className={styles.header}>
            <Link to="/" className={styles.logoLink}>
              <div className={styles.logoIcon}>
                <Store size={32} />
              </div>
            </Link>
            <h1 className={styles.title}>Welcome back, Smart Shopper 👋</h1>
            <p className={styles.subtitle}>
              Log in to grab your next Smart Pick before it's gone.
            </p>
          </div>

          {/* OAuth Section */}
          <div className={styles.oauthSection}>
            <OAuthButtonGroup />
          </div>

          {/* Divider */}
          <div className={styles.dividerContainer}>
            <Separator />
            <span className={styles.dividerText}>or log in with your email</span>
            <Separator />
          </div>

          {/* Email/Password Form */}
          <div className={styles.formSection}>
            <PasswordLoginForm />
          </div>

          {/* Footer Section */}
          <div className={styles.footer}>
            <p className={styles.footerText}>
              {t("auth.dontHaveAccount")}{" "}
              <Link to="/register" className={styles.signUpLink}>
                {t("auth.signUp")}
              </Link>
            </p>
            <Link to="/partner/register" className={styles.partnerLink}>
              {t("auth.areYouPartner")} Register your business
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;