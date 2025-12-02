/**
 * Fund overview helper functions.
 * Extracted from getFundsOverview to improve maintainability.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

// =============================================================================
// TYPES
// =============================================================================

export interface FundSummary {
  fund: Doc<"funds">;
  incomeTotal: number;
  expenseTotal: number;
  lastTransactionDate: string | null;
  transactions: { transaction: Doc<"transactions">; delta: number }[];
  deltaSum: number;
}

export interface DonorDonationStats {
  total: number;
  lastDate: string;
}

export interface PledgeSupporter {
  pledgeId: Id<"fundPledges">;
  donorId: Id<"donors">;
  donorName: string;
  amountPledged: number;
  amountDonated: number;
  outstandingAmount: number;
  pledgedAt: string;
  dueDate: string | null;
  status: "open" | "fulfilled" | "cancelled";
  computedStatus: "open" | "fulfilled" | "cancelled";
  completion: number;
  notes: string | null;
  lastDonationDate: string | null;
}

export interface FundraisingStats {
  target: number | null;
  pledgedTotal: number;
  donationTotal: number;
  outstandingToTarget: number | null;
  pledgeCount: number;
  supporterCount: number;
  supporters: PledgeSupporter[];
  donorsWithoutPledge: {
    donorId: Id<"donors">;
    donorName: string;
    total: number;
    lastDonationDate: string | null;
  }[];
}

export interface FundOverviewResult {
  fund: Doc<"funds">;
  incomeTotal: number;
  expenseTotal: number;
  lastTransactionDate: string | null;
  runningBalance: {
    transactionId: Id<"transactions">;
    date: string;
    description: string;
    type: "income" | "expense";
    amount: number;
    balance: number;
  }[];
  fundraising: FundraisingStats | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all active funds for a church.
 */
