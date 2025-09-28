import { query } from "./_generated/server";
import { v } from "convex/values";

export const getCategories = query({
  args: {
    churchId: v.id("churches"),
    type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
  },
  handler: async (ctx, args) => {
    const typeFilter = args.type;

    const baseQuery = typeFilter
      ? ctx.db
          .query("categories")
          .withIndex("by_type", (q) =>
            q.eq("churchId", args.churchId).eq("type", typeFilter)
          )
      : ctx.db
          .query("categories")
          .withIndex("by_church", (q) => q.eq("churchId", args.churchId));

    const categories = await baseQuery.collect();

    return categories.sort((a, b) => a.name.localeCompare(b.name));
  },
});
