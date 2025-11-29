"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// Plaid API Configuration
// ============================================================================

const getPlaidConfig = () => {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV || "sandbox";

  if (!clientId || !secret) {
    throw new ConvexError("Plaid credentials not configured. Please add PLAID_CLIENT_ID and PLAID_SECRET to your Convex environment variables.");
  }

  const baseUrl =
    env === "production"
      ? "https://production.plaid.com"
      : env === "development"
        ? "https://development.plaid.com"
        : "https://sandbox.plaid.com";

  return { clientId, secret, baseUrl };
};

// Type definitions for Plaid API responses
type PlaidLinkTokenResponse = {
  link_token: string;
  expiration: string;
};

type PlaidExchangeResponse = {
  access_token: string;
  item_id: string;
};

type PlaidTransaction = {
  transaction_id: string;
  account_id: string;
  date: string;
  authorized_date?: string;
  name: string;
  merchant_name?: string;
  amount: number;
  iso_currency_code?: string;
  category?: string[];
  category_id?: string;
  pending: boolean;
};

type PlaidModifiedTransaction = {
  transaction_id: string;
  account_id: string;
  date: string;
  name: string;
  merchant_name?: string;
  amount: number;
  pending: boolean;
};

type PlaidSyncResponse = {
  added: PlaidTransaction[];
  modified: PlaidModifiedTransaction[];
  removed: Array<{ transaction_id: string }>;
  next_cursor: string;
  has_more: boolean;
};

type PlaidAccount = {
  account_id: string;
  name: string;
  official_name?: string;
  type: string;
  subtype: string;
  mask?: string;
  balances: {
    current?: number;
    available?: number;
    limit?: number;
  };
};

type PlaidAccountsResponse = {
  accounts: PlaidAccount[];
};

// Type definitions for internal query/mutation returns
type ValidationResult = {
  valid: boolean;
  error?: string;
  churchName?: string;
};

type PlaidItemData = {
  _id: Id<"plaidItems">;
  churchId: Id<"churches">;
  itemId: string;
  accessToken: string;
  institutionId: string;
  institutionName: string;
  accounts: Array<{
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
  }>;
  status: "active" | "error" | "login_required" | "disconnected";
  syncCursor?: string;
  lastSyncedAt?: number;
  lastSuccessfulSyncAt?: number;
  errorMessage?: string;
} | null;

type DisconnectValidation = {
  valid: boolean;
  error?: string;
  accessToken?: string;
  churchId?: Id<"churches">;
  institutionName?: string;
};

type SyncResult = {
  added: number;
  modified: number;
  removed: number;
};

// Helper to make Plaid API requests
async function plaidRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const { clientId, secret, baseUrl } = getPlaidConfig();

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "PLAID-CLIENT-ID": clientId,
      "PLAID-SECRET": secret,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorCode = data.error_code || "UNKNOWN_ERROR";
    const errorMessage = data.error_message || "Plaid API error";

    if (errorCode === "ITEM_LOGIN_REQUIRED") {
      throw new ConvexError({
        code: "LOGIN_REQUIRED",
        message: "Bank login required. Please reconnect your account.",
      });
    }
    if (errorCode === "RATE_LIMIT_EXCEEDED") {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "Rate limit exceeded. Please try again later.",
      });
    }

    throw new ConvexError({
      code: errorCode,
      message: errorMessage,
    });
  }

  return data as T;
}

// ============================================================================
// CREATE LINK TOKEN - Action to generate Plaid Link token
// ============================================================================

export const createLinkToken = action({
  args: {
    churchId: v.id("churches"),
    userId: v.id("users"),
  },
  returns: v.object({
    linkToken: v.string(),
    expiration: v.string(),
  }),
  handler: async (ctx, args): Promise<{ linkToken: string; expiration: string }> => {
    // Validate user permissions via internal query
    const validation: ValidationResult = await ctx.runQuery(
      internal.plaidInternal.validateUserForPlaid,
      {
        churchId: args.churchId,
        userId: args.userId,
      }
    );

    if (!validation.valid) {
      throw new ConvexError(validation.error || "Validation failed");
    }

    const response: PlaidLinkTokenResponse = await plaidRequest<PlaidLinkTokenResponse>(
      "/link/token/create",
      {
        user: { client_user_id: args.userId },
        client_name: validation.churchName || "ChurchCoin",
        products: ["transactions"],
        country_codes: ["GB"],
        language: "en",
      }
    );

    return {
      linkToken: response.link_token,
      expiration: response.expiration,
    };
  },
});

// ============================================================================
// EXCHANGE PUBLIC TOKEN - Action to exchange token and save item
// ============================================================================

export const exchangePublicToken = action({
  args: {
    churchId: v.id("churches"),
    publicToken: v.string(),
    institutionId: v.string(),
    institutionName: v.string(),
    accounts: v.array(
      v.object({
        accountId: v.string(),
        name: v.string(),
        officialName: v.optional(v.string()),
        type: v.string(),
        subtype: v.string(),
        mask: v.optional(v.string()),
        balances: v.object({
          current: v.optional(v.number()),
          available: v.optional(v.number()),
          limit: v.optional(v.number()),
        }),
      })
    ),
    userId: v.id("users"),
  },
  returns: v.id("plaidItems"),
  handler: async (ctx, args): Promise<Id<"plaidItems">> => {
    // Exchange public token for access token via Plaid API
    const exchangeResponse: PlaidExchangeResponse = await plaidRequest<PlaidExchangeResponse>(
      "/item/public_token/exchange",
      {
        public_token: args.publicToken,
      }
    );

    // Save the item via internal mutation
    const plaidItemId: Id<"plaidItems"> = await ctx.runMutation(
      internal.plaidInternal.savePlaidItem,
      {
        churchId: args.churchId,
        itemId: exchangeResponse.item_id,
        accessToken: exchangeResponse.access_token,
        institutionId: args.institutionId,
        institutionName: args.institutionName,
        accounts: args.accounts,
        userId: args.userId,
      }
    );

    return plaidItemId;
  },
});

