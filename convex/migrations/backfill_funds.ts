import { mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export default mutation(async (ctx) => {
  const funds = await ctx.db.query("funds").collect();

  let updated = 0;
  for (const fund of funds) {
    const needsFlag = fund.isFundraising === undefined;
    const hasTarget = fund.fundraisingTarget !== undefined;

    if (!needsFlag && !hasTarget) {
      continue;
    }

    await ctx.db.patch(fund._id as Id<"funds">, {
      isFundraising: false,
      fundraisingTarget: undefined,
    });

    updated += 1;
  }

  return { total: funds.length, updated };
});
