import { useState, useEffect } from 'react';

interface CountdownState {
  hours: number;
  minutes: number;
  isLoading: boolean;
}

export const useCountdown = (): CountdownState => {
  const [countdown, setCountdown] = useState<CountdownState>({
    hours: 0,
    minutes: 0,
    isLoading: true,
  });

  useEffect(() => {
    const calculateTimeUntilMidnightUTC = (): CountdownState => {
      const now = new Date();

      // Calculate midnight UTC for next day
      const midnightUTC = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
      );

      const timeDiff = midnightUTC.getTime() - now.getTime();

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      return {
        hours,
        minutes,
        isLoading: false,
      };
    };

    // Set initial countdown
    setCountdown(calculateTimeUntilMidnightUTC());

    // Update every minute
    const interval = setInterval(() => {
      setCountdown(calculateTimeUntilMidnightUTC());
    }, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, []);

  return countdown;
};