export async function getFundsByChurch(
  ctx: QueryCtx,
  churchId: Id<"churches">
): Promise<Doc<"funds">[]> {
  return ctx.db
    .query("funds")
    .withIndex("by_church", (q) => q.eq("churchId", churchId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();
}

/**
 * Initialize fund summaries map.
 */
export function initializeFundSummaries(
  funds: Doc<"funds">[]
): Map<Id<"funds">, FundSummary> {
  const summaries = new Map<Id<"funds">, FundSummary>();

  for (const fund of funds) {
    summaries.set(fund._id, {
      fund,
      incomeTotal: 0,
      expenseTotal: 0,
      lastTransactionDate: null,
      transactions: [],
      deltaSum: 0,
    });
  }

  return summaries;
}

/**
 * Process transactions and populate fund summaries.
 * Returns donation stats by fund and donor.
 */
export function processTransactions(
  transactions: Doc<"transactions">[],
  summaries: Map<Id<"funds">, FundSummary>
): Map<Id<"funds">, Map<Id<"donors">, DonorDonationStats>> {
  const donationsByFund = new Map<
    Id<"funds">,
    Map<Id<"donors">, DonorDonationStats>
  >();

  for (const transaction of transactions) {
    const summary = summaries.get(transaction.fundId);
    if (!summary) continue;

    const delta =
      transaction.type === "income" ? transaction.amount : -transaction.amount;

    summary.transactions.push({ transaction, delta });
    summary.deltaSum += delta;

    if (transaction.type === "income") {
      summary.incomeTotal += transaction.amount;
    } else {
      summary.expenseTotal += transaction.amount;
    }

    // Track donations by donor for fundraising
    if (transaction.type === "income" && transaction.donorId) {
      let donorsForFund = donationsByFund.get(transaction.fundId);
      if (!donorsForFund) {
        donorsForFund = new Map();
        donationsByFund.set(transaction.fundId, donorsForFund);
      }

      const existing = donorsForFund.get(transaction.donorId) ?? {
        total: 0,
        lastDate: transaction.date,
      };

      donorsForFund.set(transaction.donorId, {
        total: existing.total + transaction.amount,
        lastDate:
          existing.lastDate > transaction.date
            ? existing.lastDate
            : transaction.date,
      });
    }

    summary.lastTransactionDate = transaction.date;
  }

  return donationsByFund;
}

/**
 * Group pledges by fund ID.
 */
export function groupPledgesByFund(
  pledges: Doc<"fundPledges">[]
): Map<Id<"funds">, Doc<"fundPledges">[]> {
  const pledgesByFund = new Map<Id<"funds">, Doc<"fundPledges">[]>();

  for (const pledge of pledges) {
    const existing = pledgesByFund.get(pledge.fundId);
    if (existing) {
      existing.push(pledge);
    } else {
      pledgesByFund.set(pledge.fundId, [pledge]);
    }
  }

  return pledgesByFund;
}

/**
 * Collect all unique donor IDs from pledges and donations.
 */
export function collectDonorIds(
  pledges: Doc<"fundPledges">[],
  donationsByFund: Map<Id<"funds">, Map<Id<"donors">, DonorDonationStats>>
): Set<Id<"donors">> {
  const donorIds = new Set<Id<"donors">>();

  for (const pledge of pledges) {
    donorIds.add(pledge.donorId);
  }

  for (const donorMap of donationsByFund.values()) {
    for (const donorId of donorMap.keys()) {
      donorIds.add(donorId);
    }
  }

  return donorIds;
}

/**
 * Load donors by ID in batch.
 */
export async function loadDonorsById(
  ctx: QueryCtx,
  donorIds: Set<Id<"donors">>
): Promise<Map<Id<"donors">, Doc<"donors">>> {
  const donorsById = new Map<Id<"donors">, Doc<"donors">>();

  await Promise.all(
    Array.from(donorIds).map(async (donorId) => {
      const donor = await ctx.db.get(donorId);
      if (donor) {
        donorsById.set(donorId, donor);
      }
    })
  );

  return donorsById;
}

/**
 * Calculate running balance for a fund's transactions.
 */
export function calculateRunningBalance(
  summary: FundSummary
): FundOverviewResult["runningBalance"] {
  let running = summary.fund.balance - summary.deltaSum;

  return summary.transactions.map(({ transaction, delta }) => {
    running += delta;
    return {
      transactionId: transaction._id,
      date: transaction.date,
      description: transaction.description,
      type: transaction.type as "income" | "expense",
      amount: transaction.amount,
      balance: running,
    };
  });
}

/**
 * Build pledge supporter details for fundraising.
 */
export function buildPledgeSupporters(
  fundPledges: Doc<"fundPledges">[],
  summary: FundSummary,
  donorsById: Map<Id<"donors">, Doc<"donors">>,
  fundDonations: Map<Id<"donors">, DonorDonationStats>
): PledgeSupporter[] {
  return fundPledges.map((pledge) => {
    let donatedAmount = 0;
    let lastDonationAfterPledge: string | null = null;

    const pledgeDate = pledge.pledgedAt;

    for (const entry of summary.transactions) {
      const transaction = entry.transaction;

      // Convert transaction date from DD/MM/YYYY to YYYY-MM-DD for comparison
      let transactionDateISO = transaction.date;
      if (transaction.date.includes("/")) {
        const [day, month, year] = transaction.date.split("/");
        transactionDateISO = `${year}-${month}-${day}`;
      }

      if (
        transaction.type === "income" &&
        transaction.donorId &&
        transaction.donorId === pledge.donorId &&
        transactionDateISO >= pledgeDate
      ) {
        donatedAmount += transaction.amount;
        if (
          !lastDonationAfterPledge ||
          transaction.date > lastDonationAfterPledge
        ) {
          lastDonationAfterPledge = transaction.date;
        }
      }
    }

    const donor = donorsById.get(pledge.donorId);
    const computedStatus: "open" | "fulfilled" | "cancelled" =
      pledge.status === "cancelled"
        ? "cancelled"
        : donatedAmount >= pledge.amount
          ? "fulfilled"
          : (pledge.status as "open" | "fulfilled" | "cancelled");

    const baseStats = fundDonations.get(pledge.donorId);

    return {
      pledgeId: pledge._id,
      donorId: pledge.donorId,
      donorName: donor?.name ?? "Unknown donor",
      amountPledged: pledge.amount,
      amountDonated: donatedAmount,
      outstandingAmount: Math.max(pledge.amount - donatedAmount, 0),
      pledgedAt: pledge.pledgedAt,
      dueDate: pledge.dueDate ?? null,
      status: pledge.status as "open" | "fulfilled" | "cancelled",
      computedStatus,
      completion:
        pledge.amount > 0 ? Math.min(donatedAmount / pledge.amount, 1) : 0,
      notes: pledge.notes ?? null,
      lastDonationDate: lastDonationAfterPledge ?? baseStats?.lastDate ?? null,
    };
  });
}

/**
 * Build fundraising stats for a fund.
 */
export function buildFundraisingStats(
  summary: FundSummary,
  fundPledges: Doc<"fundPledges">[],
  fundDonations: Map<Id<"donors">, DonorDonationStats>,
  donorsById: Map<Id<"donors">, Doc<"donors">>
): FundraisingStats | null {
  if (!summary.fund.isFundraising) {
    return null;
  }

  const pledgedDonorIds = new Set<Id<"donors">>(
    fundPledges.map((p) => p.donorId)
  );

  const supporters = buildPledgeSupporters(
    fundPledges,
    summary,
    donorsById,
    fundDonations
  );

  const donorsWithoutPledge: FundraisingStats["donorsWithoutPledge"] = [];

  for (const [donorId, stats] of fundDonations.entries()) {
    if (pledgedDonorIds.has(donorId)) continue;

    donorsWithoutPledge.push({
      donorId,
      donorName: donorsById.get(donorId)?.name ?? "Unknown donor",
      total: stats.total,
      lastDonationDate: stats.lastDate,
    });
  }

  const pledgedTotal = fundPledges
    .filter((p) => p.status !== "cancelled")
    .reduce((sum, p) => sum + p.amount, 0);

  const supporterCount = pledgedDonorIds.size + donorsWithoutPledge.length;

  return {
    target: summary.fund.fundraisingTarget ?? null,
    pledgedTotal,
    donationTotal: summary.incomeTotal,
    outstandingToTarget:
      summary.fund.fundraisingTarget !== undefined
        ? Math.max(summary.fund.fundraisingTarget - summary.incomeTotal, 0)
        : null,
    pledgeCount: fundPledges.length,
    supporterCount,
    supporters,
    donorsWithoutPledge,
  };
}

/**
 * Build the final fund overview result for a single fund.
 */
export function buildFundOverviewResult(
  summary: FundSummary,
  pledgesByFund: Map<Id<"funds">, Doc<"fundPledges">[]>,
  donationsByFund: Map<Id<"funds">, Map<Id<"donors">, DonorDonationStats>>,
  donorsById: Map<Id<"donors">, Doc<"donors">>
): FundOverviewResult {
  const runningBalance = calculateRunningBalance(summary);
  const fundPledges = pledgesByFund.get(summary.fund._id) ?? [];
  const fundDonations =
    donationsByFund.get(summary.fund._id) ??
    new Map<Id<"donors">, DonorDonationStats>();

  const fundraising = buildFundraisingStats(
    summary,
    fundPledges,
    fundDonations,
    donorsById
  );

  return {
    fund: summary.fund,
    incomeTotal: summary.incomeTotal,
    expenseTotal: summary.expenseTotal,
    lastTransactionDate: summary.lastTransactionDate,
    runningBalance,
    fundraising,
  };
}
