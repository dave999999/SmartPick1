import React from "react";
import { Clock } from "lucide-react";
import styles from "./CountdownTimer.module.css";

interface CountdownTimerProps {
  seconds: number;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  seconds,
  className,
}) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className={`${styles.countdown} ${className || ""}`}>
      <Clock size={16} />
      <span>{formattedTime}</span>
    </div>
  );
};