import React from "react";
import { FlootLoginButton } from "./FlootLoginButton";
import { FacebookLoginButton } from "./FacebookLoginButton";
import styles from "./OAuthButtonGroup.module.css";

interface OAuthButtonGroupProps {
  className?: string;
  disabled?: boolean;
}

export const OAuthButtonGroup: React.FC<OAuthButtonGroupProps> = ({
  className,
  disabled,
}) => {
  return (
    <div className={`${styles.container} ${className || ""}`}>
      <FlootLoginButton disabled={disabled} />
      <FacebookLoginButton disabled={disabled} />
    </div>
  );
};
