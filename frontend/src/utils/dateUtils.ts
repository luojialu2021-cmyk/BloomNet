/**
 * Date formatting utilities with consistent Eastern Time (America/New_York) timezone
 * All times are displayed in EST/EDT regardless of user's local timezone
 */

const EASTERN_TIMEZONE = 'America/New_York';

/**
 * Normalize date string to ISO format
 * Handles: "2025-10-08 00:00:00", "2025-10-08T00:00:00Z", "2025-10-08"
 */
const normalizeDateString = (dateStr: string): string => {
  let normalized = dateStr.trim();
  
  // Replace space with T for space-separated format
  if (normalized.includes(" ") && !normalized.includes("T")) {
    normalized = normalized.replace(" ", "T");
    // Remove microseconds if present
    if (normalized.includes(".")) {
      const parts = normalized.split(".");
      if (parts[1] && parts[1].length > 3) {
        normalized = `${parts[0]}.${parts[1].substring(0, 3)}`;
      }
    }
    // Add Z if no timezone info
    if (!normalized.includes("Z") && !normalized.match(/[+-]\d{2}:\d{2}$/)) {
      normalized = `${normalized}Z`;
    }
  } else if (!normalized.includes("T")) {
    // Date-only format
    normalized = `${normalized}T00:00:00Z`;
  }
  
  return normalized;
};

/**
 * Format a date/time string to Eastern Time
 * @param isoString - ISO date string (e.g., "2025-11-13T00:19:30.610Z")
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in Eastern Time
 */
export const formatDateTimeET = (
  isoString?: string | null,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!isoString) return "—";
  
  try {
    const dateStr = normalizeDateString(isoString);
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      console.warn('Invalid date string:', isoString);
      return isoString; // Return original if invalid
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: EASTERN_TIMEZONE,
    };
    
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error, isoString);
    return isoString;
  }
};

/**
 * Format a date string to Eastern Time (date only, no time)
 * @param isoString - ISO date string
 * @returns Formatted date string in Eastern Time
 */
export const formatDateET = (isoString?: string | null): string => {
  if (!isoString) return "";
  
  try {
    const dateStr = normalizeDateString(isoString);
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    
    return new Intl.DateTimeFormat('en-US', {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: EASTERN_TIMEZONE,
    }).format(date);
  } catch (error) {
    return "";
  }
};

/**
 * Format a time string to Eastern Time (time only, no date)
 * @param isoString - ISO date string
 * @returns Formatted time string in Eastern Time
 */
export const formatTimeET = (isoString?: string | null): string => {
  if (!isoString) return "";
  
  try {
    const dateStr = normalizeDateString(isoString);
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    
    return new Intl.DateTimeFormat('en-US', {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: EASTERN_TIMEZONE,
    }).format(date);
  } catch (error) {
    return "";
  }
};

/**
 * Format a date range to Eastern Time
 * @param startIso - Start date ISO string
 * @param endIso - End date ISO string
 * @returns Formatted date range string in Eastern Time
 */
export const formatDateRangeET = (
  startIso?: string | null,
  endIso?: string | null
): string => {
  if (!startIso || !endIso) return "";
  
  try {
    let startStr = startIso;
    let endStr = endIso;
    
    if (!startStr.includes("T")) {
      startStr = `${startStr}T00:00:00`;
    }
    if (!endStr.includes("T")) {
      endStr = `${endStr}T00:00:00`;
    }
    
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return "";
    }
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: "short",
      day: "numeric",
      timeZone: EASTERN_TIMEZONE,
    });
    
    return `${formatter.format(startDate)} → ${formatter.format(endDate)}`;
  } catch (error) {
    return "";
  }
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * Note: This doesn't use timezone since it's relative
 * @param isoString - ISO date string
 * @returns Formatted relative time string
 */
export const formatRelativeTime = (isoString?: string | null): string => {
  if (!isoString) return "";
  
  try {
    let dateStr = isoString;
    if (!dateStr.includes("T")) {
      dateStr = `${dateStr}T00:00:00`;
    }
    
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    
    if (!isFinite(target) || !isFinite(now)) {
      return "";
    }
    
    const diffMinutes = Math.round((target - now) / (1000 * 60));
    
    if (!isFinite(diffMinutes)) {
      return "";
    }
    
    const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: "auto" });
    if (Math.abs(diffMinutes) < 60) {
      return rtf.format(diffMinutes, "minute");
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, "hour");
    }
    const diffDays = Math.round(diffHours / 24);
    return rtf.format(diffDays, "day");
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return "";
  }
};

/**
 * Format a full date and time string to Eastern Time
 * @param isoString - ISO date string
 * @returns Formatted full date and time string in Eastern Time
 */
export const formatFullDateTimeET = (isoString?: string | null): string => {
  if (!isoString) return "—";
  
  try {
    let dateStr = isoString;
    if (!dateStr.includes("T")) {
      dateStr = `${dateStr}T00:00:00`;
    }
    
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return isoString;
    }
    
    return new Intl.DateTimeFormat('en-US', {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: EASTERN_TIMEZONE,
    }).format(date);
  } catch (error) {
    return isoString;
  }
};

