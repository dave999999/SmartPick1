import React from 'react';
import styles from './FloatingActionButton.module.css';

interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export const FloatingActionButton = ({ children, className, ...props }: FloatingActionButtonProps) => {
  return (
    <button className={`${styles.fab} ${className || ''}`} {...props}>
      {children}
    </button>
  );
};