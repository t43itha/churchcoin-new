import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Helper to parse date and calculate period fields
function parseDateToUTC(dateString: string): Date {
  if (dateString.includes('/')) {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  return new Date(dateString);
}

function calculatePeriodFields(dateString: string): {
  periodMonth: number;
  periodYear: number;
  weekEnding: string;
} {
  const date = parseDateToUTC(dateString);
  const month = date.getUTCMonth() + 1; // 1-12
  const year = date.getUTCFullYear();

  // Calculate week ending (Sunday)
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(date);
  sunday.setUTCDate(date.getUTCDate() + daysUntilSunday);

  // Format as DD/MM/YYYY
  const day = String(sunday.getUTCDate()).padStart(2, '0');
  const sundayMonth = String(sunday.getUTCMonth() + 1).padStart(2, '0');
  const sundayYear = sunday.getUTCFullYear();
  const weekEnding = `${day}/${sundayMonth}/${sundayYear}`;

  return {
    periodMonth: month,
    periodYear: year,
    weekEnding,
  };
}

// Migration to backfill period fields for existing transactions
export const backfillPeriodFields = mutation({
  args: {
    churchId: v.optional(v.id("churches")),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx, args) => {
    let processed = 0;
    let updated = 0;
    let errors = 0;

    // Get all transactions (optionally filtered by church)
    let transactions;
    if (args.churchId) {
      const churchId = args.churchId; // Extract to satisfy TypeScript
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_church_date", (q) => q.eq("churchId", churchId))
        .collect();
    } else {
      transactions = await ctx.db.query("transactions").collect();
    }

    console.log(`Processing ${transactions.length} transactions...`);

    // Track unique period combinations to create periods
    const periodsToCreate = new Set<string>();

    for (const transaction of transactions) {
      processed++;

      try {
        // Skip if already has period fields
        if (transaction.periodMonth && transaction.periodYear && transaction.weekEnding) {
          continue;
        }

        // Calculate period fields from transaction date
        const periodFields = calculatePeriodFields(transaction.date);

        // Track this period for creation
        const periodKey = `${transaction.churchId}:${periodFields.periodYear}:${periodFields.periodMonth}`;
        periodsToCreate.add(periodKey);

        // Update transaction with period fields
        await ctx.db.patch(transaction._id, {
          periodMonth: periodFields.periodMonth,
          periodYear: periodFields.periodYear,
          weekEnding: periodFields.weekEnding,
        });

        updated++;

        // Log progress every 100 transactions
        if (processed % 100 === 0) {
          console.log(`Processed ${processed}/${transactions.length} transactions, updated ${updated}`);
        }
      } catch (error) {
        errors++;
        console.error(`Error processing transaction ${transaction._id}:`, error);
      }
    }

    // Create missing financial periods
    console.log(`Creating ${periodsToCreate.size} financial periods...`);
    let periodsCreated = 0;

    for (const periodKey of periodsToCreate) {
      const [churchIdStr, yearStr, monthStr] = periodKey.split(":");
      const churchId = churchIdStr as Id<"churches">;
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      try {
        await ctx.runMutation(api.financialPeriods.createOrGetPeriod, {
          churchId,
          month,
          year,
        });
        periodsCreated++;
      } catch (error) {
        console.error(`Error creating period ${month}/${year}:`, error);
      }
    }

    console.log(`Migration complete! Processed: ${processed}, Updated: ${updated}, Errors: ${errors}, Periods created: ${periodsCreated}`);

    return {
      processed,
      updated,
      errors,
    };
  },
});
