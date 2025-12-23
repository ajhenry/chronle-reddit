const isDevelopment = () => process.env.LOCAL_MODE === 'true' || process.env.REDDIT_MODE === 'true';

/**
 * Get the current date in EST timezone as YYYY-MM-DD string.
 * Uses America/New_York which automatically handles EST/EDT transitions.
 */
export function getESTDateString(date?: Date): string {
  const d = date ?? new Date();
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/**
 * Get the previous day's date string in EST timezone.
 */
export function getPreviousESTDateString(date?: Date): string {
  const d = date ?? new Date();
  const previous = new Date(d.getTime() - 24 * 60 * 60 * 1000);
  return getESTDateString(previous);
}

/**
 * Calculate TTL in seconds until midnight EST the day after tomorrow.
 * This gives users until the end of tomorrow to maintain their streak.
 * Example: If today is Monday 3pm EST, streak expires Wednesday 12:00am EST.
 */
export function getStreakExpirationTTL(): number {
  const now = new Date();

  // Get tomorrow's date in EST
  const tomorrowEST = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  tomorrowEST.setDate(tomorrowEST.getDate() + 2); // Day after tomorrow
  tomorrowEST.setHours(0, 0, 0, 0); // Midnight

  // Convert back to UTC for comparison
  // Create a date string for midnight EST day after tomorrow, then parse it
  const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const targetDateStr = dayAfterTomorrow.toLocaleDateString('en-CA', {
    timeZone: 'America/New_York',
  });

  // Parse the target date at midnight EST
  // Create date in EST timezone at midnight
  const midnightEST = new Date(`${targetDateStr}T00:00:00-05:00`);

  // Calculate seconds until expiration
  const ttlMs = midnightEST.getTime() - now.getTime();
  const ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));

  return ttlSeconds;
}

export { isDevelopment };
