/**
 * UTC time utilities for consistent server-side time handling
 */

/**
 * Gets current UTC timestamp in milliseconds
 */
export const getCurrentUTCTime = (): number => {
  return Date.now();
};

/**
 * Gets current UTC date as ISO string
 */
export const getCurrentUTCISOString = (): string => {
  return new Date().toISOString();
};

/**
 * Converts a date string to UTC timestamp
 */
export const toUTCTimestamp = (dateString: string): number => {
  return new Date(dateString).getTime();
};

/**
 * Gets today's date in EST timezone (for game day logic)
 */
export const getTodayEST = (): string => {
  return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }).split('T')[0]!;
};

/**
 * Gets today's UTC date string (YYYY-MM-DD format)
 */
export const getTodayUTC = (): string => {
  return new Date().toISOString().split('T')[0]!;
};
