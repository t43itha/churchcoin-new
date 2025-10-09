"use client";

import { cn } from "@/lib/utils";

export type FundTabKey = "overview" | "ledger" | "fundraising" | "settings";

type FundTabsProps = {
  activeTab: FundTabKey;
  onChange: (tab: FundTabKey) => void;
  showFundraising: boolean;
};

const baseTabs: { key: FundTabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "ledger", label: "Ledger" },
  { key: "fundraising", label: "Fundraising" },
  { key: "settings", label: "Settings" },
];

export function FundTabs({ activeTab, onChange, showFundraising }: FundTabsProps) {
  const tabs = baseTabs.filter((tab) => tab.key !== "fundraising" || showFundraising);

  return (
    <div className="sticky top-[11.5rem] z-20 border-b border-ledger bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl gap-8 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            data-active={tab.key === activeTab}
            className={cn(
              "relative border-b-2 border-transparent pb-3 pt-4 text-xs font-medium uppercase tracking-[0.2em] text-grey-mid transition-colors hover:border-ledger hover:text-ink",
              tab.key === activeTab ? "border-ink text-ink" : undefined
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
