"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Building2,
  CreditCard,
  Landmark,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api, type Id } from "@/lib/convexGenerated";
import { useSession } from "@/components/auth/session-provider";
import { getRolePermissions } from "@/lib/rbac";

import { PlaidLinkButton } from "./plaid-link-button";
import { BankAccountCard } from "./bank-account-card";

type SettingsBankAccountsTabProps = {
  churchId: Id<"churches"> | null;
};

export function SettingsBankAccountsTab({ churchId }: SettingsBankAccountsTabProps) {
  const { user } = useSession();
  const permissions = useMemo(() => getRolePermissions(user?.role), [user?.role]);

  const church = useQuery(api.churches.getChurch, churchId ? { churchId } : "skip");
  const funds = useQuery(api.funds.getFunds, churchId ? { churchId } : "skip");
  const plaidItems = useQuery(api.plaidInternal.listPlaidItems, churchId ? { churchId } : "skip");

  const setPlaidDefaultFund = useMutation(api.churches.setPlaidDefaultFund);

  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [savingFund, setSavingFund] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Check permissions
  const canManageBankAccounts = permissions.canManageFinancialData || user?.role === "administrator";

  // Initialize selected fund from church settings
  useMemo(() => {
    if (church?.settings?.plaidDefaultFundId) {
      setSelectedFundId(church.settings.plaidDefaultFundId);
    } else if (church?.settings?.defaultFundId) {
      setSelectedFundId(church.settings.defaultFundId);
    }
  }, [church?.settings?.plaidDefaultFundId, church?.settings?.defaultFundId]);

  if (!churchId) {
    return (
      <Card className="border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-ink">Select a church</CardTitle>
          <CardDescription className="text-grey-mid">
            Choose a church from the selector above to manage bank account connections.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-ink">Loading...</CardTitle>
          <CardDescription className="text-grey-mid">
            Please wait while we load your session.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!canManageBankAccounts) {
    return (
      <Card className="border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-ink">
            <AlertTriangle className="h-5 w-5 text-error" />
            Access Denied
          </CardTitle>
          <CardDescription className="text-grey-mid">
            Only administrators and finance users can manage bank account connections.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSaveDefaultFund = async () => {
    if (!churchId || !selectedFundId) return;

    setSavingFund(true);
    setFeedback(null);

    try {
      await setPlaidDefaultFund({
        churchId,
        fundId: selectedFundId as Id<"funds">,
      });
      setFeedback({ type: "success", message: "Default bank import fund saved successfully" });
    } catch (error) {
      console.error("Failed to save default fund:", error);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save default fund",
      });
    } finally {
      setSavingFund(false);
    }
  };

  const handleLinkSuccess = () => {
    setFeedback({ type: "success", message: "Bank account connected successfully! You can now sync transactions." });
  };

  const handleLinkError = (error: string) => {
    setFeedback({ type: "error", message: error });
  };

  const handleSyncComplete = () => {
    setFeedback({ type: "success", message: "Transactions synced successfully!" });
  };

  const handleDisconnect = () => {
    setFeedback({ type: "success", message: "Bank account disconnected" });
  };

  const activeItems = plaidItems?.filter((item) => item.status !== "disconnected") || [];
  const disconnectedItems = plaidItems?.filter((item) => item.status === "disconnected") || [];

  const defaultFund = funds?.find(
    (fund) => fund._id === church?.settings?.plaidDefaultFundId || fund._id === church?.settings?.defaultFundId
  );

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-error/30 bg-error/10 text-error"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Default Fund Configuration */}
      <Card className="border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-ink">
            <Landmark className="h-5 w-5" />
            Bank Import Settings
          </CardTitle>
          <CardDescription className="text-grey-mid">
            Configure which fund receives transactions imported from connected bank accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-grey-mid">
              Default fund for bank imports
            </label>
            <Select value={selectedFundId} onValueChange={setSelectedFundId}>
              <SelectTrigger className="font-primary border-ledger">
                <SelectValue placeholder="Select a fund" />
              </SelectTrigger>
              <SelectContent className="font-primary">
                {funds?.map((fund) => (
                  <SelectItem key={fund._id} value={fund._id}>
                    {fund.name} ({fund.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {defaultFund && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-grey-mid">Current default:</span>
              <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                {defaultFund.name}
              </Badge>
            </div>
          )}

          <Button
            onClick={handleSaveDefaultFund}
            disabled={!selectedFundId || savingFund}
            className="bg-ink text-paper hover:bg-ink/90"
          >
            {savingFund ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Default Fund"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Connect New Bank Account */}
      <Card className="border-ledger bg-paper shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-ink">
            <CreditCard className="h-5 w-5" />
            Connect Bank Account
          </CardTitle>
          <CardDescription className="text-grey-mid">
            Link your church&apos;s bank account to automatically import transactions. We use Plaid
            to securely connect to your bank.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-ledger bg-highlight/30 p-4">
            <div className="space-y-3 text-sm text-grey-mid">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-success">✓</span>
                <span>Bank-level encryption protects your data</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-success">✓</span>
                <span>Read-only access - we can never move money</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-success">✓</span>
                <span>Revoke access any time from Settings</span>
              </div>
            </div>
          </div>

          <PlaidLinkButton
            churchId={churchId}
            userId={user._id}
            onSuccess={handleLinkSuccess}
            onError={handleLinkError}
          />
        </CardContent>
      </Card>

      {/* Connected Bank Accounts */}
      {activeItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">
              <Building2 className="h-5 w-5" />
              Connected Accounts
            </h2>
            <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
              {activeItems.length} connected
            </Badge>
          </div>

          <div className="space-y-4">
            {activeItems.map((item) => (
              <BankAccountCard
                key={item._id}
                item={item}
                userId={user._id}
                onSyncComplete={handleSyncComplete}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {plaidItems !== undefined && activeItems.length === 0 && (
        <Card className="border-ledger bg-paper shadow-none">
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-grey-mid" />
            <h3 className="mb-2 text-lg font-medium text-ink">No bank accounts connected</h3>
            <p className="text-sm text-grey-mid">
              Connect a bank account to automatically import transactions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Disconnected Accounts */}
      {disconnectedItems.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-medium text-grey-mid">
            Previously Connected
          </h2>

          <div className="space-y-4 opacity-60">
            {disconnectedItems.map((item) => (
              <BankAccountCard
                key={item._id}
                item={item}
                userId={user._id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
