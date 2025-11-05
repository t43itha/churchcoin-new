import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";

import type { Id } from "@/lib/convexGenerated";
import { api } from "@/lib/convexServerClient";
import { assertUserInChurch, requireSessionContext } from "@/lib/server-auth";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const sessionResult = await requireSessionContext().catch((error: Error) => error);
  if (sessionResult instanceof Error) {
    const status = (sessionResult as { status?: number }).status ?? 500;
    return NextResponse.json({ error: sessionResult.message }, { status });
  }
  const { user, client } = sessionResult;

  const { type, churchId: rawChurchId, startDate, endDate } = body as {
    type: "fund-balance" | "income-expense";
    churchId?: string;
    startDate?: string;
    endDate?: string;
  };

  const resolvedChurchId = (rawChurchId ?? user.churchId ?? null) as
    | Id<"churches">
    | null;

  if (!type || !resolvedChurchId) {
    return NextResponse.json(
      { error: "type and church context are required" },
      { status: 400 }
    );
  }

  if (rawChurchId) {
    assertUserInChurch(user, resolvedChurchId);
  }

  let reportTitle = "Report";
  let buildSections: () => Promise<string[]>;

  if (type === "fund-balance") {
    reportTitle = "Fund balance summary";
    const summary = await client.query(api.reports.getFundBalanceSummary, {
      churchId: resolvedChurchId,
    });

    buildSections = async () => {
      const sections: string[] = [];
      sections.push("Fund balance summary");
      sections.push(`Generated ${new Date(summary.generatedAt).toLocaleString("en-GB")}`);
      sections.push(`Church ID: ${resolvedChurchId}`);
      sections.push("");
      sections.push(`Total balance: ${currency.format(summary.total)}`);
      sections.push("");
      summary.funds.forEach((fund, index) => {
        sections.push(`${index + 1}. ${fund.name} (${fund.type})`);
        sections.push(`Balance: ${currency.format(fund.balance)}`);
        sections.push("");
      });
      return sections;
    };
  } else {
    reportTitle = "Income & expenditure";
    const from = startDate ?? new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = endDate ?? new Date().toISOString().slice(0, 10);
    const report = await client.query(api.reports.getIncomeExpenseReport, {
      churchId: resolvedChurchId,
      startDate: from,
      endDate: to,
    });

    buildSections = async () => {
      const sections: string[] = [];
      sections.push("Income & Expenditure");
      sections.push(`Period: ${from} → ${to}`);
      sections.push(`Generated ${new Date(report.generatedAt).toLocaleString("en-GB")}`);
      sections.push("");
      sections.push(`Income: ${currency.format(report.income)}`);
      sections.push(`Expense: ${currency.format(report.expense)}`);
      sections.push(`Net: ${currency.format(report.net)}`);
      sections.push("");
      sections.push("Transactions:");
      report.transactions.forEach((txn, index) => {
        sections.push(`${index + 1}. ${txn.date} – ${txn.description}`);
        sections.push(`Type: ${txn.type} · Amount: ${currency.format(txn.amount)}`);
        sections.push("");
      });
      return sections;
    };
  }

  const pdfDoc = await PDFDocument.create();
  let currentPage = pdfDoc.addPage([595, 842]);
  const margin = 50;
  let y = currentPage.getHeight() - margin;
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const lineHeight = 16;

  const sections = await buildSections();

  const writeLine = (text: string, bold = false) => {
    if (y < margin + lineHeight) {
      currentPage = pdfDoc.addPage([595, 842]);
      y = currentPage.getHeight() - margin;
    }
    currentPage.drawText(text, {
      x: margin,
      y,
      size: bold ? 14 : 12,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight;
  };

  sections.forEach((line, index) => {
    const bold = index === 0;
    if (line === "") {
      y -= lineHeight / 2;
    } else {
      writeLine(line, bold);
    }
  });

  const pdfBytes = await pdfDoc.save();
  const filename = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename || type}-report.pdf"`,
      "Content-Length": pdfBytes.length.toString(),
    },
  });
}
