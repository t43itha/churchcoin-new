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
import type * as crons from "../crons.js";
import type * as donors from "../donors.js";
import type * as files from "../files.js";
import type * as financialPeriods from "../financialPeriods.js";
import type * as fundraising from "../fundraising.js";
import type * as funds from "../funds.js";
import type * as imports from "../imports.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_balances from "../lib/balances.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_fundOverview from "../lib/fundOverview.js";
import type * as lib_index from "../lib/index.js";
import type * as lib_periods from "../lib/periods.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_users from "../lib/users.js";
import type * as lib_validators from "../lib/validators.js";
import type * as migrations_backfill_funds from "../migrations/backfill_funds.js";
import type * as migrations_normalize_user_roles from "../migrations/normalize_user_roles.js";
import type * as migrations from "../migrations.js";
import type * as onboarding from "../onboarding.js";
import type * as plaid from "../plaid.js";
import type * as plaidInternal from "../plaidInternal.js";
import type * as reconciliation from "../reconciliation.js";
import type * as reports from "../reports.js";
import type * as roles from "../roles.js";
import type * as seedCategories from "../seedCategories.js";
import type * as transactions from "../transactions.js";
import type * as validators from "../validators.js";

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
  crons: typeof crons;
  donors: typeof donors;
  files: typeof files;
  financialPeriods: typeof financialPeriods;
  fundraising: typeof fundraising;
  funds: typeof funds;
  imports: typeof imports;
  "lib/auth": typeof lib_auth;
  "lib/balances": typeof lib_balances;
  "lib/errors": typeof lib_errors;
  "lib/fundOverview": typeof lib_fundOverview;
  "lib/index": typeof lib_index;
  "lib/periods": typeof lib_periods;
  "lib/permissions": typeof lib_permissions;
  "lib/users": typeof lib_users;
  "lib/validators": typeof lib_validators;
  "migrations/backfill_funds": typeof migrations_backfill_funds;
  "migrations/normalize_user_roles": typeof migrations_normalize_user_roles;
  migrations: typeof migrations;
  onboarding: typeof onboarding;
  plaid: typeof plaid;
  plaidInternal: typeof plaidInternal;
  reconciliation: typeof reconciliation;
  reports: typeof reports;
  roles: typeof roles;
  seedCategories: typeof seedCategories;
  transactions: typeof transactions;
  validators: typeof validators;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
