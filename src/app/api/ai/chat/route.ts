import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import type { Id } from "@/lib/convexGenerated";
import { api } from "@/lib/convexGenerated";
import { convexServerClient } from "@/lib/convexServerClient";
import { assertUserInChurch, requireSessionUser } from "@/lib/server-auth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const formatCurrencyMaybe = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return currencyFormatter.format(value);
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return currencyFormatter.format(numeric);
    }
  }
  return null;
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatContext {
  page?: string;
  fundId?: string;
  donorId?: string;
  transactionId?: string;
}

interface ChatRequest {
  message: string;
  context?: ChatContext;
  history?: ChatMessage[];
  churchId?: string;
}

const systemPrompt = `You are a financial assistant for ChurchCoin, a UK church finance management system. 
You help users understand their financial data, generate reports, and navigate the application.

Guidelines:
- Always format currency in GBP (£) with proper formatting (e.g., £1,234.56)
- Be concise and helpful, typically 2-3 sentences
- When presenting lists, use bullet points
- If you need to call a function to answer a question, use the available tools
- If the user's question is unclear, ask for clarification
- For general app questions, provide brief guidance
- Never make up financial data - only use data from function calls`;

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_fund_balance",
      description: "Get current balance for all funds or specific fund details",
      parameters: {
        type: "object",
        properties: {
          fundId: {
            type: "string",
            description: "Optional fund ID to get specific fund details",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_transactions",
      description: "Get recent transactions with optional filters",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of transactions to return (default 10)",
          },
          type: {
            type: "string",
            enum: ["income", "expense"],
            description: "Filter by transaction type",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_donors",
      description: "Search donors or get top donors by giving amount",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for donor name",
          },
          limit: {
            type: "number",
            description: "Number of donors to return (default 10)",
          },
          sortByAmount: {
            type: "boolean",
            description: "Sort by total giving amount (for top donors)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Get financial summary for a specific period",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          endDate: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
          reportType: {
            type: "string",
            enum: ["income-expense", "gift-aid", "monthly"],
            description: "Type of report to generate",
          },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
];

async function executeFunctionCall(
  functionName: string,
  args: Record<string, unknown>,
  churchId: Id<"churches">
) {
  // Currency formatter is defined in formatResponse function

  try {
    switch (functionName) {
      case "get_fund_balance": {
        if (typeof args.fundId === "string" && args.fundId) {
          const fund = await convexServerClient.query(api.funds.getFund, {
            fundId: args.fundId as Id<"funds">,
          });

          if (!fund || fund.churchId !== churchId) {
            return { error: "Fund not found" };
          }
          return {
            fundName: fund?.name,
            balance: fund?.balance,
            type: fund?.type,
          };
        } else {
          const funds = await convexServerClient.query(api.funds.list, {
            churchId,
          });
          const total = await convexServerClient.query(
            api.funds.getTotalBalance,
            { churchId }
          );
          return {
            totalBalance: total,
            funds: funds?.map((f) => ({
              id: f._id,
              name: f.name,
              balance: f.balance,
              type: f.type,
            })),
          };
        }
      }

      case "get_recent_transactions": {
        const limit = (args.limit as number) || 10;
        const transactions = await convexServerClient.query(
          api.transactions.getRecent,
          {
            churchId,
            limit,
          }
        );

        let filtered = transactions || [];
        if (args.type) {
          filtered = filtered.filter((t) => t.type === args.type);
        }

        return {
          count: filtered.length,
          transactions: filtered.slice(0, limit).map((t) => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type,
          })),
        };
      }

      case "search_donors": {
        const donors = await convexServerClient.query(api.donors.getDonors, {
          churchId,
        });


        let filtered = donors || [];
        if (args.query) {
          const query = (args.query as string).toLowerCase();
          filtered = filtered.filter((d) =>
            d.name.toLowerCase().includes(query)
          );
        }

        if (args.sortByAmount) {
          const donorsWithGiving = await Promise.all(
            filtered.map(async (donor) => {
              const history = await convexServerClient.query(
                api.donors.getDonorGivingHistory,
                { donorId: donor._id }
              );
              const transactions = Array.isArray(history) ? history : [];
              const total = transactions.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
              return { ...donor, totalGiving: total };
            })
          );

          filtered = donorsWithGiving.sort(
            (a, b) => b.totalGiving - a.totalGiving
          );
        }

        const limit = (args.limit as number) || 10;
        return {
          count: filtered.length,
          donors: filtered.slice(0, limit).map((d) => ({
            name: d.name,
            totalGiving: (d as typeof filtered[number] & { totalGiving: number }).totalGiving,
            hasGiftAid: d.giftAidDeclaration?.signed || false,
          })),
        };
      }

      case "get_financial_summary": {
        const { startDate, endDate, reportType } = args;

        if (reportType === "gift-aid") {
          const report = await convexServerClient.query(
            api.reports.getGiftAidClaimReport,
            {
              churchId,
              startDate: startDate as string,
              endDate: endDate as string,
            }
          );
          return {
            claimableAmount: report?.claimableAmount,
            giftAidValue: report?.giftAidValue,
            donorCount: report?.donorBreakdown.length,
            transactionCount: report?.transactionCount,
          };
        } else if (reportType === "monthly") {
          const report = await convexServerClient.query(
            api.reports.getMonthlyIncomeExpenseReport,
            {
              churchId,
              startDate: startDate as string,
              endDate: endDate as string,
            }
          );
          return {
            totalIncome: report?.totalIncome,
            totalExpense: report?.totalExpense,
            netSurplus: report?.netSurplus,
            monthlyBreakdown: report?.monthlyBreakdown,
          };
        } else {
          const report = await convexServerClient.query(
            api.reports.getIncomeExpenseReport,
            {
              churchId,
              startDate: startDate as string,
              endDate: endDate as string,
            }
          );
          return {
            income: report?.income,
            expense: report?.expense,
            net: report?.net,
            transactionCount: report?.transactions.length,
          };
        }
      }

      default:
        return { error: `Unknown function: ${functionName}` };
    }
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error);
    return { error: `Failed to fetch data: ${error}` };
  }
}

