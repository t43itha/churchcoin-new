"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { FundFundraisingTab } from "@/components/funds/fund-fundraising-tab";
import { FundHeader } from "@/components/funds/fund-header";
import { FundLedgerTab } from "@/components/funds/fund-ledger-tab";
import { FundOverviewTab } from "@/components/funds/fund-overview-tab";
import { FundSettingsTab } from "@/components/funds/fund-settings-tab";
import { FundTabs, type FundTabKey } from "@/components/funds/fund-tabs";
import type { FundFormValues } from "@/components/funds/fund-form";
import { FundPledgeForm, type FundPledgeFormValues } from "@/components/funds/fund-pledge-form";
import { PledgeImportDialog } from "@/components/funds/pledge-import-dialog";
import type { FundOverview } from "@/components/funds/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, type Id } from "@/lib/convexGenerated";

const loadingState = (
  <div className="flex min-h-screen items-center justify-center bg-paper">
    <div className="text-sm text-grey-mid">Loading fund…</div>
  </div>
);

export default function FundPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fundId = params.id as Id<"funds">;

  const fund = useQuery(api.funds.getFund, { fundId });

  const fundOverviewByChurch = useQuery(
    api.funds.getFundsOverview,
    fund ? { churchId: fund.churchId } : "skip"
  );

  const donors = useQuery(
    api.donors.getDonors,
    fund ? { churchId: fund.churchId } : "skip"
  );

  const createPledge = useMutation(api.fundraising.createPledge);
  const updateFund = useMutation(api.funds.updateFund);

  const [activeTab, setActiveTab] = useState<FundTabKey>("overview");
  const [isPledgeDialogOpen, setIsPledgeDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCreatePledgeSubmitting, setIsCreatePledgeSubmitting] = useState(false);
  const [createPledgeError, setCreatePledgeError] = useState<string | null>(null);
  const [isSettingsSubmitting, setIsSettingsSubmitting] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const fundOverview = useMemo(() => {
    if (!fundOverviewByChurch) {
      return null;
    }
    return (
      fundOverviewByChurch.find((entry) => entry.fund._id === fundId) ?? null
    );
  }, [fundOverviewByChurch, fundId]);

  const donorOptions = useMemo(
    () =>
      donors?.map((donor) => ({
        id: donor._id,
        name: donor.name,
      })) ?? [],
    [donors]
  );

  const showFundraisingTab = Boolean(fundOverview?.fund.isFundraising);
  const searchTab = (searchParams?.get("tab") as FundTabKey | null) ?? "overview";

  useEffect(() => {
    const validTabs: FundTabKey[] = ["overview", "ledger", "fundraising", "settings"];
    const nextTab = validTabs.includes(searchTab) ? searchTab : "overview";
    const resolvedTab = nextTab === "fundraising" && !showFundraisingTab ? "overview" : nextTab;
    setActiveTab((current) => (current === resolvedTab ? current : resolvedTab));
  }, [searchTab, showFundraisingTab]);

  useEffect(() => {
    if (!showFundraisingTab && activeTab === "fundraising") {
      setActiveTab("overview");
    }
  }, [showFundraisingTab, activeTab]);

  const handleTabChange = (tab: FundTabKey) => {
    const nextTab = tab === "fundraising" && !showFundraisingTab ? "overview" : tab;
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (nextTab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }
    const queryString = params.toString();
    const target = queryString ? `/funds/${fundId}?${queryString}` : `/funds/${fundId}`;
    router.replace(target, { scroll: false });
  };

  const handleCreatePledge = async (values: FundPledgeFormValues) => {
    if (!fund) {
      setCreatePledgeError("Fund is still loading");
      return;
    }

    setIsCreatePledgeSubmitting(true);
    setCreatePledgeError(null);

    try {
      await createPledge({
        churchId: fund.churchId,
        fundId: fund._id,
        donorId: values.donorId as Id<"donors">,
        amount: values.amount,
        pledgedAt: values.pledgedAt,
        dueDate: values.dueDate ?? undefined,
        notes: values.notes?.trim() ? values.notes.trim() : undefined,
      });
      setIsPledgeDialogOpen(false);
    } catch (error) {
      setCreatePledgeError(error instanceof Error ? error.message : "Unable to save pledge");
    } finally {
      setIsCreatePledgeSubmitting(false);
    }
  };

  const handleSettingsSubmit = async (values: FundFormValues) => {
    if (!fund) {
      return;
    }

    setIsSettingsSubmitting(true);
    setSettingsError(null);

    try {
      await updateFund({
        fundId: fund._id,
        name: values.name.trim(),
        type: values.type,
        description: values.description?.trim() ? values.description.trim() : null,
        restrictions: values.restrictions?.trim() ? values.restrictions.trim() : null,
        isFundraising: values.isFundraising,
        fundraisingTarget: values.isFundraising ? values.fundraisingTarget ?? null : null,
      });
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Unable to update fund");
    } finally {
      setIsSettingsSubmitting(false);
    }
  };

  if (fund === undefined) {
    return loadingState;
  }

  if (!fund) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-grey-mid">
        Fund not found.
      </div>
    );
  }

  if (fundOverviewByChurch === undefined || !fundOverview) {
    return loadingState;
  }

  const renderTabContent = (overview: FundOverview) => {
    switch (activeTab) {
      case "ledger":
        return <FundLedgerTab overview={overview} />;
      case "fundraising":
        return overview.fundraising ? (
          <FundFundraisingTab
            fund={overview.fund}
            fundraising={overview.fundraising}
            onAddPledge={() => {
              setCreatePledgeError(null);
              setIsPledgeDialogOpen(true);
            }}
            onImportPledges={() => setIsImportDialogOpen(true)}
          />
        ) : (
          <div className="rounded-md border border-dashed border-ledger bg-paper px-4 py-6 text-center text-sm text-grey-mid">
            Fundraising tools are disabled for this fund.
          </div>
        );
      case "settings":
        return (
          <FundSettingsTab
            fund={overview.fund}
            onSubmit={handleSettingsSubmit}
            isSubmitting={isSettingsSubmitting}
            errorMessage={settingsError}
          />
        );
      default:
        return (
          <FundOverviewTab
            overview={overview}
            onNavigateToLedger={() => handleTabChange("ledger")}
            onNavigateToFundraising={
              overview.fundraising && showFundraisingTab
                ? () => handleTabChange("fundraising")
                : undefined
            }
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-16">
      <FundHeader
        fund={fund}
        incomeTotal={fundOverview.incomeTotal}
        expenseTotal={fundOverview.expenseTotal}
        onEdit={() => handleTabChange("settings")}
      />
      <FundTabs
        activeTab={activeTab}
        onChange={handleTabChange}
        showFundraising={showFundraisingTab}
      />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {renderTabContent(fundOverview)}
      </main>

      <Dialog open={isPledgeDialogOpen} onOpenChange={setIsPledgeDialogOpen}>
        <DialogContent className="max-w-2xl border-2 border-ink bg-white shadow-[8px_8px_0px_rgba(0,0,0,0.1)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-ink">Add pledge</DialogTitle>
          </DialogHeader>
          <FundPledgeForm
            donors={donorOptions}
            onSubmit={handleCreatePledge}
            onCancel={() => setIsPledgeDialogOpen(false)}
            isSubmitting={isCreatePledgeSubmitting}
            errorMessage={createPledgeError}
          />
        </DialogContent>
      </Dialog>

      <PledgeImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        fund={fund}
        churchId={fund.churchId}
      />
    </div>
  );
}
