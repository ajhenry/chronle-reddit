/**
 * Gets the current server day in UTC format
 * @returns {string} The current date in YYYY-MM-DD format
 */
export const getServerDay = (): string => {
  const utc = new Date().toISOString().split('T')[0]
  return utc
}

/**
 * Formats a date string into a human-readable format
 * @param {string} day - The date string in YYYY-MM-DD format
 * @returns {string} Formatted date string (e.g., "March 18, 2024")
 */
export const formatDay = (day: string): string => {
  const date = new Date(day)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Extracts the date from a post name
 * @param {string} postName - The post title containing the date
 * @returns {string | null} The extracted date in YYYY-MM-DD format or null if invalid
 */
export const getDateFromPostName = (postName: string): string | null => {
  const date = postName.split('—')[1]

  try {
    const utc = new Date(date).toISOString().split('T')[0]
    return utc
  } catch (error) {
    return null
  }
}
