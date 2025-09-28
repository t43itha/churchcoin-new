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
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as churches from "../churches.js";
import type * as donors from "../donors.js";
import type * as files from "../files.js";
import type * as funds from "../funds.js";
import type * as imports from "../imports.js";
import type * as reconciliation from "../reconciliation.js";
import type * as reports from "../reports.js";
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
  auth: typeof auth;
  categories: typeof categories;
  churches: typeof churches;
  donors: typeof donors;
  files: typeof files;
  funds: typeof funds;
  imports: typeof imports;
  reconciliation: typeof reconciliation;
  reports: typeof reports;
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