// ============================================================================
// SYNC TRANSACTIONS - Action to fetch and import transactions
// ============================================================================

export const syncTransactions = action({
  args: {
    plaidItemId: v.id("plaidItems"),
    userId: v.id("users"),
  },
  returns: v.object({
    added: v.number(),
    modified: v.number(),
    removed: v.number(),
  }),
  handler: async (ctx, args): Promise<SyncResult> => {
    // Get the plaid item data (including access token) via internal query
    const itemData: PlaidItemData = await ctx.runQuery(
      internal.plaidInternal.getPlaidItemInternal,
      {
        plaidItemId: args.plaidItemId,
      }
    );

    if (!itemData) {
      throw new ConvexError("Plaid item not found");
    }

    if (itemData.status === "disconnected") {
      throw new ConvexError("This bank account has been disconnected");
    }

    try {
      // Build request for Plaid transactions/sync endpoint
      const requestBody: Record<string, unknown> = {
        access_token: itemData.accessToken,
      };

      if (itemData.syncCursor) {
        requestBody.cursor = itemData.syncCursor;
      }

      const syncResponse: PlaidSyncResponse = await plaidRequest<PlaidSyncResponse>(
        "/transactions/sync",
        requestBody
      );

      // Process transactions via internal mutation
      const result: SyncResult = await ctx.runMutation(
        internal.plaidInternal.processPlaidTransactions,
        {
          plaidItemId: args.plaidItemId,
          userId: args.userId,
          added: syncResponse.added,
          modified: syncResponse.modified,
          removed: syncResponse.removed,
          nextCursor: syncResponse.next_cursor,
        }
      );

      return result;
    } catch (error) {
      // Update item status to error via internal mutation
      const errorMessage =
        error instanceof ConvexError
          ? (error.data as { message?: string })?.message || String(error.data)
          : error instanceof Error
            ? error.message
            : "Sync failed";

      const isLoginRequired =
        error instanceof ConvexError &&
        (error.data as { code?: string })?.code === "LOGIN_REQUIRED";

      await ctx.runMutation(internal.plaidInternal.updatePlaidItemError, {
        plaidItemId: args.plaidItemId,
        errorMessage,
        status: isLoginRequired ? "login_required" : "error",
      });

      throw error;
    }
  },
});

// ============================================================================
// DISCONNECT PLAID ITEM - Action to disconnect bank account
// ============================================================================

export const disconnectPlaidItem = action({
  args: {
    plaidItemId: v.id("plaidItems"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    // Validate and get access token
    const itemData: DisconnectValidation = await ctx.runQuery(
      internal.plaidInternal.getPlaidItemForDisconnect,
      {
        plaidItemId: args.plaidItemId,
        userId: args.userId,
      }
    );

    if (!itemData.valid) {
      throw new ConvexError(itemData.error || "Cannot disconnect");
    }

    // Try to remove from Plaid (optional - continue even if it fails)
    try {
      if (itemData.accessToken) {
        await plaidRequest("/item/remove", {
          access_token: itemData.accessToken,
        });
      }
    } catch (error) {
      console.error("Failed to remove item from Plaid:", error);
    }

    // Mark as disconnected in database
    await ctx.runMutation(internal.plaidInternal.markPlaidItemDisconnected, {
      plaidItemId: args.plaidItemId,
      userId: args.userId,
    });

    return null;
  },
});

// ============================================================================
// REFRESH ACCOUNTS - Action to fetch latest account data
// ============================================================================

export const refreshAccounts = action({
  args: {
    plaidItemId: v.id("plaidItems"),
  },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    const itemData: PlaidItemData = await ctx.runQuery(
      internal.plaidInternal.getPlaidItemInternal,
      {
        plaidItemId: args.plaidItemId,
      }
    );

    if (!itemData) {
      throw new ConvexError("Plaid item not found");
    }

    if (itemData.status === "disconnected") {
      throw new ConvexError("This bank account has been disconnected");
    }

    const accountsResponse: PlaidAccountsResponse = await plaidRequest<PlaidAccountsResponse>(
      "/accounts/get",
      {
        access_token: itemData.accessToken,
      }
    );

    const accounts = accountsResponse.accounts.map((acc: PlaidAccount) => ({
      accountId: acc.account_id,
      name: acc.name,
      officialName: acc.official_name,
      type: acc.type,
      subtype: acc.subtype,
      mask: acc.mask,
      balances: {
        current: acc.balances.current,
        available: acc.balances.available,
        limit: acc.balances.limit,
      },
    }));

    await ctx.runMutation(internal.plaidInternal.updatePlaidItemAccounts, {
      plaidItemId: args.plaidItemId,
      accounts,
    });

    return accounts.length;
  },
});
