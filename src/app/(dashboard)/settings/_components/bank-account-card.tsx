"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import {
  AlertTriangle,
  Building2,
  Check,
  Clock,
  Loader2,
  RefreshCw,
  Trash2,
  Unlink,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, type Id } from "@/lib/convexGenerated";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

type PlaidAccount = {
  accountId: string;
  name: string;
  officialName?: string;
  type: string;
  subtype: string;
  mask?: string;
  balances: {
    current?: number;
    available?: number;
    limit?: number;
  };
};

type PlaidItem = {
  _id: Id<"plaidItems">;
  churchId: Id<"churches">;
  itemId: string;
  institutionId: string;
  institutionName: string;
  accounts: PlaidAccount[];
  status: "active" | "error" | "login_required" | "disconnected";
  lastSyncedAt?: number;
  lastSuccessfulSyncAt?: number;
  errorMessage?: string;
  linkedAt: number;
};

type BankAccountCardProps = {
  item: PlaidItem;
  userId: Id<"users">;
  onSyncComplete?: () => void;
  onDisconnect?: () => void;
};

export function BankAccountCard({
  item,
  userId,
  onSyncComplete,
  onDisconnect,
}: BankAccountCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    added: number;
    modified: number;
    removed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncTransactions = useAction(api.plaid.syncTransactions);
  const disconnectItem = useAction(api.plaid.disconnectPlaidItem);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const result = await syncTransactions({
        plaidItemId: item._id,
        userId,
      });
      setSyncResult(result);
      onSyncComplete?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sync transactions";
      setError(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError(null);

    try {
      await disconnectItem({
        plaidItemId: item._id,
        userId,
      });
      onDisconnect?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to disconnect account";
      setError(errorMessage);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case "active":
        return (
          <Badge
            variant="outline"
            className="border-success/40 bg-success/10 text-success"
          >
            <Check className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant="outline"
            className="border-error/40 bg-error/10 text-error"
          >
            <AlertTriangle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        );
      case "login_required":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-600"
          >
            <AlertTriangle className="mr-1 h-3 w-3" />
            Re-login Required
          </Badge>
        );
      case "disconnected":
        return (
          <Badge
            variant="outline"
            className="border-grey-mid/40 bg-grey-mid/10 text-grey-mid"
          >
            <Unlink className="mr-1 h-3 w-3" />
            Disconnected
          </Badge>
        );
    }
  };

  const formatLastSync = () => {
    if (!item.lastSuccessfulSyncAt) {
      return "Never synced";
    }
    const date = new Date(item.lastSuccessfulSyncAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isDisabled = item.status === "disconnected";

  return (
    <Card className="border-ledger bg-paper shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ledger">
              <Building2 className="h-5 w-5 text-ink" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-ink">
                {item.institutionName}
              </CardTitle>
              <p className="text-sm text-grey-mid">
                {item.accounts.length} account
                {item.accounts.length !== 1 ? "s" : ""} linked
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Account List */}
        <div className="space-y-2">
          {item.accounts.map((account) => (
            <div
              key={account.accountId}
              className="flex items-center justify-between rounded-md border border-ledger bg-highlight/30 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-grey-mid" />
                <span className="text-sm font-medium text-ink">
                  {account.name}
                </span>
                {account.mask && (
                  <span className="text-sm text-grey-mid">
                    ****{account.mask}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs uppercase text-grey-mid">
                  {account.type}
                </span>
                {account.balances.current !== undefined && (
                  <div className="text-sm font-medium text-ink">
                    {currency.format(account.balances.current)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Last Sync Info */}
        <div className="flex items-center gap-2 text-sm text-grey-mid">
          <Clock className="h-4 w-4" />
          <span>Last synced: {formatLastSync()}</span>
        </div>

        {/* Error Message */}
        {item.errorMessage && (
          <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{item.errorMessage}</span>
          </div>
        )}

        {/* Sync Result */}
        {syncResult && (
          <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            <Check className="h-4 w-4" />
            <span>
              Synced: {syncResult.added} added, {syncResult.modified} modified,{" "}
              {syncResult.removed} removed
            </span>
          </div>
        )}

        {/* Error from sync/disconnect */}
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || isDisabled}
            className="border-ledger"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Transactions
              </>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isDisconnecting || isDisabled}
                className="border-error/40 text-error hover:bg-error/10"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Disconnect
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="font-primary">
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Bank Account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will stop syncing transactions from{" "}
                  <strong>{item.institutionName}</strong>. Existing transactions
                  will not be deleted. You can reconnect the account at any
                  time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-ledger">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDisconnect}
                  className="bg-error text-white hover:bg-error/90"
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
