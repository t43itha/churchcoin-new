import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

const MODEL_NAME = "deepseek-chat";
// DeepSeek pricing: $0.55/1M input tokens, $2.19/1M output tokens
// Average: ~$1.37/1M tokens = £0.0011/1K tokens (99% cheaper than OpenAI)
const MODEL_INPUT_COST = 0.00044; // £0.44 per 1M input tokens
const MODEL_OUTPUT_COST = 0.00175; // £1.75 per 1M output tokens
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const clampConfidence = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
};

const normaliseDescription = (input: string) =>
  input.trim().toLowerCase().replace(/\s+/g, " ");

const buildCacheKey = (
  churchId: Id<"churches">,
  description: string,
  amount: number
) => {
  // Simple hash function using basic string operations for caching
  const input = `${churchId}:${normaliseDescription(description)}:${amount.toFixed(2)}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
};

type SuggestionPayload = {
  categoryId: string | null;
  confidence: number;
  source: "feedback" | "cache" | "model";
  reason?: string;
};

const parseSuggestion = (value: unknown): SuggestionPayload | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const categoryId =
    typeof payload.categoryId === "string" ? payload.categoryId : null;
  const confidence = clampConfidence(
    typeof payload.confidence === "number"
      ? payload.confidence
      : Number(payload.confidence)
  );
  const source =
    payload.source === "feedback" ||
    payload.source === "cache" ||
    payload.source === "model"
      ? payload.source
      : "cache";

  return {
    categoryId,
    confidence,
    source,
    reason: typeof payload.reason === "string" ? payload.reason : undefined,
  };
};

const parseResponseContent = (content: string): SuggestionPayload => {
  try {
    const parsed = JSON.parse(content);
    return {
      categoryId: typeof parsed.categoryId === "string" ? parsed.categoryId : null,
      confidence: clampConfidence(
        typeof parsed.confidence === "number"
          ? parsed.confidence
          : Number(parsed.confidence)
      ),
      source: "model",
      reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
    } satisfies SuggestionPayload;
  } catch (error) {
    console.error("Failed to parse AI suggestion", error);
    return {
      categoryId: null,
      confidence: 0,
      source: "model",
      reason: content,
    } satisfies SuggestionPayload;
  }
};

const upsertCache = async (
  ctx: MutationCtx,
  key: string,
  payload: SuggestionPayload,
  churchId: Id<"churches">
) => {
  const existing = await ctx.db
    .query("aiCache")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  const body = JSON.stringify(payload);
  const expiresAt = Date.now() + CACHE_TTL_MS;

  if (existing) {
    await ctx.db.patch(existing._id, {
      value: body,
      expiresAt,
      model: MODEL_NAME,
      churchId,
    });
  } else {
    await ctx.db.insert("aiCache", {
      key,
      value: body,
      model: MODEL_NAME,
      expiresAt,
      churchId,
    });
  }
};

// Internal version for calling from other mutations
export const suggestCategoryInternal = internalMutation({
  args: {
    churchId: v.id("churches"),
    description: v.string(),
    amount: v.number(),
    categories: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        type: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const cacheKey = buildCacheKey(
      args.churchId,
      args.description,
      args.amount
    );

    const learned = await ctx.db
      .query("aiFeedback")
      .withIndex("by_church_input", (q) =>
        q.eq("churchId", args.churchId).eq("inputHash", cacheKey)
      )
      .first();

    if (learned) {
      const payload: SuggestionPayload = {
        categoryId: learned.chosenCategoryId,
        confidence: clampConfidence(learned.confidence),
        source: "feedback",
        reason: "Learnt from previous correction",
      };
      await upsertCache(ctx, cacheKey, payload, args.churchId);
      return payload;
    }

    const cached = await ctx.db
      .query("aiCache")
      .withIndex("by_key", (q) => q.eq("key", cacheKey))
      .first();

    if (cached && cached.expiresAt > Date.now()) {
      const payload = parseSuggestion(JSON.parse(cached.value));
      if (payload) {
        return { ...payload, source: "cache" } satisfies SuggestionPayload;
      }
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new ConvexError("DEEPSEEK_API_KEY not configured");
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: "system",
            content:
              "You classify church ledger transactions. Return JSON with categoryId (string) and confidence (0-1).",
          },
          {
            role: "user",
            content: JSON.stringify({
              description: args.description,
              amount: args.amount,
              categories: args.categories,
            }),
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new ConvexError("Failed to get AI suggestion");
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      throw new ConvexError("No suggestion returned");
    }

    const suggestion = parseResponseContent(content);
    await upsertCache(ctx, cacheKey, suggestion, args.churchId);

    const usage = json.usage ?? {};
    const promptTokens = Number(usage.prompt_tokens ?? 0);
    const completionTokens = Number(usage.completion_tokens ?? 0);
    const totalTokens = Number(usage.total_tokens ?? promptTokens + completionTokens);

    // Calculate cost using DeepSeek pricing
    const inputCost = (promptTokens / 1_000_000) * MODEL_INPUT_COST;
    const outputCost = (completionTokens / 1_000_000) * MODEL_OUTPUT_COST;
    const cost = inputCost + outputCost;

    await ctx.db.insert("aiUsage", {
      churchId: args.churchId,
      model: MODEL_NAME,
      promptTokens,
      completionTokens,
      totalTokens,
      cost,
      createdAt: Date.now(),
    });

    return suggestion satisfies SuggestionPayload;
  },
});

// Public version for calling from frontend
export const suggestCategory = mutation({
  args: {
    churchId: v.id("churches"),
    description: v.string(),
    amount: v.number(),
    categories: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        type: v.string(),
      })
    ),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const cacheKey = buildCacheKey(
      args.churchId,
      args.description,
      args.amount
    );

    const learned = await ctx.db
      .query("aiFeedback")
      .withIndex("by_church_input", (q) =>
        q.eq("churchId", args.churchId).eq("inputHash", cacheKey)
      )
      .first();

    if (learned) {
      const payload: SuggestionPayload = {
        categoryId: learned.chosenCategoryId,
        confidence: clampConfidence(learned.confidence),
        source: "feedback",
        reason: "Learnt from previous correction",
      };
      await upsertCache(ctx, cacheKey, payload, args.churchId);
      return payload;
    }

    const cached = await ctx.db
      .query("aiCache")
      .withIndex("by_key", (q) => q.eq("key", cacheKey))
      .first();

    if (cached && cached.expiresAt > Date.now()) {
      const payload = parseSuggestion(JSON.parse(cached.value));
      if (payload) {
        return { ...payload, source: "cache" } satisfies SuggestionPayload;
      }
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new ConvexError("DEEPSEEK_API_KEY not configured");
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: "system",
            content:
              "You classify church ledger transactions. Return JSON with categoryId (string) and confidence (0-1).",
          },
          {
            role: "user",
            content: JSON.stringify({
              description: args.description,
              amount: args.amount,
              categories: args.categories,
            }),
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new ConvexError("Failed to get AI suggestion");
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      throw new ConvexError("No suggestion returned");
    }

    const suggestion = parseResponseContent(content);
    await upsertCache(ctx, cacheKey, suggestion, args.churchId);

    const usage = json.usage ?? {};
    const promptTokens = Number(usage.prompt_tokens ?? 0);
    const completionTokens = Number(usage.completion_tokens ?? 0);
    const totalTokens = Number(usage.total_tokens ?? promptTokens + completionTokens);

    // Calculate cost using DeepSeek pricing
    const inputCost = (promptTokens / 1_000_000) * MODEL_INPUT_COST;
    const outputCost = (completionTokens / 1_000_000) * MODEL_OUTPUT_COST;
    const cost = inputCost + outputCost;

    await ctx.db.insert("aiUsage", {
      churchId: args.churchId,
      model: MODEL_NAME,
      promptTokens,
      completionTokens,
      totalTokens,
      cost,
      createdAt: Date.now(),
    });

    return suggestion satisfies SuggestionPayload;
  },
});

export const recordFeedback = mutation({
  args: {
    churchId: v.id("churches"),
    description: v.string(),
    amount: v.number(),
    categoryId: v.id("categories"),
    confidence: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const cacheKey = buildCacheKey(
      args.churchId,
      args.description,
      args.amount
    );

    const payload: SuggestionPayload = {
      categoryId: args.categoryId,
      confidence: clampConfidence(args.confidence ?? 0.95),
      source: "feedback",
      reason: "User correction recorded",
    };

    const existing = await ctx.db
      .query("aiFeedback")
      .withIndex("by_church_input", (q) =>
        q.eq("churchId", args.churchId).eq("inputHash", cacheKey)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        chosenCategoryId: args.categoryId,
        confidence: payload.confidence,
        description: args.description,
        amount: args.amount,
        createdAt: Date.now(),
        userId: args.userId,
      });
    } else {
      await ctx.db.insert("aiFeedback", {
        churchId: args.churchId,
        inputHash: cacheKey,
        description: args.description,
        amount: args.amount,
        chosenCategoryId: args.categoryId,
        confidence: payload.confidence,
        createdAt: Date.now(),
        userId: args.userId,
      });
    }

    await upsertCache(ctx, cacheKey, payload, args.churchId);

    return payload;
  },
});

export const getUsageSummary = query({
  args: {
    churchId: v.optional(v.id("churches")),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const queryBuilder = args.churchId
      ? ctx.db
          .query("aiUsage")
          .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      : ctx.db.query("aiUsage");

    const entries = await queryBuilder.collect();
    const since = args.since ?? 0;

    const filtered = entries.filter((entry) => entry.createdAt >= since);
    const totals = filtered.reduce(
      (acc, entry) => {
        acc.cost += entry.cost;
        acc.promptTokens += entry.promptTokens;
        acc.completionTokens += entry.completionTokens;
        acc.totalTokens += entry.totalTokens;
        return acc;
      },
      {
        cost: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      }
    );

    return {
      ...totals,
      calls: filtered.length,
    };
  },
});

export const listFeedback = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiFeedback")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .order("desc")
      .take(50);
  },
});

const CLAUDE_MODEL = "claude-3-haiku-20240307";
const NARRATIVE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export const generateReportNarrative = mutation({
  args: {
    churchId: v.id("churches"),
    reportType: v.union(
      v.literal("fund-balance"),
      v.literal("income-expense"),
      v.literal("gift-aid"),
      v.literal("annual-summary"),
      v.literal("monthly")
    ),
    reportData: v.any(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const cacheKey = buildCacheKey(
      args.churchId,
      `${args.reportType}-narrative`,
      Date.now()
    );

    const cached = await ctx.db
      .query("aiCache")
      .withIndex("by_key", (q) => q.eq("key", cacheKey))
      .first();

    if (cached && cached.expiresAt > Date.now()) {
      const payload = JSON.parse(cached.value);
      return { narrative: payload.narrative, source: "cache" };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ConvexError("ANTHROPIC_API_KEY not configured");
    }

    const systemPrompt = `You are a financial advisor for UK churches and charities. Generate clear, trustee-friendly narratives explaining financial reports. Focus on insights, trends, and actionable recommendations. Keep explanations concise (2-3 paragraphs max) and in plain English.`;

    const userPrompt = `Generate a narrative summary for this ${args.reportType} report:\n\n${JSON.stringify(
      args.reportData,
      null,
      2
    )}\n\nExplain the key findings, notable trends, and any recommendations for the church leadership.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      throw new ConvexError("Failed to generate narrative");
    }

    const json = await response.json();
    const narrative = json.content?.[0]?.text;

    if (!narrative) {
      throw new ConvexError("No narrative returned");
    }

    const narrativePayload = { narrative, source: "model" };
    const cachePayload = { 
      categoryId: null, 
      confidence: 0, 
      source: "model" as const,
      narrative 
    };
    await upsertCache(ctx, cacheKey, cachePayload, args.churchId);

    const usage = json.usage ?? {};
    const inputTokens = Number(usage.input_tokens ?? 0);
    const outputTokens = Number(usage.output_tokens ?? 0);
    const totalTokens = inputTokens + outputTokens;
    const cost = totalTokens > 0 ? (totalTokens / 1000) * 0.0005 : 0;

    await ctx.db.insert("aiUsage", {
      churchId: args.churchId,
      model: CLAUDE_MODEL,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens,
      cost,
      createdAt: Date.now(),
    });

    return narrativePayload;
  },
});
