import React from 'react';
import { Search, Clock, QrCode } from 'lucide-react';
import styles from './HowItWorks.module.css';
import { useTranslation } from '../helpers/useTranslation';

interface HowItWorksProps {
  className?: string;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ className }) => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: <Search size={32} />,
      title: t('howItWorks.step1.title'),
      description: t('howItWorks.step1.description'),
    },
    {
      icon: <Clock size={32} />,
      title: t('howItWorks.step2.title'),
      description: t('howItWorks.step2.description'),
    },
    {
      icon: <QrCode size={32} />,
      title: t('howItWorks.step3.title'),
      description: t('howItWorks.step3.description'),
    },
  ];

  return (
    <section className={`${styles.container} ${className || ''}`}>
      <h2 className={styles.sectionTitle}>{t('howItWorks.title')}</h2>
      <p className={styles.sectionSubtitle}>
        {t('howItWorks.subtitle')}
      </p>
      <div className={styles.stepsGrid}>
        {steps.map((step, index) => (
          <div key={index} className={styles.stepCard}>
            <div className={styles.iconWrapper}>{step.icon}</div>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepDescription}>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};