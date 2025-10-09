import type { Doc, Id } from "@/lib/convexGenerated";

export type FundSupporter = {
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
};

export type FundContributor = {
  donorId: Id<"donors">;
  donorName: string;
  total: number;
  lastDonationDate: string | null;
};

export type FundraisingSnapshot = {
  target: number | null;
  pledgedTotal: number;
  donationTotal: number;
  outstandingToTarget: number | null;
  pledgeCount: number;
  supporterCount: number;
  supporters: FundSupporter[];
  donorsWithoutPledge: FundContributor[];
};

export type FundOverview = {
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
  fundraising: FundraisingSnapshot | null;
};
