import { useState, useEffect } from "react";

const START_HOUR = 19; // 19:00
const END_HOUR = 21; // 21:00

export interface TimeWindowState {
  isInWindow: boolean;
  secondsUntilEnd: number;
  secondsUntilStart: number;
}

/**
 * Hook to check if current time is within the availability window (19:00-21:00)
 * and provide countdown information
 */
export const useTimeWindow = (): TimeWindowState => {
  const [state, setState] = useState<TimeWindowState>(() =>
    calculateTimeWindow()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setState(calculateTimeWindow());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return state;
};

function calculateTimeWindow(): TimeWindowState {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const currentTimeInSeconds = hours * 3600 + minutes * 60 + seconds;
  const startTimeInSeconds = START_HOUR * 3600;
  const endTimeInSeconds = END_HOUR * 3600;

  const isInWindow =
    currentTimeInSeconds >= startTimeInSeconds &&
    currentTimeInSeconds < endTimeInSeconds;

  let secondsUntilEnd = 0;
  let secondsUntilStart = 0;

  if (isInWindow) {
    secondsUntilEnd = endTimeInSeconds - currentTimeInSeconds;
  } else if (currentTimeInSeconds < startTimeInSeconds) {
    // Before start time today
    secondsUntilStart = startTimeInSeconds - currentTimeInSeconds;
  } else {
    // After end time, calculate until start time tomorrow
    secondsUntilStart = 24 * 3600 - currentTimeInSeconds + startTimeInSeconds;
  }

  return {
    isInWindow,
    secondsUntilEnd,
    secondsUntilStart,
  };
}