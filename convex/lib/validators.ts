/**
 * Reusable Convex validators for common patterns
 *
 * Usage:
 * ```typescript
 * import { fundTypeValidator, transactionTypeValidator, paginationValidator } from "./lib/validators";
 *
 * export const createTransaction = mutation({
 *   args: {
 *     type: transactionTypeValidator,
 *     amount: amountValidator,
 *     ...paginationArgs,
 *   },
 *   handler: async (ctx, args) => { ... },
 * });
 * ```
 */

import { v } from "convex/values";
import { periodTypeValidator, dateRangeValidator } from "./periods";

// Re-export period validators
export { periodTypeValidator, dateRangeValidator };

// =============================================================================
// ID VALIDATORS
// =============================================================================

/**
 * Church ID validator
 */
export const churchIdValidator = v.id("churches");

/**
 * Fund ID validator
 */
export const fundIdValidator = v.id("funds");

/**
 * Transaction ID validator
 */
export const transactionIdValidator = v.id("transactions");

/**
 * Donor ID validator
 */
export const donorIdValidator = v.id("donors");

/**
 * Category ID validator
 */
export const categoryIdValidator = v.id("categories");

/**
 * User ID validator
 */
export const userIdValidator = v.id("users");

// =============================================================================
// ENUM VALIDATORS
// =============================================================================

/**
 * Fund type validator
 */
export const fundTypeValidator = v.union(
  v.literal("general"),
  v.literal("restricted"),
  v.literal("designated")
);

export type FundType = "general" | "restricted" | "designated";

/**
 * Transaction type validator
 */
export const transactionTypeValidator = v.union(
  v.literal("income"),
  v.literal("expense")
);

export type TransactionType = "income" | "expense";

/**
 * Transaction source validator
 */
export const transactionSourceValidator = v.union(
  v.literal("manual"),
  v.literal("csv"),
  v.literal("api"),
  v.literal("plaid")
);

export type TransactionSource = "manual" | "csv" | "api" | "plaid";

/**
 * Payment method validator
 */
export const paymentMethodValidator = v.union(
  v.literal("cash"),
  v.literal("cheque"),
  v.literal("bank_transfer"),
  v.literal("standing_order"),
  v.literal("direct_debit"),
  v.literal("card"),
  v.literal("online"),
  v.literal("other")
);

export type PaymentMethod =
  | "cash"
  | "cheque"
  | "bank_transfer"
  | "standing_order"
  | "direct_debit"
  | "card"
  | "online"
  | "other";

/**
 * Pending status validator
 */
export const pendingStatusValidator = v.union(
  v.literal("none"),
  v.literal("pending"),
  v.literal("cleared")
);

export type PendingStatus = "none" | "pending" | "cleared";

/**
 * Category type validator
 */
export const categoryTypeValidator = v.union(
  v.literal("income"),
  v.literal("expense")
);

export type CategoryType = "income" | "expense";

/**
 * Import status validator
 */
