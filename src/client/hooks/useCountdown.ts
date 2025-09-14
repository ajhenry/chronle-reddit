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
    const calculateTimeUntilMidnightEST = (): CountdownState => {
      const now = new Date();

      // Get current time in EST
      const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

      // Calculate midnight EST for today
      const midnightEST = new Date(estTime);
      midnightEST.setHours(24, 0, 0, 0); // Set to midnight of next day

      // If we've already passed midnight EST today, calculate for tomorrow
      if (estTime >= midnightEST) {
        midnightEST.setDate(midnightEST.getDate() + 1);
      }

      const timeDiff = midnightEST.getTime() - estTime.getTime();

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      return {
        hours,
        minutes,
        isLoading: false,
      };
    };

    // Set initial countdown
    setCountdown(calculateTimeUntilMidnightEST());

    // Update every minute
    const interval = setInterval(() => {
      setCountdown(calculateTimeUntilMidnightEST());
    }, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, []);

  return countdown;
};
