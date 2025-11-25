# ChurchCoin Refactoring Plan

This document outlines proposed refactoring changes organized by priority, with explanations and implementation approaches.

---

## Phase 1: High Priority - Code Clarity & Cleanup

### 1.1 Centralize Currency & Number Formatting

**Problem**: 21+ instances of duplicate currency formatter definitions across components.

**Files Affected**:
- `src/components/funds/fund-card.tsx`
- `src/components/funds/pledge-table.tsx`
- `src/components/donors/giving-history-ledger.tsx`
- `src/components/donors/donor-details-summary.tsx`
- `src/components/transactions/transaction-form.tsx`
- And 15+ more files

**Solution**: Create centralized formatting utilities.

```typescript
// src/lib/formats.ts (NEW FILE)

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

// Format amount as GBP currency string
export const formatCurrency = (amount: number): string => {
  return currencyFormatter.format(amount);
};

// Format amount with sign indicator (+ for positive, - for negative)
export const formatSignedCurrency = (amount: number): string => {
  const formatted = formatCurrency(Math.abs(amount));
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
};

// Format large numbers with abbreviations (1K, 1M, etc.)
export const formatCompactCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
};

// Format percentage
export const formatPercent = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};
```

**Migration**: Search and replace all `new Intl.NumberFormat` instances with imported utility.

---

### 1.2 Consolidate Date Formatting

**Problem**: Inconsistent date formatting - some files define local formatters, others use `lib/dates.ts`.

**Files Affected**:
- `src/components/donors/giving-history-ledger.tsx` (has local `dateFormatter`)
- Various transaction and ledger components

**Solution**: Extend existing `src/lib/dates.ts` with all formatting needs.

```typescript
// src/lib/dates.ts (EXTEND EXISTING)

// Add these exports to consolidate all date formatting:

// Short UK date format: "25/11/2025"
export const formatUkDate = (date: Date | number): string => {
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB");
};

// Long UK date format: "25 November 2025"
export const formatUkDateLong = (date: Date | number): string => {
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Date with time: "25/11/2025, 14:30"
export const formatUkDateTime = (date: Date | number): string => {
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Relative time: "2 hours ago", "Yesterday"
export const formatRelativeTime = (date: Date | number): string => {
  const d = typeof date === "number" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? "Just now" : `${diffMins} minutes ago`;
    }
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatUkDate(d);
};
```

---

### 1.3 Add Return Type Annotations to Convex Functions

**Problem**: Many Convex functions lack explicit return type annotations, reducing code clarity.

**Files Affected**:
- `convex/funds.ts`
- `convex/transactions.ts`
- `convex/donors.ts`
- `convex/categories.ts`
- `convex/reports.ts`

**Solution**: Add explicit return types using Convex's `returns` validator.

```typescript
// Example transformation in convex/funds.ts:

// BEFORE:
export const getFunds = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();
    return funds;
  },
});

// AFTER:
export const getFunds = query({
  args: { churchId: v.id("churches") },
  returns: v.array(v.object({
    _id: v.id("funds"),
    _creationTime: v.number(),
    churchId: v.id("churches"),
    name: v.string(),
    type: v.union(v.literal("general"), v.literal("restricted"), v.literal("designated")),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    // ... other fields
  })),
  handler: async (ctx, args) => {
    const funds = await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();
    return funds;
  },
});
```

**Note**: Create shared validators in `convex/validators.ts` to avoid repetition.

---

## Phase 2: Medium Priority - Architecture & Modularity

### 2.1 Implement Error Boundaries

**Problem**: No error boundaries protect dashboard sections from cascading failures.

**Files to Create/Modify**:
- `src/components/common/error-boundary.tsx` (NEW)
- `src/app/(dashboard)/layout.tsx` (MODIFY)
- Individual section layouts

**Solution**:

```typescript
// src/components/common/error-boundary.tsx (NEW FILE)
"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  section?: string; // For logging/tracking which section failed
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component for graceful error handling.
 * Wraps sections to prevent entire app crashes from component errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service (future: Sentry, LogRocket, etc.)
    console.error(`[ErrorBoundary${this.props.section ? `: ${this.props.section}` : ""}]`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-paper border border-ledger rounded-lg">
          <AlertTriangle className="h-12 w-12 text-error mb-4" />
          <h3 className="text-lg font-medium text-ink mb-2">
            Something went wrong
          </h3>
          <p className="text-grey-mid text-sm mb-4 text-center max-w-md">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button onClick={this.handleReset} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  section?: string
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary section={section}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
```

**Integration in dashboard layout**:
```typescript
// src/app/(dashboard)/layout.tsx
import { ErrorBoundary } from "@/components/common/error-boundary";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="dashboard-container">
        <Sidebar />
        <main>
          <ErrorBoundary section="main-content">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </AuthGuard>
  );
}
```

---

### 2.2 Create Shared Validators for Convex

**Problem**: Type definitions are repeated across multiple Convex files.

**Solution**: Create centralized validators file.

```typescript
// convex/validators.ts (NEW FILE)

import { v } from "convex/values";

/**
 * Shared validators for consistent type definitions across Convex functions.
 * Reduces duplication and ensures schema consistency.
 */

// Fund type union
export const fundTypeValidator = v.union(
  v.literal("general"),
  v.literal("restricted"),
  v.literal("designated")
);

// Transaction type union
export const transactionTypeValidator = v.union(
  v.literal("income"),
  v.literal("expense"),
  v.literal("transfer")
);

// Status validators
export const importStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

// Common document shape validators
export const timestampFields = {
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
};

export const auditFields = {
  createdBy: v.optional(v.id("users")),
  updatedBy: v.optional(v.id("users")),
};

// Pagination options validator
export const paginationValidator = v.object({
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
});

// Fund summary for listings (lighter than full fund)
export const fundSummaryValidator = v.object({
  _id: v.id("funds"),
  name: v.string(),
  type: fundTypeValidator,
  balance: v.number(),
  isActive: v.boolean(),
});
```

---

### 2.3 Add Pagination to Batch Queries

**Problem**: Queries like `getFunds` use `.collect()` without limits, risking performance issues at scale.

**Files Affected**:
- `convex/funds.ts`
- `convex/transactions.ts`
- `convex/donors.ts`

**Solution**: Implement cursor-based pagination.

```typescript
// convex/funds.ts - Add paginated version

import { paginationOptsValidator, PaginationResult } from "convex/server";

/**
 * Get funds with pagination support for large datasets.
 * Returns paginated results with continuation cursor.
 */
export const getFundsPaginated = query({
  args: {
    churchId: v.id("churches"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args): Promise<PaginationResult<Doc<"funds">>> => {
    return await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .paginate(args.paginationOpts);
  },
});

// Keep original for backward compatibility but add limit
export const getFunds = query({
  args: {
    churchId: v.id("churches"),
    limit: v.optional(v.number()), // Default to reasonable limit
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100; // Sensible default
    return await ctx.db
      .query("funds")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(limit);
  },
});
```

---

### 2.4 Extract Custom Hooks for Common Patterns

**Problem**: Repetitive data fetching patterns across components.

**Solution**: Create custom hooks for common operations.