export const importStatusValidator = v.union(
  v.literal("uploaded"),
  v.literal("mapping"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

export type ImportStatus =
  | "uploaded"
  | "mapping"
  | "processing"
  | "completed"
  | "failed";

/**
 * Plaid item status validator
 */
export const plaidItemStatusValidator = v.union(
  v.literal("active"),
  v.literal("error"),
  v.literal("login_required"),
  v.literal("disconnected")
);

export type PlaidItemStatus =
  | "active"
  | "error"
  | "login_required"
  | "disconnected";

/**
 * Financial period status validator
 */
export const financialPeriodStatusValidator = v.union(
  v.literal("draft"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("overdue")
);

export type FinancialPeriodStatus =
  | "draft"
  | "processing"
  | "completed"
  | "overdue";

// =============================================================================
// AMOUNT VALIDATORS
// =============================================================================

/**
 * Amount validator (positive number)
 * Note: Convex doesn't support min/max constraints in schema,
 * so validation must be done in handler
 */
export const amountValidator = v.number();

/**
 * Validate an amount is positive
 */
export function validatePositiveAmount(
  amount: number
): { valid: true } | { valid: false; message: string } {
  if (typeof amount !== "number" || isNaN(amount)) {
    return { valid: false, message: "Amount must be a valid number" };
  }
  if (amount <= 0) {
    return { valid: false, message: "Amount must be greater than zero" };
  }
  // Check for too many decimal places (more than 2)
  if (Math.round(amount * 100) !== amount * 100) {
    return { valid: false, message: "Amount cannot have more than 2 decimal places" };
  }
  return { valid: true };
}

// =============================================================================
// PAGINATION
// =============================================================================

/**
 * Pagination options validator
 */
export const paginationValidator = v.object({
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
});

/**
 * Pagination args for use in mutation/query args
 */
export const paginationArgs = {
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
};

/**
 * Default pagination limit
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Maximum pagination limit
 */
export const MAX_PAGE_SIZE = 200;

/**
 * Validate and normalize pagination options
 */
export function normalizePagination(options?: {
  cursor?: string;
  limit?: number;
}): { cursor?: string; limit: number } {
  const limit = Math.min(
    Math.max(1, options?.limit || DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );

  return {
    cursor: options?.cursor,
    limit,
  };
}

// =============================================================================
// DATE VALIDATORS
// =============================================================================

/**
 * Date string validator (ISO format YYYY-MM-DD)
 */
export const dateStringValidator = v.string();

/**
 * Validate a date string is in ISO format
 */
export function validateISODate(
  dateString: string
): { valid: true; date: Date } | { valid: false; message: string } {
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!isoRegex.test(dateString)) {
    return {
      valid: false,
      message: "Date must be in ISO format (YYYY-MM-DD)",
    };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, message: "Invalid date" };
  }

  return { valid: true, date };
}

/**
 * Validate a date string is in UK format
 */
export function validateUKDate(
  dateString: string
): { valid: true; date: Date } | { valid: false; message: string } {
  const ukRegex = /^\d{2}\/\d{2}\/\d{4}$/;

  if (!ukRegex.test(dateString)) {
    return {
      valid: false,
      message: "Date must be in UK format (DD/MM/YYYY)",
    };
  }

  const [day, month, year] = dateString.split("/").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (isNaN(date.getTime())) {
    return { valid: false, message: "Invalid date" };
  }

  return { valid: true, date };
}

// =============================================================================
// EMAIL VALIDATORS
// =============================================================================

/**
 * Email string validator
 */
export const emailValidator = v.string();

/**
 * Validate an email address
 */
export function validateEmail(
  email: string
): { valid: true; normalized: string } | { valid: false; message: string } {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return { valid: false, message: "Email is required" };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return { valid: false, message: "Invalid email format" };
  }

  return { valid: true, normalized };
}

// =============================================================================
// SORT/FILTER VALIDATORS
// =============================================================================

/**
 * Sort direction validator
 */
export const sortDirectionValidator = v.union(
  v.literal("asc"),
  v.literal("desc")
);

export type SortDirection = "asc" | "desc";

/**
 * Transaction filter validator
 */
export const transactionFilterValidator = v.object({
  type: v.optional(transactionTypeValidator),
  fundId: v.optional(fundIdValidator),
  donorId: v.optional(donorIdValidator),
  categoryId: v.optional(categoryIdValidator),
  reconciled: v.optional(v.boolean()),
  needsReview: v.optional(v.boolean()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  searchQuery: v.optional(v.string()),
});

export type TransactionFilter = {
  type?: TransactionType;
  fundId?: string;
  donorId?: string;
  categoryId?: string;
  reconciled?: boolean;
  needsReview?: boolean;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
};

// =============================================================================
// REPORT VALIDATORS
// =============================================================================

/**
 * Report type validator
 */
export const reportTypeValidator = v.union(
  v.literal("fund-balance"),
  v.literal("income-expense"),
  v.literal("donor-statements"),
  v.literal("reconciliation"),
  v.literal("gift-aid")
);

export type ReportType =
  | "fund-balance"
  | "income-expense"
  | "donor-statements"
  | "reconciliation"
  | "gift-aid";

/**
 * Report period validator
 */
export const reportPeriodValidator = v.union(
  v.literal("month"),
  v.literal("quarter"),
  v.literal("year"),
  v.literal("custom")
);

export type ReportPeriod = "month" | "quarter" | "year" | "custom";
