import { query } from "./_generated/server";
import { v } from "convex/values";

const MODEL_NAME = "gpt-4o-mini";

export const suggestCategory = query({
  args: {
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
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
              "You are an assistant that classifies church transactions into ledger categories. Respond with JSON containing categoryId and confidence (0-1).",
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
      throw new Error("Failed to get AI suggestion");
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No suggestion returned");
    }

    try {
      return JSON.parse(content);
    } catch {
      return {
        categoryId: null,
        confidence: 0,
        raw: content,
      };
    }
  },
});
