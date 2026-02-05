/**
 * Date formatting utilities for auth components
 * Provides consistent date/time formatting across all auth UI
 */

/**
 * Format a date in user-friendly format
 * @param date - Date to format (Date, string, or null)
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string or fallback text
 */
export function formatUserDate(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return 'Never';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid date';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return 'Never';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid date';

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
    if (diffMonth < 12) return `${diffMonth} month${diffMonth !== 1 ? 's' : ''} ago`;
    return `${diffYear} year${diffYear !== 1 ? 's' : ''} ago`;
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date as short date (e.g., "Jan 31, 2026")
 * @param date - Date to format
 * @returns Short date string
 */
export function formatShortDate(date: Date | string | null | undefined): string {
  return formatUserDate(date, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format date as time only (e.g., "2:30 PM")
 * @param date - Date to format
 * @returns Time string
 */
export function formatTimeOnly(date: Date | string | null | undefined): string {
  return formatUserDate(date, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Check if a date is within the last N days
 * @param date - Date to check
 * @param days - Number of days to check within
 * @returns True if date is within the last N days
 */
export function isWithinDays(date: Date | string | null | undefined, days: number): boolean {
  if (!date) return false;

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return false;

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays >= 0 && diffDays <= days;
  } catch {
    return false;
  }
}

/**
 * Check if a date is in the future
 * @param date - Date to check
 * @returns True if date is in the future
 */
export function isFutureDate(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return false;

    return dateObj.getTime() > new Date().getTime();
  } catch {
    return false;
  }
}
