"use client";

import { useMemo, useState } from "react";

import { FundLedger, type FundLedgerEntry } from "@/components/funds/fund-ledger";
import { type FundOverview } from "@/components/funds/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const typeFilters = [
  { label: "All transactions", value: "all" },
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
] as const;

type FundLedgerTabProps = {
  overview: FundOverview;
};

export function FundLedgerTab({ overview }: FundLedgerTabProps) {
  const [typeFilter, setTypeFilter] = useState<(typeof typeFilters)[number]["value"]>("all");
  const [search, setSearch] = useState("");

  const entries = useMemo<FundLedgerEntry[]>(() => {
    return overview.runningBalance.map((entry) => ({
      transactionId: entry.transactionId,
      date: entry.date,
      description: entry.description,
      type: entry.type,
      amount: entry.amount,
      balance: entry.balance,
    }));
  }, [overview.runningBalance]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesType = typeFilter === "all" || entry.type === typeFilter;
      const matchesSearch = search
        ? entry.description.toLowerCase().includes(search.toLowerCase())
        : true;
      return matchesType && matchesSearch;
    });
  }, [entries, typeFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
            <SelectTrigger className="w-[200px] border-ledger font-primary text-sm">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="font-primary">
              {typeFilters.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search description"
            className="max-w-sm border-ledger font-primary"
          />
        </div>
        <Button variant="outline" className="font-primary" disabled>
          Add transaction
        </Button>
      </div>
      <FundLedger entries={filteredEntries} />
    </div>
  );
}
