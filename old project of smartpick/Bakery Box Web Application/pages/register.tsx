import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { PasswordRegisterForm } from "../components/PasswordRegisterForm";
import { OAuthButtonGroup } from "../components/OAuthButtonGroup";
import { Separator } from "../components/Separator";
import { Store } from "lucide-react";
import { useTranslation } from "../helpers/useTranslation";
import styles from "./register.module.css";

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t("auth.registerPageTitle")}</title>
        <meta name="description" content={t("auth.registerPageDescription")} />
      </Helmet>
      <div className={styles.container}>
        <div className={styles.registerCard}>
          {/* Logo and Welcome Section */}
          <div className={styles.header}>
            <Link to="/" className={styles.logoLink}>
              <div className={styles.logoIcon}>
                <Store size={32} />
              </div>
            </Link>
            <h1 className={styles.title}>{t("auth.registerHeadline")}</h1>
            <p className={styles.subtitle}>{t("auth.registerSubtitle")}</p>
          </div>

          {/* OAuth Section */}
          <div className={styles.oauthSection}>
            <OAuthButtonGroup />
          </div>

          {/* Divider */}
          <div className={styles.dividerContainer}>
            <Separator />
            <span className={styles.dividerText}>
              {t("auth.orSignUpWithEmail")}
            </span>
            <Separator />
          </div>

          {/* Email/Password Form */}
          <div className={styles.formSection}>
            <PasswordRegisterForm />
          </div>

          {/* Footer Section */}
          <div className={styles.footer}>
            <p className={styles.footerText}>
              {t("auth.alreadyHaveAccount")}{" "}
              <Link to="/login" className={styles.loginLink}>
                {t("nav.login")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;