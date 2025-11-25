/**
 * Centralized formatting utilities for consistent display across the app.
 * Uses UK locale and GBP currency by default.
 */

// Currency formatter - reusable instance for performance
export const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format amount as GBP currency string.
 * @example formatCurrency(1234.56) // "£1,234.56"
 */
export const formatCurrency = (amount: number): string => {
  return currencyFormatter.format(amount);
};

/**
 * Format amount with sign indicator (+ for positive, - for negative).
 * @example formatSignedCurrency(100) // "+£100.00"
 * @example formatSignedCurrency(-50) // "-£50.00"
 */
export const formatSignedCurrency = (amount: number): string => {
  const formatted = formatCurrency(Math.abs(amount));
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
};

/**
 * Format large numbers with abbreviations (1K, 1M, etc.).
 * @example formatCompactCurrency(1500) // "£1.5K"
 * @example formatCompactCurrency(1000000) // "£1M"
 */
export const formatCompactCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
};

/**
 * Format percentage with configurable decimal places.
 * @example formatPercent(75.5) // "75.5%"
 * @example formatPercent(75.5, 0) // "76%"
 */
export const formatPercent = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a number with thousand separators.
 * @example formatNumber(1234567) // "1,234,567"
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("en-GB").format(value);
};

/**
 * Format currency without the symbol, useful for form inputs.
 * @example formatCurrencyValue(1234.56) // "1,234.56"
 */
export const formatCurrencyValue = (amount: number): string => {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Parse a currency string back to a number.
 * Handles various formats including currency symbols and thousands separators.
 * @example parseCurrency("£1,234.56") // 1234.56
 * @example parseCurrency("1234.56") // 1234.56
 */
export const parseCurrency = (value: string): number => {
  // Remove currency symbols, spaces, and thousand separators
  const cleaned = value.replace(/[£$€,\s]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
