/**
 * Gets today's date in EST timezone
 */
export const getTodayEST = (): string => {
  return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }).split('T')[0]!;
};
