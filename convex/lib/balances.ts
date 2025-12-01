/**
 * Fund balance calculation utilities
 *
 * Provides the single source of truth for balance calculations.
 * All balance logic should use these functions to ensure consistency.
 *
 * Usage:
 * ```typescript
 * import { calculateFundBalance, calculateMultipleFundBalances } from "./lib/balances";
 *
 * const balance = await calculateFundBalance(ctx, fundId);
 * const balanceMap = await calculateMultipleFundBalances(ctx, fundIds);
 * ```
 */

import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Computed balance result for a fund
 */
export interface FundBalanceResult {
  /** Current balance (income - expenses) */
  balance: number;
  /** Total income transactions */
  totalIncome: number;
  /** Total expense transactions */
  totalExpenses: number;
  /** Count of all transactions */
  transactionCount: number;
  /** Most recent transaction date */
  lastTransactionDate: string | null;
}

/**
 * Balance summary with period breakdown
 */
export interface FundBalanceSummary extends FundBalanceResult {
  fundId: Id<"funds">;
  fundName: string;
  fundType: "general" | "restricted" | "designated";
}

// =============================================================================
// SINGLE FUND BALANCE
// =============================================================================

/**
 * Calculate the current balance for a fund from transactions
 *
 * This is the authoritative source for fund balances.
 * Always use computed values instead of cached balances for accuracy.
 */
export async function calculateFundBalance(
  ctx: QueryCtx | MutationCtx,
  fundId: Id<"funds">
): Promise<FundBalanceResult> {
  const transactions = await ctx.db
    .query("transactions")
    .withIndex("by_fund", (q) => q.eq("fundId", fundId))
    .collect();

  let totalIncome = 0;
  let totalExpenses = 0;
  let lastTransactionDate: string | null = null;

  for (const tx of transactions) {
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else {
      totalExpenses += tx.amount;
    }

    if (!lastTransactionDate || tx.date > lastTransactionDate) {
      lastTransactionDate = tx.date;
    }
  }

  return {
    balance: totalIncome - totalExpenses,
    totalIncome,
    totalExpenses,
    transactionCount: transactions.length,
    lastTransactionDate,
  };
}

/**
 * Get the simple balance number for a fund
 */
export async function getFundBalance(
  ctx: QueryCtx | MutationCtx,
  fundId: Id<"funds">
): Promise<number> {
  const result = await calculateFundBalance(ctx, fundId);
  return result.balance;
}

// =============================================================================
// MULTIPLE FUND BALANCES
// =============================================================================

/**
 * Calculate balances for multiple funds efficiently
 *
 * Use this when you need balances for all funds in a church
 * to avoid N+1 query problems.
 */
export async function calculateMultipleFundBalances(
  ctx: QueryCtx | MutationCtx,
  fundIds: Id<"funds">[]
): Promise<Map<Id<"funds">, FundBalanceResult>> {
  if (fundIds.length === 0) {
    return new Map();
  }

  // Create a set for faster lookup
  const fundIdSet = new Set(fundIds);

  // Query all transactions for the church (we'll filter by fund)
  // This is more efficient than N separate queries
  const allTransactions: Doc<"transactions">[] = [];

  for (const fundId of fundIds) {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_fund", (q) => q.eq("fundId", fundId))
      .collect();
    allTransactions.push(...transactions);
  }

  // Initialize results for all funds
  const balanceMap = new Map<Id<"funds">, FundBalanceResult>();

  for (const fundId of fundIds) {
    balanceMap.set(fundId, {
      balance: 0,
      totalIncome: 0,
      totalExpenses: 0,
      transactionCount: 0,
      lastTransactionDate: null,
    });
  }

  // Calculate balances from transactions
  for (const tx of allTransactions) {
    if (!fundIdSet.has(tx.fundId)) continue;

    const result = balanceMap.get(tx.fundId)!;

    if (tx.type === "income") {
      result.totalIncome += tx.amount;
    } else {
      result.totalExpenses += tx.amount;
    }

    result.transactionCount++;

    if (!result.lastTransactionDate || tx.date > result.lastTransactionDate) {
      result.lastTransactionDate = tx.date;
    }
  }

  // Calculate final balances
  for (const [fundId, result] of balanceMap) {
    result.balance = result.totalIncome - result.totalExpenses;
  }

  return balanceMap;
}

/**
 * Get balance summaries for all funds in a church
 */
export async function getChurchFundBalances(
  ctx: QueryCtx | MutationCtx,
  churchId: Id<"churches">
): Promise<FundBalanceSummary[]> {
  // Get all funds for the church
  const funds = await ctx.db
    .query("funds")
    .withIndex("by_church", (q) => q.eq("churchId", churchId))
    .collect();

  if (funds.length === 0) {
    return [];
  }

  // Calculate all balances
  const fundIds = funds.map((f) => f._id);
  const balanceMap = await calculateMultipleFundBalances(ctx, fundIds);

  // Combine fund info with balances
  return funds.map((fund) => {
    const balance = balanceMap.get(fund._id) || {
      balance: 0,
      totalIncome: 0,
      totalExpenses: 0,
      transactionCount: 0,
      lastTransactionDate: null,
    };

    return {
      fundId: fund._id,
      fundName: fund.name,
      fundType: fund.type,
      ...balance,
    };
  });
}