```typescript
// src/hooks/use-church-data.ts (NEW FILE)
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Custom hook for accessing church-scoped data.
 * Centralizes church context and common data patterns.
 */
export function useChurchFunds(churchId: Id<"churches"> | undefined) {
  const funds = useQuery(
    api.funds.getFunds,
    churchId ? { churchId } : "skip"
  );

  const createFund = useMutation(api.funds.createFund);
  const updateFund = useMutation(api.funds.updateFund);
  const deleteFund = useMutation(api.funds.deleteFund);

  return {
    funds,
    isLoading: funds === undefined,
    isEmpty: funds?.length === 0,
    createFund,
    updateFund,
    deleteFund,
  };
}

/**
 * Hook for transaction operations within a fund.
 */
export function useFundTransactions(fundId: Id<"funds"> | undefined) {
  const transactions = useQuery(
    api.transactions.getByFund,
    fundId ? { fundId } : "skip"
  );

  const createTransaction = useMutation(api.transactions.create);

  return {
    transactions,
    isLoading: transactions === undefined,
    createTransaction,
  };
}

/**
 * Hook for donor management.
 */
export function useChurchDonors(churchId: Id<"churches"> | undefined) {
  const donors = useQuery(
    api.donors.list,
    churchId ? { churchId } : "skip"
  );

  const createDonor = useMutation(api.donors.create);
  const updateDonor = useMutation(api.donors.update);

  return {
    donors,
    isLoading: donors === undefined,
    createDonor,
    updateDonor,
  };
}
```

---

## Phase 3: Efficiency & Performance

### 3.1 Add Memoization to Computation-Heavy Components

**Problem**: Components like ledger tables recalculate derived data on every render.

**Files Affected**:
- `src/components/funds/pledge-table.tsx`
- `src/components/transactions/transaction-ledger.tsx`
- `src/components/donors/giving-history-ledger.tsx`

**Solution**: Use `useMemo` for expensive calculations.

```typescript
// Example: pledge-table.tsx

"use client";
import { useMemo } from "react";

export function PledgeTable({ pledges, fund }: PledgeTableProps) {
  // Memoize aggregation calculations
  const summary = useMemo(() => {
    return pledges.reduce(
      (acc, pledge) => ({
        totalPledged: acc.totalPledged + pledge.amount,
        totalFulfilled: acc.totalFulfilled + pledge.amountFulfilled,
        activeCount: acc.activeCount + (pledge.status === "active" ? 1 : 0),
      }),
      { totalPledged: 0, totalFulfilled: 0, activeCount: 0 }
    );
  }, [pledges]);

  // Memoize sorted/filtered pledges if sorting is involved
  const sortedPledges = useMemo(() => {
    return [...pledges].sort((a, b) => b._creationTime - a._creationTime);
  }, [pledges]);

  // ... rest of component
}
```

---

### 3.2 Implement Virtual Scrolling for Large Lists

**Problem**: CSV import previews and large transaction lists render all rows, hurting performance.

**Solution**: Add virtualization using `@tanstack/react-virtual`.

```typescript
// src/components/common/virtual-table.tsx (NEW FILE)
"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

interface VirtualTableProps<T> {
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  rowHeight?: number;
  containerHeight?: number;
  className?: string;
}

/**
 * Virtualized table component for rendering large datasets efficiently.
 * Only renders visible rows plus buffer for smooth scrolling.
 */
export function VirtualTable<T>({
  items,
  renderRow,
  rowHeight = 48,
  containerHeight = 500,
  className,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div
      ref={parentRef}
      className={className}
      style={{ height: containerHeight, overflow: "auto" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderRow(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 3.3 Optimize Component Re-renders with React.memo

**Problem**: Child components re-render unnecessarily when parent state changes.

**Solution**: Wrap stable components with `React.memo`.

```typescript
// Example: fund-card.tsx

import { memo } from "react";

interface FundCardProps {
  fund: Fund;
  onClick?: () => void;
}

/**
 * Fund card component - memoized to prevent unnecessary re-renders.
 * Only re-renders when fund data or onClick reference changes.
 */
export const FundCard = memo(function FundCard({ fund, onClick }: FundCardProps) {
  // Component implementation...
});

// For components with callback props, use useCallback in parent:
// const handleClick = useCallback(() => router.push(`/funds/${fund._id}`), [fund._id]);
```

---

## Phase 4: UI Enhancement

### 4.1 Extract Magic Numbers into Design Tokens

**Problem**: Hardcoded values like `max-h-[540px]` scattered across components.

**Solution**: Define layout constants.

```typescript
// src/lib/constants/layout.ts (NEW FILE)

/**
 * Layout constants for consistent spacing and sizing across the app.
 * Use these instead of hardcoded pixel values.
 */
export const LAYOUT = {
  // Table/list container heights
  TABLE_MAX_HEIGHT: 540,
  LEDGER_MAX_HEIGHT: 600,
  PREVIEW_MAX_HEIGHT: 400,

  // Sidebar and navigation
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 64,

  // Card grid gaps
  GRID_GAP_SM: 16,
  GRID_GAP_MD: 24,
  GRID_GAP_LG: 32,

  // Modal widths
  MODAL_SM: 400,
  MODAL_MD: 560,
  MODAL_LG: 720,
  MODAL_XL: 900,
} as const;

// Usage in components:
// <div style={{ maxHeight: LAYOUT.TABLE_MAX_HEIGHT }}>
// Or create Tailwind plugin for these values
```

---

### 4.2 Create Loading Skeleton Components

**Problem**: Inconsistent loading states across components.

**Solution**: Create reusable skeleton components.

```typescript
// src/components/common/skeletons.tsx (NEW FILE)
"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton component with pulse animation.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-ledger",
        className
      )}
    />
  );
}

/**
 * Skeleton for fund cards in grid layout.
 */
export function FundCardSkeleton() {
  return (
    <div className="bg-paper border border-ledger rounded-lg p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

/**
 * Skeleton for table rows.
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-ledger">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton for full ledger table.
 */
export function LedgerTableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-paper border border-ledger rounded-lg overflow-hidden">
      <div className="bg-ledger h-12" />
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Skeleton for donor cards.
 */
export function DonorCardSkeleton() {
  return (
    <div className="bg-paper border border-ledger rounded-lg p-4 space-y-3">
      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}
```

---

### 4.3 Improve Form Validation UX

**Problem**: Form error messages could be more user-friendly and consistent.

**Solution**: Create enhanced form field wrapper.

```typescript
// src/components/ui/form-field.tsx (NEW FILE)
"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle } from "lucide-react";
import { forwardRef } from "react";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: string;
  hint?: string;
  required?: boolean;
}

/**
 * Enhanced form field with consistent error/success states.
 * Includes label, hint text, and validation feedback.
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, success, hint, required, className, id, ...props }, ref) => {
    const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;

    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId} className="text-ink font-medium">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </Label>

        <div className="relative">
          <Input
            ref={ref}
            id={fieldId}
            className={cn(
              "font-primary",
              hasError && "border-error focus:border-error focus:ring-error/20",
              hasSuccess && "border-success focus:border-success focus:ring-success/20",
              className
            )}
            aria-invalid={hasError}
            aria-describedby={`${fieldId}-message`}
            {...props}
          />

          {(hasError || hasSuccess) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {hasError ? (
                <AlertCircle className="h-4 w-4 text-error" />
              ) : (
                <CheckCircle className="h-4 w-4 text-success" />
              )}
            </div>
          )}
        </div>

        {(error || success || hint) && (
          <p
            id={`${fieldId}-message`}
            className={cn(
              "text-sm",
              hasError && "text-error",
              hasSuccess && "text-success",
              !hasError && !hasSuccess && "text-grey-mid"
            )}
          >
            {error || success || hint}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";
```

---

## Phase 5: API Integration Improvements

### 5.1 Create API Error Handling Wrapper

**Problem**: Inconsistent error handling across Convex mutations.

**Solution**: Create a standardized error handler.

```typescript
// src/lib/api-error.ts (NEW FILE)

import { ConvexError } from "convex/values";

/**
 * Standardized error types for consistent error handling.
 */
export type ApiErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "DUPLICATE_ENTRY"
  | "INSUFFICIENT_FUNDS"
  | "OPERATION_FAILED";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  field?: string; // For form field-specific errors
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
    return { code: "OPERATION_FAILED", message: error.message };
  }

  return { code: "OPERATION_FAILED", message: "An unexpected error occurred" };
}

