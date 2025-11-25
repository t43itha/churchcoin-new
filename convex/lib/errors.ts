import { ConvexError } from "convex/values";

/**
 * Error codes matching frontend ApiErrorCode.
 */
export type ErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "DUPLICATE_ENTRY"
  | "INSUFFICIENT_FUNDS"
  | "OPERATION_FAILED"
  | "RATE_LIMITED";

/**
 * Throw structured errors from Convex functions.
 * Provides consistent error format for frontend parsing.
 */
export const Errors = {
  /**
   * Resource not found error.
   * @example Errors.notFound("Fund");
   */
  notFound: (resource: string): never => {
    throw new ConvexError({
      code: "NOT_FOUND" as ErrorCode,
      message: `${resource} not found`,
    });
  },

  /**
   * Authentication required error.
   * @example Errors.unauthorized();
   */
  unauthorized: (message?: string): never => {
    throw new ConvexError({
      code: "UNAUTHORIZED" as ErrorCode,
      message: message || "Authentication required",
    });
  },

  /**
   * Permission denied error.
   * @example Errors.forbidden("edit this fund");
   */
  forbidden: (action?: string): never => {
    throw new ConvexError({
      code: "FORBIDDEN" as ErrorCode,
      message: action
        ? `You don't have permission to ${action}`
        : "You don't have permission to perform this action",
    });
  },

  /**
   * Validation error, optionally for a specific field.
   * @example Errors.validation("Amount must be positive", "amount");
   */
  validation: (message: string, field?: string): never => {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as ErrorCode,
      message,
      field: field ?? null,
    });
  },

  /**
   * Duplicate entry error.
   * @example Errors.duplicate("A fund with this name");
   */
  duplicate: (resource: string): never => {
    throw new ConvexError({
      code: "DUPLICATE_ENTRY" as ErrorCode,
      message: `${resource} already exists`,
    });
  },

  /**
   * Insufficient funds error for transactions.
   * @example Errors.insufficientFunds(100, 50);
   */
  insufficientFunds: (required: number, available: number): never => {
    throw new ConvexError({
      code: "INSUFFICIENT_FUNDS" as ErrorCode,
      message: `Insufficient funds: need £${required.toFixed(2)}, have £${available.toFixed(2)}`,
      required,
      available,
    });
  },

  /**
   * Generic operation failed error.
   * @example Errors.operationFailed("Failed to process transaction");
   */
  operationFailed: (message: string): never => {
    throw new ConvexError({
      code: "OPERATION_FAILED" as ErrorCode,
      message,
    });
  },

  /**
   * Rate limit exceeded error.
   * @example Errors.rateLimited("AI categorization");
   */
  rateLimited: (resource?: string): never => {
    throw new ConvexError({
      code: "RATE_LIMITED" as ErrorCode,
      message: resource
        ? `Rate limit exceeded for ${resource}. Please try again later.`
        : "Rate limit exceeded. Please try again later.",
    });
  },
};

/**
 * Assert condition, throwing error if false.
 * @example assertExists(fund, "Fund");
 */
export function assertExists<T>(
  value: T | null | undefined,
  resourceName: string
): asserts value is T {
  if (value === null || value === undefined) {
    Errors.notFound(resourceName);
  }
}

/**
 * Assert that user is authenticated.
 * @example assertAuthenticated(ctx.auth.getUserId());
 */
export function assertAuthenticated(
  userId: string | null | undefined
): asserts userId is string {
  if (!userId) {
    Errors.unauthorized();
  }
}

/**
 * Assert that user has permission.
 * @example assertPermission(user.role === "admin", "manage users");
 */
export function assertPermission(
  condition: boolean,
  action: string
): asserts condition {
  if (!condition) {
    Errors.forbidden(action);
  }
}

/**
 * Assert that value passes validation.
 * @example assertValid(amount > 0, "Amount must be positive", "amount");
 */
export function assertValid(
  condition: boolean,
  message: string,
  field?: string
): asserts condition {
  if (!condition) {
    Errors.validation(message, field);
  }
}
