/**
 * Shared Convex Utilities
 *
 * Central export for all shared backend utilities.
 */

// Authentication and authorization
export {
  getChurchContext,
  requireWritePermission,
  requireAdminPermission,
  requirePermission,
  requireUser,
  requireIdentity,
  getCurrentUser,
  getChurchId,
  getUserId,
  isAdmin,
  isWriter,
  getOptionalChurchContext,
  verifyChurchOwnership,
  verifyFundOwnership,
  verifyDonorOwnership,
  verifyTransactionOwnership,
  verifyCategoryOwnership,
  verifyPlaidItemOwnership,
  verifyImportOwnership,
  type ChurchContext,
} from "./auth";

// Permissions and RBAC
export {
  PERMISSION_LEVELS,
  ROLE_PERMISSIONS,
  WRITE_ROLES,
  ADMIN_ROLES,
  READ_ROLES,
  OPERATIONS,
  hasPermission,
  canWrite,
  canAdmin,
  isAtLeast,
  canPerform,
  type PermissionLevel,
  type Operation,
} from "./permissions";

// Error handling
export { Errors, assertExists, assertAuthenticated, assertPermission, assertValid } from "./errors";

// Period calculations
export {
  calculatePeriodFields,
  getPeriodDateRange,
  getMonthDateRange,
  getFiscalYearDateRange,
  getPeriodName,
  parsePeriodName,
  getPeriodsInRange,
  getSundayOfWeek,
  getMondayOfWeek,
  parseDateToUTC,
  formatDateUK,
  formatDateISO,
  MONTH_NAMES,
  periodTypeValidator,
  dateRangeValidator,
  type PeriodType,
  type DateRange,
  type PeriodFields,
} from "./periods";

// User resolution
export {
  resolveUser,
  resolveUsers,
  getUserByClerkId,
  getUserByEmail,
  getOrCreatePlaceholderUser,
  isPlaceholderUser,
  getChurchUsers,
  getChurchUsersByRole,
  countChurchUsers,
  getUserDisplayName,
  getUserInitials,
  type ResolvedUser,
  type UserLookupMap,
} from "./users";

// Balance calculations
export {
  calculateFundBalance,
  getFundBalance,
  calculateMultipleFundBalances,
  getChurchFundBalances,
  calculatePeriodBalance,
  calculateOpeningBalance,
  calculateRunningBalances,
  getFundLedger,
  validateSufficientBalance,
  checkBalanceIntegrity,
  type FundBalanceResult,
  type FundBalanceSummary,
  type TransactionWithBalance,
} from "./balances";

// Validators
export {
  churchIdValidator,
  fundIdValidator,
  transactionIdValidator,
  donorIdValidator,
  categoryIdValidator,
  userIdValidator,
  fundTypeValidator,
  transactionTypeValidator,
  transactionSourceValidator,
  paymentMethodValidator,
  pendingStatusValidator,
  categoryTypeValidator,
  importStatusValidator,
  plaidItemStatusValidator,
  financialPeriodStatusValidator,
  amountValidator,
  validatePositiveAmount,
  paginationValidator,
  paginationArgs,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  normalizePagination,
  dateStringValidator,
  validateISODate,
  validateUKDate,
  emailValidator,
  validateEmail,
  sortDirectionValidator,
  transactionFilterValidator,
  reportTypeValidator,
  reportPeriodValidator,
  type FundType,
  type TransactionType,
  type TransactionSource,
  type PaymentMethod,
  type PendingStatus,
  type CategoryType,
  type ImportStatus,
  type PlaidItemStatus,
  type FinancialPeriodStatus,
  type SortDirection,
  type TransactionFilter,
  type ReportType,
  type ReportPeriod,
} from "./validators";
