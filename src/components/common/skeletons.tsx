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
      <div className="flex items-baseline justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

/**
 * Grid of fund card skeletons.
 */
export function FundCardsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <FundCardSkeleton key={i} />
      ))}
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

/**
 * Grid of donor card skeletons.
 */
export function DonorCardsGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <DonorCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for transaction rows.
 */
export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-ledger">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-40 flex-1" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20 text-right" />
      <Skeleton className="h-4 w-20 text-right" />
    </div>
  );
}

/**
 * Skeleton for transaction list.
 */
export function TransactionListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="bg-paper border border-ledger rounded-lg overflow-hidden">
      <div className="bg-ledger px-4 py-3 h-12" />
      <div className="divide-y divide-ledger">
        {Array.from({ length: count }).map((_, i) => (
          <TransactionRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for KPI/metric cards.
 */
export function KpiCardSkeleton() {
  return (
    <div className="bg-paper border border-ledger rounded-lg p-6 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/**
 * Row of KPI card skeletons.
 */
export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for form with fields.
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a page header.
 */
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

/**
 * Full page skeleton with header and content.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <KpiRowSkeleton />
      <LedgerTableSkeleton />
    </div>
  );
}

/**
 * Skeleton for insights/notifications widget.
 */
export function InsightsWidgetSkeleton() {
  return (
    <div className="bg-paper border border-ledger rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

/**
 * Skeleton for chart/graph components.
 */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-paper border border-ledger rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div
        className="animate-pulse rounded bg-ledger w-full"
        style={{ height }}
      />
    </div>
  );
}