type FundResult = {
  name: string;
  balance: number;
  type?: string;
};

type TransactionResult = {
  date: string;
  description: string;
  amount: number;
  type?: string;
};

type DonorResult = {
  name: string;
  totalGiving?: number;
  hasGiftAid?: boolean;
};

function isFundResult(value: unknown): value is FundResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.balance === "number" &&
    (candidate.type === undefined || typeof candidate.type === "string")
  );
}

function isTransactionResult(value: unknown): value is TransactionResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.date === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.amount === "number" &&
    (candidate.type === undefined || typeof candidate.type === "string")
  );
}

function isDonorResult(value: unknown): value is DonorResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.name === "string";
}

function formatResponse(content: string, functionResults?: Record<string, unknown>): string {
  const supplements: string[] = [];

  if (functionResults) {
    if (functionResults.totalBalance !== undefined) {
      const total = formatCurrencyMaybe(functionResults.totalBalance);
      if (total) {
        const lines: string[] = [`Total balance across funds: ${total}`];
        if (Array.isArray(functionResults.funds)) {
          const fundLines = functionResults.funds
            .filter(isFundResult)
            .map((fund) => {
              const balance = formatCurrencyMaybe(fund.balance);
              return balance
                ? `• ${fund.name}: ${balance} (${fund.type ?? "Fund"})`
                : null;
            })
            .filter(Boolean);
          if (fundLines.length > 0) {
            lines.push(fundLines.join("\n"));
          }
        }
        supplements.push(lines.join("\n"));
      }
    } else if (functionResults.transactions) {
      if (Array.isArray(functionResults.transactions)) {
        const txnLines = functionResults.transactions
          .filter(isTransactionResult)
          .map((txn) => {
            const amount = formatCurrencyMaybe(txn.amount);
            return amount
              ? `• ${txn.date}: ${txn.description} - ${amount} (${txn.type ?? "transaction"})`
              : null;
          })
          .filter(Boolean);
        if (txnLines.length > 0) {
          supplements.push(`Recent transactions:\n${txnLines.join("\n")}`);
        }
      }
    } else if (functionResults.donors) {
      if (Array.isArray(functionResults.donors)) {
        const donorLines = functionResults.donors
          .filter(isDonorResult)
          .map((donor) => {
            const giving = donor.totalGiving
              ? ` - ${formatCurrencyMaybe(donor.totalGiving) ?? ""}`
              : "";
            const giftAid = donor.hasGiftAid ? " ✓ Gift Aid" : "";
            return `• ${donor.name}${giving}${giftAid}`;
          });
        if (donorLines.length > 0) {
          const donorCount = typeof functionResults.count === "number"
            ? functionResults.count
            : donorLines.length;
          supplements.push(`Found ${donorCount} donor(s):\n${donorLines.join("\n")}`);
        }
      }
    } else if (functionResults.giftAidValue !== undefined) {
      const claimable = formatCurrencyMaybe(functionResults.claimableAmount);
      const giftAid = formatCurrencyMaybe(functionResults.giftAidValue);
      if (claimable || giftAid) {
        const donorCount = typeof functionResults.donorCount === "number"
          ? functionResults.donorCount
          : "unknown";
        const txnCount = typeof functionResults.transactionCount === "number"
          ? functionResults.transactionCount
          : "unknown";
        const giftAidLines: string[] = [];
        if (claimable) giftAidLines.push(`• Claimable donations: ${claimable}`);
        if (giftAid) giftAidLines.push(`• Gift Aid value (25%): ${giftAid}`);
        giftAidLines.push(`• Donors: ${donorCount} across ${txnCount} transactions`);
        supplements.push(`Gift Aid summary:\n${giftAidLines.join("\n")}`);
      }
    } else if (functionResults.netSurplus !== undefined) {
      const income = formatCurrencyMaybe(functionResults.totalIncome);
      const expense = formatCurrencyMaybe(functionResults.totalExpense);
      const net = formatCurrencyMaybe(functionResults.netSurplus);
      if (income || expense || net) {
        const summaryLines: string[] = [];
        if (income) summaryLines.push(`• Total Income: ${income}`);
        if (expense) summaryLines.push(`• Total Expense: ${expense}`);
        if (net) summaryLines.push(`• Net Surplus: ${net}`);
        supplements.push(`Period summary:\n${summaryLines.join("\n")}`);
      }
    }
  }

  if (supplements.length === 0) {
    return content;
  }

  return `${content}\n\n${supplements.join("\n\n")}`;
}

