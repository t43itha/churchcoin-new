const pad = (value: number) => value.toString().padStart(2, "0");

export type DateInput = string | number | Date | null | undefined;

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const numericFormatter = new Intl.DateTimeFormat("en-GB", DEFAULT_FORMAT);

const asDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const ukMatch = raw.match(/^([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-]([0-9]{2,4})$/);
  if (ukMatch) {
    const day = Number(ukMatch[1]);
    const month = Number(ukMatch[2]);
    let year = Number(ukMatch[3]);

    if (year < 100) {
      year = year + (year >= 50 ? 1900 : 2000);
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const isoMatch = raw.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
  if (isoMatch) {
    const date = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const parseDateInput = (value: DateInput) => {
  const parsed = asDate(value);
  return parsed ? new Date(parsed.getTime()) : null;
};

export const formatUkDate = (
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_FORMAT
) => {
  const date = parseDateInput(value);
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", options).format(date);
};

export const formatUkDateNumeric = (value: DateInput) => {
  const date = parseDateInput(value);
  if (!date) {
    return "";
  }

  const day = pad(date.getUTCDate());
  const month = pad(date.getUTCMonth() + 1);
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export const formatUkDateWithMonth = (value: DateInput) => {
  const date = parseDateInput(value);
  if (!date) {
    return "";
  }

  return numericFormatter.format(date);
};

export const formatUkDateTime = (
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  }
) => {
  const date = parseDateInput(value);
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", options).format(date);
};

/**
 * Format date in long UK format: "25 November 2025"
 */
export const formatUkDateLong = (value: DateInput): string => {
  const date = parseDateInput(value);
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/**
 * Format relative time: "2 hours ago", "Yesterday", etc.
 */
export const formatRelativeTime = (value: DateInput): string => {
  const date = parseDateInput(value);
  if (!date) {
    return "";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffSeconds < 60) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  }

  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }

  return formatUkDate(date);
};

/**
 * Format date as ISO date string (YYYY-MM-DD)
 */
export const formatIsoDate = (value: DateInput): string => {
  const date = parseDateInput(value);
  if (!date) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  return `${year}-${month}-${day}`;
};

/**
 * Get the start of a given day (midnight)
 */
export const startOfDay = (value: DateInput): Date | null => {
  const date = parseDateInput(value);
  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
};

/**
 * Get the end of a given day (23:59:59.999)
 */
export const endOfDay = (value: DateInput): Date | null => {
  const date = parseDateInput(value);
  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
};
