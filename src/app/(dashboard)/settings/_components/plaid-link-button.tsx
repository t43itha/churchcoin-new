"use client";

import { useCallback, useState } from "react";
import { useAction } from "convex/react";
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api, type Id } from "@/lib/convexGenerated";

type PlaidLinkButtonProps = {
  churchId: Id<"churches">;
  userId: Id<"users">;
  onSuccess?: (itemId: Id<"plaidItems">) => void;
  onError?: (error: string) => void;
};

export function PlaidLinkButton({
  churchId,
  userId,
  onSuccess,
  onError,
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLinkToken = useAction(api.plaid.createLinkToken);
  const exchangePublicToken = useAction(api.plaid.exchangePublicToken);

  // Handle successful Plaid Link
  const handlePlaidSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setIsLoading(true);
      setError(null);

      try {
        const accounts = metadata.accounts.map((account) => ({
          accountId: account.id,
          name: account.name,
          type: account.type,
          subtype: account.subtype || "",
          mask: account.mask || undefined,
          balances: {
            current: undefined,
            available: undefined,
            limit: undefined,
          },
        }));

        const itemId = await exchangePublicToken({
          churchId,
          publicToken,
          institutionId: metadata.institution?.institution_id || "",
          institutionName: metadata.institution?.name || "Unknown Bank",
          accounts,
          userId,
        });

        onSuccess?.(itemId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to connect bank account";
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
        setLinkToken(null);
      }
    },
    [churchId, userId, exchangePublicToken, onSuccess, onError]
  );

  // Initialize Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handlePlaidSuccess,
    onExit: () => {
      setLinkToken(null);
      setIsLoading(false);
    },
  });

  // Get link token and open Plaid Link
  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createLinkToken({ churchId, userId });
      setLinkToken(result.linkToken);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize bank connection";
      setError(errorMessage);
      onError?.(errorMessage);
      setIsLoading(false);
    }
  };

  // Open Plaid Link when token is ready
  if (linkToken && ready) {
    open();
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        disabled={isLoading}
        className="bg-ink text-paper hover:bg-ink/90"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Connect Bank Account
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  );
}