/**
 * User-friendly error messages for display.
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  NOT_FOUND: "The requested item was not found.",
  UNAUTHORIZED: "You don't have permission to perform this action.",
  VALIDATION_ERROR: "Please check your input and try again.",
  DUPLICATE_ENTRY: "This item already exists.",
  INSUFFICIENT_FUNDS: "Insufficient funds for this transaction.",
  OPERATION_FAILED: "Something went wrong. Please try again.",
};

/**
 * Get user-friendly message for error code.
 */
export function getErrorMessage(error: ApiError): string {
  return error.message || ERROR_MESSAGES[error.code] || ERROR_MESSAGES.OPERATION_FAILED;
}
```

---

### 5.2 Improve Convex Error Responses

**Problem**: Backend errors are generic strings, not structured.

**Solution**: Use ConvexError with typed data.

```typescript
// convex/lib/errors.ts (NEW FILE)

import { ConvexError } from "convex/values";

/**
 * Throw structured errors from Convex functions.
 * Provides consistent error format for frontend parsing.
 */

export const Errors = {
  notFound: (resource: string) => {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: `${resource} not found`,
    });
  },

  unauthorized: (action?: string) => {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: action
        ? `You don't have permission to ${action}`
        : "Unauthorized",
    });
  },

  validation: (message: string, field?: string) => {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message,
      field,
    });
  },

  duplicate: (resource: string) => {
    throw new ConvexError({
      code: "DUPLICATE_ENTRY",
      message: `${resource} already exists`,
    });
  },

  insufficientFunds: (required: number, available: number) => {
    throw new ConvexError({
      code: "INSUFFICIENT_FUNDS",
      message: `Insufficient funds: need £${required.toFixed(2)}, have £${available.toFixed(2)}`,
    });
  },
};

// Usage in Convex functions:
// if (!fund) Errors.notFound("Fund");
// if (!canEdit) Errors.unauthorized("edit this fund");
```

---

## Phase 6: AI Intelligence Enhancement

This phase transforms ChurchCoin from "AI-assisted" to "AI-first" by completing existing features, adding new intelligent capabilities, and improving the AI architecture.

### Current AI State Summary

| Feature | Status | Model Used |
|---------|--------|------------|
| Transaction Categorization | ✅ Complete | DeepSeek |
| Chat with Tools | ✅ Complete | GPT-4o-mini |
| Rule-based Insights | ✅ Complete | None (rules) |
| Report Narratives | ⚠️ Backend only | Claude Haiku |
| Chat Persistence | ❌ Not implemented | - |
| Predictive Analytics | ❌ Not implemented | - |
| Smart Donor Insights | ❌ Not implemented | - |

---

### 6.1 Complete Chat Conversation Persistence

**Problem**: Chat history is lost on page reload - stored in React state but never persisted to `aiConversations` table.

**Files to Modify**:
- `src/app/api/ai/chat/route.ts`
- `src/components/ai/chat-dialog.tsx`
- `convex/ai.ts` (add conversation functions)

**Solution**:

```typescript
// convex/ai.ts - Add conversation persistence functions

/**
 * Create or continue a conversation session.
 * Persists messages for context continuity across sessions.
 */