async function buildFinancialSnapshot(churchId: Id<"churches">) {
  try {
    const endDate = new Date();
    const end = endDate.toISOString().slice(0, 10);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 5);
    const start = startDate.toISOString().slice(0, 10);

    const [fundSummary, monthlyReport] = await Promise.all([
      convexServerClient.query(api.reports.getFundBalanceSummary, {
        churchId,
      }),
      convexServerClient.query(api.reports.getMonthlyIncomeExpenseReport, {
        churchId,
        startDate: start,
        endDate: end,
      }),
    ]);

    const overviewLines: string[] = [];

    if (fundSummary) {
      const total = formatCurrencyMaybe(fundSummary.total);
      if (total) {
        overviewLines.push(`Current total fund balance: ${total}`);
      }

      if (Array.isArray(fundSummary.funds) && fundSummary.funds.length > 0) {
        const topFunds = [...fundSummary.funds]
          .sort((a, b) => b.balance - a.balance)
          .slice(0, 3)
          .map((fund) => {
            const balance = formatCurrencyMaybe(fund.balance);
            return balance ? `• ${fund.name}: ${balance} (${fund.type})` : null;
          })
          .filter(Boolean);
        if (topFunds.length > 0) {
          overviewLines.push(`Top funds:\n${topFunds.join("\n")}`);
        }
      }
    }

    if (monthlyReport && Array.isArray(monthlyReport.monthlyBreakdown)) {
      const recentMonths = monthlyReport.monthlyBreakdown
        .slice(-3)
        .map((month) => {
          const income = formatCurrencyMaybe(month.income) ?? "n/a";
          const expense = formatCurrencyMaybe(month.expense) ?? "n/a";
          const net = formatCurrencyMaybe(month.net) ?? "n/a";
          return `• ${month.month}: income ${income}, expense ${expense}, net ${net}`;
        });
      if (recentMonths.length > 0) {
        overviewLines.push(`Recent monthly performance:\n${recentMonths.join("\n")}`);
      }
    }

    if (overviewLines.length === 0) {
      return null;
    }

    return `Financial snapshot for the last 6 months:\n${overviewLines.join("\n\n")}`;
  } catch (error) {
    console.error("Failed to build financial snapshot", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body: ChatRequest = await request.json();
    const { message, context, history } = body;

    const requestedChurchId =
      typeof body.churchId === "string" ? body.churchId : undefined;
    const effectiveChurchId = (requestedChurchId ?? user.churchId ?? null) as
      | Id<"churches">
      | null;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!effectiveChurchId) {
      return NextResponse.json(
        {
          error: "Church context is required",
          message:
            "I need to know which church you're viewing before I can answer finance questions. Please try again once the dashboard finishes loading.",
        },
        { status: 400 }
      );
    }

    if (requestedChurchId) {
      assertUserInChurch(user, requestedChurchId as Id<"churches">);
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    const snapshot = await buildFinancialSnapshot(effectiveChurchId);
    if (snapshot) {
      messages.push({ role: "system", content: snapshot });
    }

    if (context) {
      let contextPrompt = "Current context: ";
      if (context.page) contextPrompt += `User is on the ${context.page} page. `;
      if (context.fundId)
        contextPrompt += `Looking at fund ID: ${context.fundId}. `;
      if (context.donorId)
        contextPrompt += `Looking at donor ID: ${context.donorId}. `;
      messages.push({ role: "system", content: contextPrompt });
    }

    if (history && history.length > 0) {
      history.slice(-5).forEach((msg) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 500,
    });

    const assistantMessage = completion.choices[0].message;

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];
      if (toolCall.type !== "function") {
        return NextResponse.json({ message: "I couldn't process that request." });
      }
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      const functionResult = await executeFunctionCall(
        functionName,
        functionArgs,
        effectiveChurchId
      );

      const secondMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...messages,
        assistantMessage,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult),
        },
      ];

      const secondCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: secondMessages,
        temperature: 0.3,
        max_tokens: 500,
      });

      const finalResponse =
        secondCompletion.choices[0].message.content ||
        "I couldn't process that request.";
      const formattedResponse = formatResponse(finalResponse, functionResult);

      return NextResponse.json({
        message: formattedResponse,
        functionCalled: functionName,
      });
    }

    const responseContent =
      assistantMessage.content || "I couldn't understand that. Could you rephrase?";

    return NextResponse.json({
      message: responseContent,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const status =
      typeof (error as { status?: number })?.status === "number"
        ? (error as { status: number }).status
        : 500;

    if (status === 401) {
      return NextResponse.json({ error: "Unauthorised" }, { status });
    }

    if (status === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status });
    }

    return NextResponse.json(
      {
        error: "Failed to process chat message",
        message:
          "I'm experiencing technical difficulties. Please try again in a moment.",
      },
      { status }
    );
  }
}
