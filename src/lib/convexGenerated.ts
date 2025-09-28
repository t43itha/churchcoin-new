import { api as generatedApi } from "../../convex/_generated/api";
import type { FunctionReference } from "convex/server";

import type { Doc, Id } from "../../convex/_generated/dataModel";

type CategoriesQuery = FunctionReference<
  "query",
  "public",
  { churchId: Id<"churches">; type?: "income" | "expense" },
  Doc<"categories">[]
>;

type AugmentedApi = typeof generatedApi & {
  categories: {
    getCategories: CategoriesQuery;
  };
};

export const api = generatedApi as AugmentedApi;

export type { Doc, Id };