// =============================================================================
// PERIOD-BASED BALANCES
// =============================================================================

/**
 * Calculate fund balance for a specific period
 */
export async function calculatePeriodBalance(
  ctx: QueryCtx | MutationCtx,
  fundId: Id<"funds">,
  startDate: string,
  endDate: string
): Promise<FundBalanceResult> {
  const transactions = await ctx.db
    .query("transactions")
    .withIndex("by_fund", (q) => q.eq("fundId", fundId))
    .collect();

  // Filter to period
  const periodTransactions = transactions.filter(
    (tx) => tx.date >= startDate && tx.date <= endDate
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  let lastTransactionDate: string | null = null;

  for (const tx of periodTransactions) {
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else {
      totalExpenses += tx.amount;
    }

    if (!lastTransactionDate || tx.date > lastTransactionDate) {
      lastTransactionDate = tx.date;
    }
  }

  return {
    balance: totalIncome - totalExpenses,
    totalIncome,
    totalExpenses,
    transactionCount: periodTransactions.length,
    lastTransactionDate,
  };
}

/**
 * Calculate opening balance for a fund at a specific date
 * (sum of all transactions before the date)
 */
export async function calculateOpeningBalance(
  ctx: QueryCtx | MutationCtx,
  fundId: Id<"funds">,
  asOfDate: string
): Promise<number> {
  const transactions = await ctx.db
    .query("transactions")
    .withIndex("by_fund", (q) => q.eq("fundId", fundId))
    .collect();

  let balance = 0;

  for (const tx of transactions) {
    if (tx.date < asOfDate) {
      balance += tx.type === "income" ? tx.amount : -tx.amount;
    }
  }

  return balance;
}

// =============================================================================
// RUNNING BALANCE CALCULATIONS
// =============================================================================

/**
 * Transaction with running balance for ledger display
 */
export interface TransactionWithBalance {
  transaction: Doc<"transactions">;
  runningBalance: number;
}

/**
 * Calculate running balances for a list of transactions
 * Transactions should be sorted by date (ascending)
 */
export function calculateRunningBalances(
  transactions: Doc<"transactions">[],
  openingBalance: number = 0
): TransactionWithBalance[] {
  let balance = openingBalance;

  return transactions.map((transaction) => {
    balance += transaction.type === "income" ? transaction.amount : -transaction.amount;
    return {
      transaction,
      runningBalance: balance,
    };
  });
}

/**
 * Get transactions with running balance for a fund
 */
export async function getFundLedger(
  ctx: QueryCtx | MutationCtx,
  fundId: Id<"funds">,
  options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<TransactionWithBalance[]> {
  let query = ctx.db
    .query("transactions")
    .withIndex("by_fund", (q) => q.eq("fundId", fundId));

  let transactions = await query.collect();

  // Sort by date ascending
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate opening balance if we have a start date
  let openingBalance = 0;
  if (options?.startDate) {
    openingBalance = await calculateOpeningBalance(ctx, fundId, options.startDate);
    transactions = transactions.filter((tx) => tx.date >= options.startDate!);
  }

  if (options?.endDate) {
    transactions = transactions.filter((tx) => tx.date <= options.endDate!);
  }

  if (options?.limit) {
    transactions = transactions.slice(-options.limit);
  }

  return calculateRunningBalances(transactions, openingBalance);
}

// =============================================================================
// BALANCE VALIDATION
// =============================================================================

/**
 * Validate that a fund has sufficient balance for an expense
 */
export async function validateSufficientBalance(
  ctx: QueryCtx | MutationCtx,
  fundId: Id<"funds">,
  amount: number
): Promise<{ valid: boolean; currentBalance: number; shortfall: number }> {
  const balance = await getFundBalance(ctx, fundId);

  if (balance >= amount) {
    return { valid: true, currentBalance: balance, shortfall: 0 };
  }

  return {
    valid: false,
    currentBalance: balance,
    shortfall: amount - balance,
  };
}

/**
 * Check if any fund balances need recalculation
 * (compare cached vs computed)
 */
export async function checkBalanceIntegrity(
  ctx: QueryCtx | MutationCtx,
  churchId: Id<"churches">
): Promise<
  Array<{
    fundId: Id<"funds">;
    fundName: string;
    cachedBalance: number;
    computedBalance: number;
    difference: number;
  }>
> {
  const funds = await ctx.db
    .query("funds")
    .withIndex("by_church", (q) => q.eq("churchId", churchId))
    .collect();

  const fundIds = funds.map((f) => f._id);
  const balanceMap = await calculateMultipleFundBalances(ctx, fundIds);

  const discrepancies: Array<{
    fundId: Id<"funds">;
    fundName: string;
    cachedBalance: number;
    computedBalance: number;
    difference: number;
  }> = [];

  for (const fund of funds) {
    const computed = balanceMap.get(fund._id)?.balance || 0;
    const cached = fund.balance;
    const difference = Math.abs(computed - cached);

    // Report if difference is more than 1 pence
    if (difference > 0.01) {
      discrepancies.push({
        fundId: fund._id,
        fundName: fund.name,
        cachedBalance: cached,
        computedBalance: computed,
        difference,
      });
    }
  }

  return discrepancies;
}