export const getOrCreateConversation = mutation({
  args: {
    churchId: v.id("churches"),
    userId: v.id("users"),
    context: v.optional(v.object({
      page: v.optional(v.string()),
      fundId: v.optional(v.id("funds")),
      donorId: v.optional(v.id("donors")),
      transactionId: v.optional(v.id("transactions")),
    })),
  },
  returns: v.id("aiConversations"),
  handler: async (ctx, args) => {
    // Find active conversation (within last 30 minutes)
    const recentCutoff = Date.now() - 30 * 60 * 1000;
    const existing = await ctx.db
      .query("aiConversations")
      .withIndex("by_church_user", (q) =>
        q.eq("churchId", args.churchId).eq("userId", args.userId)
      )
      .filter((q) => q.gt(q.field("updatedAt"), recentCutoff))
      .order("desc")
      .first();

    if (existing) {
      // Update context if provided
      if (args.context) {
        await ctx.db.patch(existing._id, {
          context: args.context,
          updatedAt: Date.now(),
        });
      }
      return existing._id;
    }

    // Create new conversation
    return await ctx.db.insert("aiConversations", {
      churchId: args.churchId,
      userId: args.userId,
      messages: [],
      context: args.context,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Append a message to conversation history.
 */
export const appendMessage = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const newMessage = {
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
    };

    // Keep last 50 messages to prevent unbounded growth
    const messages = [...conversation.messages, newMessage].slice(-50);

    await ctx.db.patch(args.conversationId, {
      messages,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Get conversation with message history for chat context.
 */
export const getConversation = query({
  args: { conversationId: v.id("aiConversations") },
  returns: v.union(v.null(), v.object({
    _id: v.id("aiConversations"),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
    })),
    context: v.optional(v.any()),
  })),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});
```

**Frontend Integration**:

```typescript
// src/components/ai/chat-dialog.tsx - Use persistent conversations

"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ChatDialog({ churchId, userId, pageContext }: ChatDialogProps) {
  // Get or create conversation on mount
  const conversationId = useMutation(api.ai.getOrCreateConversation);
  const appendMessage = useMutation(api.ai.appendMessage);
  const [convId, setConvId] = useState<Id<"aiConversations"> | null>(null);

  // Load existing messages
  const conversation = useQuery(
    api.ai.getConversation,
    convId ? { conversationId: convId } : "skip"
  );

  useEffect(() => {
    // Initialize conversation on dialog open
    conversationId({
      churchId,
      userId,
      context: pageContext,
    }).then(setConvId);
  }, [churchId, userId]);

  const handleSend = async (message: string) => {
    if (!convId) return;

    // Persist user message
    await appendMessage({ conversationId: convId, role: "user", content: message });

    // Send to API...
    const response = await fetch("/api/ai/chat", { /* ... */ });

    // Persist assistant response
    await appendMessage({ conversationId: convId, role: "assistant", content: response.message });
  };

  // Render messages from conversation.messages instead of local state
}
```

---

### 6.2 Integrate Report Narrative Generation

**Problem**: `generateReportNarrative()` exists but is never called from UI.

**Files to Create/Modify**:
- `src/components/reports/report-narrative.tsx` (NEW)
- `src/app/(dashboard)/reports/[type]/page.tsx` (MODIFY)
- `convex/ai.ts` (expose as public mutation)

**Solution**:

```typescript
// src/components/reports/report-narrative.tsx (NEW FILE)
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Copy, Check } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface ReportNarrativeProps {
  churchId: Id<"churches">;
  reportType: "fund-balance" | "income-expense" | "gift-aid" | "annual-summary" | "monthly";
  reportData: Record<string, unknown>;
}

/**
 * AI-generated narrative summary for financial reports.
 * Provides trustee-friendly explanations of complex financial data.
 */
export function ReportNarrative({ churchId, reportType, reportData }: ReportNarrativeProps) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [source, setSource] = useState<"cache" | "model" | null>(null);

  const generateNarrative = useMutation(api.ai.generateReportNarrative);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const result = await generateNarrative({
        churchId,
        reportType,
        reportData,
      });
      setNarrative(result.narrative);
      setSource(result.source);
    } catch (error) {
      console.error("Failed to generate narrative:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (narrative) {
      navigator.clipboard.writeText(narrative);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!narrative) {
    return (
      <div className="bg-highlight/50 border border-ledger rounded-lg p-6 text-center">
        <Sparkles className="h-8 w-8 text-grey-mid mx-auto mb-3" />
        <h3 className="text-ink font-medium mb-2">AI Summary Available</h3>
        <p className="text-grey-mid text-sm mb-4">
          Generate an AI-powered narrative explanation of this report
          suitable for trustees and leadership meetings.
        </p>
        <Button onClick={handleGenerate} disabled={isLoading}>
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Summary
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-paper border border-ledger rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-success" />
          <h3 className="text-ink font-medium">AI Summary</h3>
          {source === "cache" && (
            <span className="text-xs text-grey-mid bg-ledger px-2 py-0.5 rounded">
              Cached
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      <div className="prose prose-sm max-w-none text-ink">
        {narrative.split("\n\n").map((paragraph, i) => (
          <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
```

---

### 6.3 Add Smart Donor Intelligence

**Problem**: No AI-powered donor insights - only rule-based alerts.

**New Features**:
- Giving pattern analysis (seasonal, declining, increasing)
- Lapsed donor identification with re-engagement suggestions
- Gift Aid optimization recommendations
- Donor segment classification

**Files to Create**:
- `convex/aiDonorInsights.ts` (NEW)
- `src/components/donors/donor-insights-panel.tsx` (NEW)

**Solution**:

```typescript
// convex/aiDonorInsights.ts (NEW FILE)
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Analyze donor giving patterns and generate personalized insights.
 * Uses statistical analysis + optional AI enhancement.
 */
export const analyzeDonorPatterns = mutation({
  args: {
    churchId: v.id("churches"),
    donorId: v.id("donors"),
  },
  returns: v.object({
    pattern: v.union(
      v.literal("consistent"),
      v.literal("increasing"),
      v.literal("declining"),
      v.literal("sporadic"),
      v.literal("lapsed"),
      v.literal("new")
    ),
    insights: v.array(v.object({
      type: v.string(),
      title: v.string(),
      description: v.string(),
      actionable: v.boolean(),
      priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    })),
    metrics: v.object({
      totalLifetime: v.number(),
      averageGift: v.number(),
      giftCount: v.number(),
      lastGiftDate: v.optional(v.number()),
      daysSinceLastGift: v.optional(v.number()),
      yearOverYearChange: v.optional(v.number()),
      preferredFund: v.optional(v.string()),
      giftAidEligible: v.number(),
      giftAidClaimed: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const donor = await ctx.db.get(args.donorId);
    if (!donor) throw new Error("Donor not found");

    // Get all transactions for this donor
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_donor", (q) => q.eq("donorId", args.donorId))
      .collect();

    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
    const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    // Calculate metrics
    const incomeTransactions = transactions.filter((t) => t.type === "income");
    const thisYearTx = incomeTransactions.filter((t) => t.date >= oneYearAgo);
    const lastYearTx = incomeTransactions.filter(
      (t) => t.date >= twoYearsAgo && t.date < oneYearAgo
    );

    const totalLifetime = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const thisYearTotal = thisYearTx.reduce((sum, t) => sum + t.amount, 0);
    const lastYearTotal = lastYearTx.reduce((sum, t) => sum + t.amount, 0);

    const lastTransaction = incomeTransactions.sort((a, b) => b.date - a.date)[0];
    const daysSinceLastGift = lastTransaction
      ? Math.floor((now - lastTransaction.date) / (24 * 60 * 60 * 1000))
      : undefined;

    // Determine giving pattern
    let pattern: "consistent" | "increasing" | "declining" | "sporadic" | "lapsed" | "new";
    if (incomeTransactions.length === 0) {
      pattern = "new";
    } else if (daysSinceLastGift && daysSinceLastGift > 180) {
      pattern = "lapsed";
    } else if (lastYearTotal > 0 && thisYearTotal > lastYearTotal * 1.2) {
      pattern = "increasing";
    } else if (lastYearTotal > 0 && thisYearTotal < lastYearTotal * 0.8) {
      pattern = "declining";
    } else if (thisYearTx.length >= 6) {
      pattern = "consistent";
    } else {
      pattern = "sporadic";
    }

    // Calculate fund preference
    const fundCounts = new Map<string, { count: number; total: number; name: string }>();
    for (const tx of incomeTransactions) {
      const fund = await ctx.db.get(tx.fundId);
      if (fund) {
        const existing = fundCounts.get(tx.fundId) || { count: 0, total: 0, name: fund.name };
        fundCounts.set(tx.fundId, {
          count: existing.count + 1,
          total: existing.total + tx.amount,
          name: fund.name,
        });
      }
    }
    const preferredFund = Array.from(fundCounts.entries())
      .sort((a, b) => b[1].total - a[1].total)[0]?.[1]?.name;

    // Gift Aid analysis
    const giftAidEligible = incomeTransactions
      .filter((t) => t.isGiftAidEligible)
      .reduce((sum, t) => sum + t.amount, 0);
    const giftAidClaimed = incomeTransactions
      .filter((t) => t.giftAidClaimed)
      .reduce((sum, t) => sum + t.amount, 0);

    // Generate insights
    const insights: Array<{
      type: string;
      title: string;
      description: string;
      actionable: boolean;
      priority: "high" | "medium" | "low";
    }> = [];

    // Lapsed donor alert
    if (pattern === "lapsed") {
      insights.push({
        type: "re-engagement",
        title: "Re-engagement Opportunity",
        description: `${donor.firstName} hasn't given in ${daysSinceLastGift} days. Consider a personal thank-you note acknowledging their past support.`,
        actionable: true,
        priority: "high",
      });
    }

    // Gift Aid opportunity
    if (!donor.hasGiftAidDeclaration && giftAidEligible > 100) {
      const potentialClaim = giftAidEligible * 0.25;
      insights.push({
        type: "gift-aid",
        title: "Gift Aid Declaration Missing",
        description: `A Gift Aid declaration could recover £${potentialClaim.toFixed(2)} on eligible donations. Reach out to request a declaration.`,
        actionable: true,
        priority: "high",
      });
    }

    // Unclaimed Gift Aid
    if (giftAidEligible > giftAidClaimed && giftAidClaimed < giftAidEligible * 0.9) {
      const unclaimed = (giftAidEligible - giftAidClaimed) * 0.25;
      insights.push({
        type: "gift-aid",
        title: "Unclaimed Gift Aid",
        description: `£${unclaimed.toFixed(2)} in Gift Aid is eligible but unclaimed. Review transactions for submission.`,
        actionable: true,
        priority: "medium",
      });
    }

    // Declining giving
    if (pattern === "declining" && lastYearTotal > 0) {
      const percentChange = ((thisYearTotal - lastYearTotal) / lastYearTotal * 100).toFixed(0);
      insights.push({
        type: "trend",
        title: "Giving Has Declined",
        description: `Giving is down ${Math.abs(Number(percentChange))}% compared to last year. Consider a pastoral check-in.`,
        actionable: true,
        priority: "medium",
      });
    }

    // Increasing giving - thank them!
    if (pattern === "increasing" && lastYearTotal > 0) {
      const percentChange = ((thisYearTotal - lastYearTotal) / lastYearTotal * 100).toFixed(0);
      insights.push({
        type: "appreciation",
        title: "Increased Generosity",
        description: `Giving has increased ${percentChange}% this year. Send a personal thank-you to acknowledge their increased commitment.`,
        actionable: true,
        priority: "low",
      });
    }

    // Consistent giver recognition
    if (pattern === "consistent" && thisYearTx.length >= 10) {
      insights.push({
        type: "appreciation",
        title: "Faithful Supporter",
        description: `${donor.firstName} has given ${thisYearTx.length} times this year. Consider recognizing their faithful commitment.`,
        actionable: false,
        priority: "low",
      });
    }

    return {
      pattern,
      insights,
      metrics: {
        totalLifetime,
        averageGift: incomeTransactions.length > 0 ? totalLifetime / incomeTransactions.length : 0,
        giftCount: incomeTransactions.length,
        lastGiftDate: lastTransaction?.date,
        daysSinceLastGift,
        yearOverYearChange: lastYearTotal > 0
          ? ((thisYearTotal - lastYearTotal) / lastYearTotal) * 100
          : undefined,
        preferredFund,
        giftAidEligible,
        giftAidClaimed,
      },
    };
  },
});

/**
 * Get all donors needing attention (lapsed, declining, missing Gift Aid).
 */
export const getDonorsNeedingAttention = query({
  args: { churchId: v.id("churches") },
  returns: v.array(v.object({
    donorId: v.id("donors"),
    donorName: v.string(),
    reason: v.string(),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    daysSinceLastGift: v.optional(v.number()),
    potentialGiftAid: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const donors = await ctx.db
      .query("donors")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const needsAttention: Array<{
      donorId: typeof donors[0]["_id"];
      donorName: string;
      reason: string;
      priority: "high" | "medium" | "low";
      daysSinceLastGift?: number;
      potentialGiftAid?: number;
    }> = [];

    const now = Date.now();

    for (const donor of donors) {
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_donor", (q) => q.eq("donorId", donor._id))
        .filter((q) => q.eq(q.field("type"), "income"))
        .collect();

      if (transactions.length === 0) continue;

      const lastTx = transactions.sort((a, b) => b.date - a.date)[0];
      const daysSince = Math.floor((now - lastTx.date) / (24 * 60 * 60 * 1000));

      // Lapsed (no gift in 180+ days but gave before)
      if (daysSince > 180) {
        needsAttention.push({
          donorId: donor._id,
          donorName: `${donor.firstName} ${donor.lastName}`,
          reason: "Lapsed - no gifts in 6+ months",
          priority: "high",
          daysSinceLastGift: daysSince,
        });
        continue;
      }

      // Missing Gift Aid declaration with significant giving
      const totalGiving = transactions.reduce((sum, t) => sum + t.amount, 0);
      if (!donor.hasGiftAidDeclaration && totalGiving > 500) {
        needsAttention.push({
          donorId: donor._id,
          donorName: `${donor.firstName} ${donor.lastName}`,
          reason: "Missing Gift Aid declaration",
          priority: "medium",
          potentialGiftAid: totalGiving * 0.25,
        });
      }
    }

    return needsAttention.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  },
});
```

---

### 6.4 Add Predictive Cash Flow Analysis

**Problem**: No forward-looking financial intelligence.

**New Features**:
- Predict next month's income/expenses based on historical patterns
- Identify seasonal trends
- Alert on potential cash flow issues

**Files to Create**:
- `convex/aiPredictions.ts` (NEW)
- `src/components/dashboard/cash-flow-forecast.tsx` (NEW)

**Solution**:

```typescript
// convex/aiPredictions.ts (NEW FILE)
import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Generate cash flow predictions based on historical data.
 * Uses statistical analysis of past transactions.
 */
export const getCashFlowForecast = query({
  args: {
    churchId: v.id("churches"),
    months: v.optional(v.number()), // How many months to forecast (default 3)
  },
  returns: v.object({
    forecast: v.array(v.object({
      month: v.string(),
      predictedIncome: v.number(),
      predictedExpenses: v.number(),
      predictedNet: v.number(),
      confidence: v.number(), // 0-1 based on data quality
      basedOnMonths: v.number(),
    })),
    trends: v.object({
      incomeDirection: v.union(v.literal("up"), v.literal("down"), v.literal("stable")),
      expenseDirection: v.union(v.literal("up"), v.literal("down"), v.literal("stable")),
      seasonalPattern: v.optional(v.string()),
    }),
    alerts: v.array(v.object({
      type: v.string(),
      message: v.string(),
      severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    })),
  }),
  handler: async (ctx, args) => {
    const monthsToForecast = args.months ?? 3;

    // Get last 24 months of transactions for pattern analysis
    const twoYearsAgo = Date.now() - 24 * 30 * 24 * 60 * 60 * 1000;
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_church_date", (q) =>
        q.eq("churchId", args.churchId).gt("date", twoYearsAgo)
      )
      .collect();

    // Group by month
    const monthlyData = new Map<string, { income: number; expenses: number }>();

    for (const tx of transactions) {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const existing = monthlyData.get(monthKey) || { income: 0, expenses: 0 };
      if (tx.type === "income") {
        existing.income += tx.amount;
      } else if (tx.type === "expense") {
        existing.expenses += tx.amount;
      }
      monthlyData.set(monthKey, existing);
    }

    const sortedMonths = Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    // Need at least 6 months of data for meaningful predictions
    if (sortedMonths.length < 6) {
      return {
        forecast: [],
        trends: {
          incomeDirection: "stable" as const,
          expenseDirection: "stable" as const,
        },
        alerts: [{
          type: "insufficient-data",
          message: "At least 6 months of transaction history needed for predictions.",
          severity: "info" as const,
        }],
      };
    }

    // Calculate averages and trends
    const recentMonths = sortedMonths.slice(-12);
    const avgIncome = recentMonths.reduce((sum, [, d]) => sum + d.income, 0) / recentMonths.length;
    const avgExpenses = recentMonths.reduce((sum, [, d]) => sum + d.expenses, 0) / recentMonths.length;

    // Simple linear regression for trend
    const incomes = recentMonths.map(([, d]) => d.income);
    const expenses = recentMonths.map(([, d]) => d.expenses);

    const incomeTrend = calculateTrend(incomes);
    const expenseTrend = calculateTrend(expenses);

    // Detect seasonality (compare same months year-over-year)
    const seasonalFactors = new Map<number, { income: number; expense: number }>();
    for (const [monthKey, data] of sortedMonths) {
      const month = parseInt(monthKey.split("-")[1]);
      const existing = seasonalFactors.get(month) || { income: 0, expense: 0 };
      seasonalFactors.set(month, {
        income: existing.income + data.income,
        expense: existing.expense + data.expenses,
      });
    }

    // Generate forecast
    const forecast: Array<{
      month: string;
      predictedIncome: number;
      predictedExpenses: number;
      predictedNet: number;
      confidence: number;
      basedOnMonths: number;
    }> = [];

    const now = new Date();
    for (let i = 1; i <= monthsToForecast; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}`;
      const monthNum = futureDate.getMonth() + 1;

      // Apply trend and seasonal adjustment
      const seasonalData = seasonalFactors.get(monthNum);
      const seasonalIncomeAvg = seasonalData
        ? seasonalData.income / (sortedMonths.filter(([k]) => k.endsWith(`-${String(monthNum).padStart(2, "0")}`)).length || 1)
        : avgIncome;
      const seasonalExpenseAvg = seasonalData
        ? seasonalData.expense / (sortedMonths.filter(([k]) => k.endsWith(`-${String(monthNum).padStart(2, "0")}`)).length || 1)
        : avgExpenses;

      // Blend average with seasonal and trend
      const predictedIncome = (avgIncome * 0.4 + seasonalIncomeAvg * 0.4 + (avgIncome + incomeTrend * i) * 0.2);
      const predictedExpenses = (avgExpenses * 0.4 + seasonalExpenseAvg * 0.4 + (avgExpenses + expenseTrend * i) * 0.2);

      // Confidence decreases with distance
      const confidence = Math.max(0.3, 0.9 - (i - 1) * 0.15);

      forecast.push({
        month: monthKey,
        predictedIncome: Math.round(predictedIncome * 100) / 100,
        predictedExpenses: Math.round(predictedExpenses * 100) / 100,
        predictedNet: Math.round((predictedIncome - predictedExpenses) * 100) / 100,
        confidence,
        basedOnMonths: recentMonths.length,
      });
    }

    // Generate alerts
    const alerts: Array<{
      type: string;
      message: string;
      severity: "info" | "warning" | "critical";
    }> = [];

    // Check for predicted deficit
    const deficitMonths = forecast.filter((f) => f.predictedNet < 0);
    if (deficitMonths.length > 0) {
      const totalDeficit = deficitMonths.reduce((sum, f) => sum + f.predictedNet, 0);
      alerts.push({
        type: "deficit-warning",
        message: `Predicted deficit of £${Math.abs(totalDeficit).toFixed(2)} over the next ${monthsToForecast} months.`,
        severity: Math.abs(totalDeficit) > avgIncome ? "critical" : "warning",
      });
    }

    // Check for declining income trend
    if (incomeTrend < -avgIncome * 0.05) {
      alerts.push({
        type: "income-decline",
        message: "Income shows a declining trend. Consider donor engagement initiatives.",
        severity: "warning",
      });
    }

    // Detect seasonal pattern
    let seasonalPattern: string | undefined;
    const monthlyAverages = Array.from(seasonalFactors.entries())
      .map(([month, data]) => ({ month, avg: data.income }))
      .sort((a, b) => b.avg - a.avg);

    if (monthlyAverages.length >= 12) {
      const highMonths = monthlyAverages.slice(0, 3).map((m) => m.month);
      if (highMonths.includes(12) || highMonths.includes(1)) {
        seasonalPattern = "Higher giving around Christmas/New Year";
      } else if (highMonths.includes(4)) {
        seasonalPattern = "Higher giving around Easter";
      }
    }

    return {
      forecast,
      trends: {
        incomeDirection: incomeTrend > avgIncome * 0.02 ? "up" : incomeTrend < -avgIncome * 0.02 ? "down" : "stable",
        expenseDirection: expenseTrend > avgExpenses * 0.02 ? "up" : expenseTrend < -avgExpenses * 0.02 ? "down" : "stable",
        seasonalPattern,
      },
      alerts,
    };
  },
});

// Helper: Simple linear regression slope
function calculateTrend(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}
```

---

### 6.5 Enhance Transaction Categorization with Few-Shot Learning

**Problem**: Current categorization prompt lacks examples, reducing accuracy.

**Files to Modify**:
- `convex/ai.ts` (improve prompt)

**Solution**:

```typescript
// convex/ai.ts - Enhanced categorization prompt

const buildCategorizationPrompt = (
  description: string,
  amount: number,
  categories: Array<{ id: string; name: string; type: string }>,
  recentFeedback: Array<{ description: string; categoryName: string }>
) => {
  // Build few-shot examples from church's own feedback
  const examples = recentFeedback.slice(0, 5).map((f, i) =>
    `Example ${i + 1}: "${f.description}" → ${f.categoryName}`
  ).join("\n");

  return {
    system: `You are a UK church finance categorization assistant. Categorize transaction descriptions into the most appropriate category.

IMPORTANT GUIDELINES:
- Consider the church context (donations, tithes, offerings are common income)
- UK-specific terms: "standing order" often means regular giving, "BACS" is bank transfer
- Gift Aid is a UK tax scheme for charitable donations
- "Collection" typically refers to Sunday offerings

Return JSON: { "categoryId": "id_here", "confidence": 0.0-1.0, "reason": "brief explanation" }

Confidence scoring:
- 0.9-1.0: Very clear match (exact keywords, obvious category)
- 0.7-0.89: Good match (strong context clues)
- 0.5-0.69: Possible match (some indicators)
- Below 0.5: Uncertain (needs manual review)`,

    user: `Categorize this transaction:
Description: "${description}"
Amount: £${amount.toFixed(2)}

${examples ? `Recent categorizations from this church:\n${examples}\n` : ""}
Available categories:
${categories.map((c) => `- ${c.id}: ${c.name} (${c.type})`).join("\n")}

Return JSON with categoryId, confidence, and reason.`,
  };
};
```

---

### 6.6 Add Natural Language Transaction Search

**Problem**: Users can't search transactions using natural language queries.

**New Feature**: "Find all donations from John over £100 last month"

**Files to Create**:
- `convex/aiSearch.ts` (NEW)
- `src/components/transactions/natural-search.tsx` (NEW)

**Solution**:

```typescript
// convex/aiSearch.ts (NEW FILE)
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Parse natural language query into structured search parameters.
 * Uses AI to understand user intent and extract filters.
 */
export const parseNaturalQuery = action({
  args: {
    churchId: v.id("churches"),
    query: v.string(),
  },
  returns: v.object({
    filters: v.object({
      donorName: v.optional(v.string()),
      fundName: v.optional(v.string()),
      categoryName: v.optional(v.string()),
      minAmount: v.optional(v.number()),
      maxAmount: v.optional(v.number()),
      dateFrom: v.optional(v.number()),
      dateTo: v.optional(v.number()),
      type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
      description: v.optional(v.string()),
    }),
    interpretation: v.string(),
  }),
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const now = new Date();
    const currentMonth = now.toLocaleString("en-GB", { month: "long" });
    const currentYear = now.getFullYear();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You parse natural language queries about church financial transactions into structured filters.

Current date context: ${currentMonth} ${currentYear}

Return JSON with these optional fields:
- donorName: string (partial match OK)
- fundName: string (partial match OK)
- categoryName: string (partial match OK)
- minAmount: number
- maxAmount: number
- dateFrom: ISO date string
- dateTo: ISO date string
- type: "income" | "expense"
- description: string (keyword search)
- interpretation: human-readable explanation of how you understood the query

Date shortcuts:
- "last month" = previous calendar month
- "this year" = Jan 1 to today
- "Q1/Q2/Q3/Q4" = respective quarters
- "Christmas" = December of current/previous year

Amount shortcuts:
- "over/above X" = minAmount
- "under/below X" = maxAmount
- "around X" = minAmount: X*0.8, maxAmount: X*1.2`,
          },
          {
            role: "user",
            content: args.query,
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        filters: {},
        interpretation: "Could not understand the query. Please try rephrasing.",
      };
    }

    try {
      const parsed = JSON.parse(content);

      // Convert date strings to timestamps
      const filters: Record<string, unknown> = { ...parsed };
      delete filters.interpretation;

      if (parsed.dateFrom) {
        filters.dateFrom = new Date(parsed.dateFrom).getTime();
      }
      if (parsed.dateTo) {
        filters.dateTo = new Date(parsed.dateTo).getTime();
      }

      return {
        filters: filters as any,
        interpretation: parsed.interpretation || `Searching for: ${args.query}`,
      };
    } catch {
      return {
        filters: {},
        interpretation: "Could not parse the query. Please try a simpler search.",
      };
    }
  },
});
```

---

### 6.7 Add AI Usage Dashboard & Cost Alerts

**Problem**: No visibility into AI costs or usage patterns.

**Files to Create**:
- `src/app/(dashboard)/settings/ai/page.tsx` (NEW)
- `src/components/settings/ai-usage-dashboard.tsx` (NEW)
- `convex/aiUsage.ts` (NEW - enhanced queries)

**Solution**:

```typescript
// convex/aiUsage.ts (NEW FILE)
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get detailed AI usage breakdown by model and feature.
 */
export const getUsageBreakdown = query({
  args: {
    churchId: v.id("churches"),
    days: v.optional(v.number()),
  },
  returns: v.object({
    totalCost: v.number(),
    totalCalls: v.number(),
    byModel: v.array(v.object({
      model: v.string(),
      calls: v.number(),
      cost: v.number(),
      tokens: v.number(),
    })),
    byDay: v.array(v.object({
      date: v.string(),
      cost: v.number(),
      calls: v.number(),
    })),
    projectedMonthlyCost: v.number(),
    costSavingsFromCache: v.number(),
  }),
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.gt(q.field("createdAt"), since))
      .collect();

    // Aggregate by model
    const byModel = new Map<string, { calls: number; cost: number; tokens: number }>();
    for (const u of usage) {
      const existing = byModel.get(u.model) || { calls: 0, cost: 0, tokens: 0 };
      byModel.set(u.model, {
        calls: existing.calls + 1,
        cost: existing.cost + u.cost,
        tokens: existing.tokens + u.totalTokens,
      });
    }

    // Aggregate by day
    const byDay = new Map<string, { cost: number; calls: number }>();
    for (const u of usage) {
      const date = new Date(u.createdAt).toISOString().split("T")[0];
      const existing = byDay.get(date) || { cost: 0, calls: 0 };
      byDay.set(date, {
        cost: existing.cost + u.cost,
        calls: existing.calls + 1,
      });
    }

    const totalCost = usage.reduce((sum, u) => sum + u.cost, 0);
    const totalCalls = usage.length;

    // Calculate cache savings (from aiCache hits)
    const cacheHits = await ctx.db
      .query("aiCache")
      .withIndex("by_expiry")
      .filter((q) => q.gt(q.field("expiresAt"), Date.now()))
      .collect();

    // Estimate: each cache hit saves ~$0.001
    const estimatedCacheSavings = cacheHits.length * 0.001;

    // Project monthly cost
    const dailyAvg = totalCost / days;
    const projectedMonthlyCost = dailyAvg * 30;

    return {
      totalCost,
      totalCalls,
      byModel: Array.from(byModel.entries()).map(([model, data]) => ({
        model,
        ...data,
      })),
      byDay: Array.from(byDay.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      projectedMonthlyCost,
      costSavingsFromCache: estimatedCacheSavings,
    };
  },
});

/**
 * Set monthly AI budget and get alerts.
 */
export const setBudgetAlert = mutation({
  args: {
    churchId: v.id("churches"),
    monthlyBudget: v.number(),
    alertThreshold: v.optional(v.number()), // Default 0.8 (80%)
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);
    if (!church) throw new Error("Church not found");

    await ctx.db.patch(args.churchId, {
      settings: {
        ...church.settings,
        aiMonthlyBudget: args.monthlyBudget,
        aiBudgetAlertThreshold: args.alertThreshold ?? 0.8,
      },
    });

    return null;
  },
});

/**
 * Check if budget alert should be triggered.
 */
export const checkBudgetStatus = query({
  args: { churchId: v.id("churches") },
  returns: v.object({
    budget: v.optional(v.number()),
    spent: v.number(),
    percentUsed: v.number(),
    shouldAlert: v.boolean(),
    daysRemaining: v.number(),
  }),
  handler: async (ctx, args) => {
    const church = await ctx.db.get(args.churchId);
    if (!church) throw new Error("Church not found");

    const budget = church.settings?.aiMonthlyBudget;
    const threshold = church.settings?.aiBudgetAlertThreshold ?? 0.8;

    // Get current month's usage
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.gt(q.field("createdAt"), monthStart))
      .collect();

    const spent = usage.reduce((sum, u) => sum + u.cost, 0);
    const percentUsed = budget ? (spent / budget) * 100 : 0;

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - now.getDate();

    return {
      budget,
      spent,
      percentUsed,
      shouldAlert: budget ? percentUsed >= threshold * 100 : false,
      daysRemaining,
    };
  },
});
```

---

### 6.8 Security: Move API Keys to Environment Variables

**Problem**: DeepSeek API key stored in plaintext in church settings.

**Files to Modify**:
- `convex/ai.ts`
- Remove `aiApiKey` from church settings schema

**Solution**:

```typescript
// convex/ai.ts - Use environment variables

// BEFORE (insecure):
const storedDeepSeekKey = church.settings?.aiApiKey;

// AFTER (secure):
const getDeepSeekApiKey = () => {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY environment variable not configured");
  }
  return key;
};

// In Convex dashboard: Settings > Environment Variables
// Add: DEEPSEEK_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY
```

---

### 6.9 Add Batch Categorization for Performance

**Problem**: CSV imports make one API call per row - slow and expensive.

**Files to Modify**:
- `convex/ai.ts` (add batch function)
- `convex/imports.ts` (use batch function)

**Solution**:

```typescript
// convex/ai.ts - Add batch categorization

/**
 * Batch categorize multiple transactions in a single API call.
 * Reduces API costs and latency for CSV imports.
 */
export const batchCategorize = action({
  args: {
    churchId: v.id("churches"),
    items: v.array(v.object({
      id: v.string(), // Temporary ID for matching results
      description: v.string(),
      amount: v.number(),
    })),
  },
  returns: v.array(v.object({
    id: v.string(),
    categoryId: v.union(v.string(), v.null()),
    confidence: v.number(),
    source: v.union(v.literal("cache"), v.literal("model"), v.literal("feedback")),
  })),
  handler: async (ctx, args) => {
    if (args.items.length === 0) return [];
    if (args.items.length > 50) {
      throw new Error("Batch size limited to 50 items");
    }

    // Get categories for this church
    const categories = await ctx.runQuery(internal.categories.listActive, {
      churchId: args.churchId,
    });

    // Check cache and feedback first
    const results: Array<{
      id: string;
      categoryId: string | null;
      confidence: number;
      source: "cache" | "model" | "feedback";
    }> = [];

    const needsApi: typeof args.items = [];

    for (const item of args.items) {
      // Check feedback first
      const feedback = await ctx.runQuery(internal.ai.checkFeedback, {
        churchId: args.churchId,
        description: item.description,
        amount: item.amount,
      });

      if (feedback) {
        results.push({
          id: item.id,
          categoryId: feedback.categoryId,
          confidence: 0.95,
          source: "feedback",
        });
        continue;
      }

      // Check cache
      const cached = await ctx.runQuery(internal.ai.checkCache, {
        churchId: args.churchId,
        description: item.description,
        amount: item.amount,
      });

      if (cached) {
        results.push({
          id: item.id,
          categoryId: cached.categoryId,
          confidence: cached.confidence,
          source: "cache",
        });
        continue;
      }

      needsApi.push(item);
    }

    // Batch API call for remaining items
    if (needsApi.length > 0) {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error("DeepSeek API key not configured");

      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: `You categorize church ledger transactions. For each item in the array, return the categoryId and confidence (0-1).

Return a JSON array: [{ "id": "item_id", "categoryId": "category_id", "confidence": 0.0-1.0 }, ...]`,
            },
            {
              role: "user",
              content: JSON.stringify({
                items: needsApi.map((i) => ({
                  id: i.id,
                  description: i.description,
                  amount: i.amount,
                })),
                categories: categories.map((c) => ({
                  id: c._id,
                  name: c.name,
                  type: c.type,
                })),
              }),
            },
          ],
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        try {
          const parsed = JSON.parse(content);
          for (const item of parsed) {
            results.push({
              id: item.id,
              categoryId: item.categoryId,
              confidence: Math.max(0, Math.min(1, item.confidence || 0)),
              source: "model",
            });

            // Cache the result
            await ctx.runMutation(internal.ai.cacheResult, {
              churchId: args.churchId,
              description: needsApi.find((n) => n.id === item.id)?.description || "",
              amount: needsApi.find((n) => n.id === item.id)?.amount || 0,
              categoryId: item.categoryId,
              confidence: item.confidence,
            });
          }
        } catch (e) {
          // Fallback: return uncategorized for failed parses
          for (const item of needsApi) {
            results.push({
              id: item.id,
              categoryId: null,
              confidence: 0,
              source: "model",
            });
          }
        }
      }

      // Track usage
      await ctx.runMutation(internal.ai.trackUsage, {
        churchId: args.churchId,
        model: "deepseek-chat",
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
      });
    }

    return results;
  },
});
```

---

### AI Enhancement Implementation Checklist

#### Phase 6A - Complete Existing Features (Week 6)
- [ ] Add conversation persistence functions to `convex/ai.ts`
- [ ] Update `chat-dialog.tsx` to use persistent conversations
- [ ] Create `report-narrative.tsx` component
- [ ] Integrate narratives into report pages
- [ ] Add dismiss functionality to insights widget

#### Phase 6B - New Intelligence Features (Week 7)
- [ ] Create `convex/aiDonorInsights.ts` with pattern analysis
- [ ] Create `donor-insights-panel.tsx` component
- [ ] Add donor insights to donor detail page
- [ ] Create `convex/aiPredictions.ts` with cash flow forecast
- [ ] Create `cash-flow-forecast.tsx` dashboard widget

#### Phase 6C - Improved AI Architecture (Week 8)
- [ ] Enhance categorization prompt with few-shot learning
- [ ] Add recent feedback to prompt context
- [ ] Create `convex/aiSearch.ts` for natural language queries
- [ ] Create `natural-search.tsx` component
- [ ] Implement batch categorization for imports
- [ ] Update import workflow to use batch API

#### Phase 6D - Observability & Security (Week 9)
- [ ] Create `convex/aiUsage.ts` with detailed analytics
- [ ] Create AI usage dashboard page
- [ ] Add budget alerts and monitoring
- [ ] Move API keys to environment variables
- [ ] Remove `aiApiKey` from church settings
- [ ] Add rate limiting per church

---

## Implementation Checklist

### Phase 1 (Week 1)
- [ ] Create `src/lib/formats.ts` with currency utilities
- [ ] Update 21 files to use centralized formatters
- [ ] Extend `src/lib/dates.ts` with all date formats
- [ ] Update components using local date formatters
- [ ] Create `convex/validators.ts` with shared validators
- [ ] Add return types to all Convex query functions

### Phase 2 (Week 2)
- [ ] Create `src/components/common/error-boundary.tsx`
- [ ] Integrate error boundaries in dashboard layout
- [ ] Add pagination to `getFunds`, `getDonors`, `getTransactions`
- [ ] Create custom hooks in `src/hooks/use-church-data.ts`
- [ ] Refactor components to use custom hooks

### Phase 3 (Week 3)
- [ ] Add useMemo to pledge-table.tsx calculations
- [ ] Add useMemo to transaction-ledger.tsx
- [ ] Install @tanstack/react-virtual
- [ ] Create VirtualTable component
- [ ] Apply virtualization to CSV import preview
- [ ] Wrap stable components with React.memo

### Phase 4 (Week 4)
- [ ] Create `src/lib/constants/layout.ts`
- [ ] Replace hardcoded pixel values with constants
- [ ] Create skeleton components
- [ ] Update loading states to use skeletons
- [ ] Create FormField component
- [ ] Update forms to use enhanced fields

### Phase 5 (Week 5)
- [ ] Create `src/lib/api-error.ts`
- [ ] Create `convex/lib/errors.ts`
- [ ] Update Convex functions to use structured errors
- [ ] Update frontend to parse structured errors
- [ ] Add error toast notifications

---

## Testing Strategy

After each phase:
1. Run `npm run lint` - ensure no lint errors
2. Run `npm run build` - verify build succeeds
3. Manual test affected features
4. Check browser console for errors
5. Verify TypeScript types are correct

---

## Notes

- Each phase can be done independently
- Prioritize Phase 1 for immediate code quality wins
- Phase 3 optimizations should be measured with React DevTools
- Consider adding Jest/Vitest tests for utility functions
- Document any breaking changes in CHANGELOG.md
