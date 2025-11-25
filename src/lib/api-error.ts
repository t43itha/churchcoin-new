import { ConvexError } from "convex/values";

/**
 * Standardized error types for consistent error handling.
 */
export type ApiErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "DUPLICATE_ENTRY"
  | "INSUFFICIENT_FUNDS"
  | "OPERATION_FAILED"
  | "RATE_LIMITED"
  | "NETWORK_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  field?: string; // For form field-specific errors
  details?: Record<string, unknown>;
}

/**
 * Parse error from Convex mutation/action.
 * Returns standardized error object.
 */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof ConvexError) {
    const data = error.data as ApiError | string;
    if (typeof data === "object" && data.code) {
      return data;
    }
    return { code: "OPERATION_FAILED", message: String(data) };
  }

  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return {
        code: "NETWORK_ERROR",
        message: "Unable to connect. Please check your internet connection.",
      };
    }

    return { code: "OPERATION_FAILED", message: error.message };
  }

  return { code: "OPERATION_FAILED", message: "An unexpected error occurred" };
}

/**
 * User-friendly error messages for display.
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  NOT_FOUND: "The requested item was not found.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You don't have permission to perform this action.",
  VALIDATION_ERROR: "Please check your input and try again.",
  DUPLICATE_ENTRY: "This item already exists.",
  INSUFFICIENT_FUNDS: "Insufficient funds for this transaction.",
  OPERATION_FAILED: "Something went wrong. Please try again.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
};

/**
 * Get user-friendly message for error code.
 */
export function getErrorMessage(error: ApiError): string {
  return error.message || ERROR_MESSAGES[error.code] || ERROR_MESSAGES.OPERATION_FAILED;
}

/**
 * Check if an error is a specific type.
 */
export function isErrorType(error: unknown, code: ApiErrorCode): boolean {
  const parsed = parseApiError(error);
  return parsed.code === code;
}

/**
 * Check if an error is a field-specific validation error.
 */
export function isFieldError(error: unknown, field: string): boolean {
  const parsed = parseApiError(error);
  return parsed.code === "VALIDATION_ERROR" && parsed.field === field;
}

/**
 * Type guard to check if an error is an ApiError.
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

/**
 * Create a standardized API error.
 */
export function createApiError(
  code: ApiErrorCode,
  message?: string,
  field?: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    code,
    message: message || ERROR_MESSAGES[code],
    field,
    details,
  };
}

/**
 * Handle async operation with error parsing.
 * Returns [result, error] tuple similar to Go-style error handling.
 */
export async function handleApiCall<T>(
  operation: () => Promise<T>
): Promise<[T | null, ApiError | null]> {
  try {
    const result = await operation();
    return [result, null];
  } catch (error) {
    return [null, parseApiError(error)];
  }
}

/**
 * Utility to format validation errors for forms.
 * Maps API errors to react-hook-form compatible format.
 */
export function mapErrorsToForm(
  errors: ApiError[]
): Record<string, { message: string }> {
  const formErrors: Record<string, { message: string }> = {};

  for (const error of errors) {
    if (error.field) {
      formErrors[error.field] = { message: error.message };
    } else {
      formErrors.root = { message: error.message };
    }
  }

  return formErrors;
}
