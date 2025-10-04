/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as aiInsights from "../aiInsights.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as churches from "../churches.js";
import type * as donors from "../donors.js";
import type * as files from "../files.js";
import type * as fundraising from "../fundraising.js";
import type * as funds from "../funds.js";
import type * as imports from "../imports.js";
import type * as migrations_backfill_funds from "../migrations/backfill_funds.js";
import type * as migrations_normalize_user_roles from "../migrations/normalize_user_roles.js";
import type * as reconciliation from "../reconciliation.js";
import type * as reports from "../reports.js";
import type * as roles from "../roles.js";
import type * as transactions from "../transactions.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiInsights: typeof aiInsights;
  auth: typeof auth;
  categories: typeof categories;
  churches: typeof churches;
  donors: typeof donors;
  files: typeof files;
  fundraising: typeof fundraising;
  funds: typeof funds;
  imports: typeof imports;
  "migrations/backfill_funds": typeof migrations_backfill_funds;
  "migrations/normalize_user_roles": typeof migrations_normalize_user_roles;
  reconciliation: typeof reconciliation;
  reports: typeof reports;
  roles: typeof roles;
  transactions: typeof transactions;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
