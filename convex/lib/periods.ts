/**
 * Period calculation utilities for transaction grouping and reporting
 *
 * Centralizes period logic previously duplicated in:
 * - transactions.ts
 * - plaidInternal.ts
 * - migrations.ts
 *
 * Usage:
 * ```typescript
 * import { calculatePeriodFields, getPeriodDateRange } from "./lib/periods";
 *
 * const { periodMonth, periodYear, weekEnding } = calculatePeriodFields("2024-03-15");
 * const { start, end } = getPeriodDateRange("month");
 * ```
 */

import { v } from "convex/values";

// =============================================================================
// VALIDATORS
// =============================================================================

/**
 * Period type validator for Convex args
 */
export const periodTypeValidator = v.union(
  v.literal("all"),
  v.literal("today"),
  v.literal("week"),
  v.literal("month"),
  v.literal("quarter"),
  v.literal("year"),
  v.literal("custom")
);

export type PeriodType =
  | "all"
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";

/**
 * Date range validator
 */
export const dateRangeValidator = v.object({
  start: v.number(), // Unix timestamp
  end: v.number(), // Unix timestamp
});

export type DateRange = {
  start: number;
  end: number;
};

// =============================================================================
// DATE PARSING
// =============================================================================

/**
 * Parse a date string to UTC Date object
 * Handles both ISO format (YYYY-MM-DD) and UK format (DD/MM/YYYY)
 */
export function parseDateToUTC(dateString: string): Date {
  // Handle UK format (DD/MM/YYYY)
  if (dateString.includes("/")) {
    const [day, month, year] = dateString.split("/").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  // Handle ISO format or timestamp
  return new Date(dateString);
}

/**
 * Format a Date to UK date string (DD/MM/YYYY)
 */
export function formatDateUK(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a Date to ISO date string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

// =============================================================================
// PERIOD CALCULATIONS
// =============================================================================

/**
 * Period fields for a transaction based on its date
 */
export interface PeriodFields {
  /** Month number (1-12) */
  periodMonth: number;
  /** Full year (e.g., 2024) */
  periodYear: number;
  /** Week ending Sunday date in DD/MM/YYYY format */
  weekEnding: string;
}

/**
 * Calculate period fields for a transaction date
 *
 * @param dateString - Date in ISO (YYYY-MM-DD) or UK (DD/MM/YYYY) format
 * @returns Period fields for grouping/reporting
 */
export function calculatePeriodFields(dateString: string): PeriodFields {
  const date = parseDateToUTC(dateString);
  const month = date.getUTCMonth() + 1; // 1-12
  const year = date.getUTCFullYear();

  // Calculate week ending (Sunday)
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(date);
  sunday.setUTCDate(date.getUTCDate() + daysUntilSunday);

  return {
    periodMonth: month,
    periodYear: year,
    weekEnding: formatDateUK(sunday),
  };
}

/**
 * Get the Sunday date for a given week
 *
 * @param date - Any date in the week
 * @returns The Sunday of that week
 */
export function getSundayOfWeek(date: Date): Date {
  const dayOfWeek = date.getUTCDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(date);
  sunday.setUTCDate(date.getUTCDate() + daysUntilSunday);
  sunday.setUTCHours(0, 0, 0, 0);
  return sunday;
}

/**
 * Get the Monday date for a given week
 *
 * @param date - Any date in the week
 * @returns The Monday of that week
 */
export function getMondayOfWeek(date: Date): Date {
  const dayOfWeek = date.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

// =============================================================================
// DATE RANGES
// =============================================================================

/**
 * Get date range for a named period
 *
 * @param period - Period type (today, week, month, quarter, year, all)
 * @param customRange - Required if period is "custom"
 * @returns Start and end timestamps, or null for "all"
 */
export function getPeriodDateRange(
  period: PeriodType,
  customRange?: DateRange
): DateRange | null {
  if (period === "all") {
    return null;
  }

  if (period === "custom") {
    if (!customRange) {
      throw new Error("Custom period requires start and end dates");
    }
    return customRange;
  }

  const now = Date.now();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      return {
        start: today.getTime(),
        end: now,
      };

    case "week": {
      const monday = getMondayOfWeek(today);
      return {
        start: monday.getTime(),
        end: now,
      };
    }

    case "month": {
      const monthStart = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
      );
      return {
        start: monthStart.getTime(),
        end: now,
      };
    }

    case "quarter": {
      const quarter = Math.floor(today.getUTCMonth() / 3);
      const quarterStart = new Date(
        Date.UTC(today.getUTCFullYear(), quarter * 3, 1)
      );
      return {
        start: quarterStart.getTime(),
        end: now,
      };
    }

    case "year": {
      const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      return {
        start: yearStart.getTime(),
        end: now,
      };
    }

    default:
      return null;
  }
}

/**
 * Get date range for a specific month and year
 */
export function getMonthDateRange(month: number, year: number): DateRange {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

/**
 * Get date range for a fiscal year
 *
 * @param fiscalYearEnd - Month number when fiscal year ends (1-12)
 * @param year - The calendar year
 */
export function getFiscalYearDateRange(
  fiscalYearEnd: number,
  year: number
): DateRange {
  // Fiscal year starts the month after fiscalYearEnd in the previous year
  const startMonth = fiscalYearEnd % 12; // 0-indexed
  const startYear = fiscalYearEnd === 12 ? year : year - 1;

  const start = new Date(Date.UTC(startYear, startMonth, 1));

  // Fiscal year ends on the last day of fiscalYearEnd month
  const end = new Date(Date.UTC(year, fiscalYearEnd, 0, 23, 59, 59, 999));

  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

// =============================================================================
// PERIOD NAMING
// =============================================================================

/**
 * Month names for display
 */
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * Get period display name (e.g., "September 2024")
 */
export function getPeriodName(month: number, year: number): string {
  const monthName = MONTH_NAMES[month - 1] || "Unknown";
  return `${monthName} ${year}`;
}

/**
 * Parse period name back to month and year
 */
export function parsePeriodName(
  periodName: string
): { month: number; year: number } | null {
  const parts = periodName.split(" ");
  if (parts.length !== 2) return null;

  const monthIndex = MONTH_NAMES.indexOf(parts[0] as (typeof MONTH_NAMES)[number]);
  const year = parseInt(parts[1], 10);

  if (monthIndex === -1 || isNaN(year)) return null;

  return { month: monthIndex + 1, year };
}

/**
 * Get list of periods between two dates
 */
export function getPeriodsInRange(
  startDate: Date,
  endDate: Date
): Array<{ month: number; year: number; name: string }> {
  const periods: Array<{ month: number; year: number; name: string }> = [];

  let current = new Date(startDate);
  current.setUTCDate(1);
  current.setUTCHours(0, 0, 0, 0);

  while (current <= endDate) {
    const month = current.getUTCMonth() + 1;
    const year = current.getUTCFullYear();
    periods.push({
      month,
      year,
      name: getPeriodName(month, year),
    });
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return periods;
}
