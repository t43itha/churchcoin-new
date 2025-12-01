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

// =============================================================================
// ADDITIONAL FORMATTERS
// =============================================================================

/**
 * Format a number as ordinal (1st, 2nd, 3rd, etc.)
 * @example formatOrdinal(1) // "1st"
 * @example formatOrdinal(22) // "22nd"
 */
export const formatOrdinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Format a number with +/- sign
 * @example formatWithSign(100) // "+100"
 * @example formatWithSign(-50) // "-50"
 */
export const formatWithSign = (value: number): string => {
  return value >= 0 ? `+${value}` : `${value}`;
};

/**
 * Format bytes to human-readable size
 * @example formatBytes(1024) // "1 KB"
 * @example formatBytes(1048576) // "1 MB"
 */
export const formatBytes = (bytes: number, decimals = 1): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Format a ratio as percentage
 * @example formatRatio(0.75) // "75%"
 * @example formatRatio(0.756, 1) // "75.6%"
 */
export const formatRatio = (ratio: number, decimals = 0): string => {
  return `${(ratio * 100).toFixed(decimals)}%`;
};

/**
 * Format currency with color class based on value
 * Returns an object with value and colorClass for styling
 */
export const formatCurrencyWithColor = (
  amount: number
): { value: string; colorClass: string } => {
  const value = formatCurrency(amount);
  const colorClass =
    amount > 0 ? "text-success" : amount < 0 ? "text-error" : "text-ink";
  return { value, colorClass };
};

/**
 * Format a transaction amount with type indicator
 * @example formatTransactionAmount(100, "income") // "+£100.00"
 * @example formatTransactionAmount(50, "expense") // "-£50.00"
 */
export const formatTransactionAmount = (
  amount: number,
  type: "income" | "expense"
): string => {
  const formatted = formatCurrency(amount);
  return type === "income" ? `+${formatted}` : `-${formatted}`;
};

/**
 * Truncate text with ellipsis
 * @example truncateText("Hello World", 8) // "Hello..."
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
};

/**
 * Format a name to initials
 * @example getInitials("John Doe") // "JD"
 * @example getInitials("Alice") // "AL"
 */
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
};

/**
 * Format fund type for display
 */
export const formatFundType = (
  type: "general" | "restricted" | "designated"
): string => {
  const labels: Record<string, string> = {
    general: "General Fund",
    restricted: "Restricted Fund",
    designated: "Designated Fund",
  };
  return labels[type] || type;
};

/**
 * Format role for display
 */
export const formatRole = (role: string): string => {
  const labels: Record<string, string> = {
    administrator: "Administrator",
    finance: "Finance",
    pastorate: "Pastorate",
    secured_guest: "Guest",
    admin: "Administrator",
  };
  return labels[role] || role;
};
