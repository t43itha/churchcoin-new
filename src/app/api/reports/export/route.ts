import type PDFKit from "pdfkit";
import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";

import type { Id } from "@/lib/convexGenerated";
import { api, convexServerClient } from "@/lib/convexServerClient";

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

  const { type, churchId, startDate, endDate } = body as {
    type: "fund-balance" | "income-expense";
    churchId: string;
    startDate?: string;
    endDate?: string;
  };

  if (!type || !churchId) {
    return NextResponse.json({ error: "type and churchId are required" }, { status: 400 });
  }

  let reportTitle = "Report";
  let buildPdf: (doc: PDFKit.PDFDocument) => Promise<void>;

  if (type === "fund-balance") {
    reportTitle = "Fund balance summary";
    const summary = await convexServerClient.query(
      api.reports.getFundBalanceSummary,
      { churchId: churchId as Id<"churches"> }
    );

    buildPdf = async (doc) => {
      doc.fontSize(20).text("Fund balance summary", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Generated ${new Date(summary.generatedAt).toLocaleString("en-GB")}`);
      doc.text(`Church ID: ${churchId}`);
      doc.moveDown();
      doc.fontSize(14).text(`Total balance: ${currency.format(summary.total)}`);
      doc.moveDown();
      summary.funds.forEach((fund, index) => {
        doc.fontSize(12).text(`${index + 1}. ${fund.name} (${fund.type})`);
        doc.fontSize(11).text(`Balance: ${currency.format(fund.balance)}`);
        doc.moveDown(0.5);
      });
    };
  } else {
    reportTitle = "Income & expenditure";
    const from = startDate ?? new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const to = endDate ?? new Date().toISOString().slice(0, 10);
    const report = await convexServerClient.query(
      api.reports.getIncomeExpenseReport,
      { churchId: churchId as Id<"churches">, startDate: from, endDate: to }
    );

    buildPdf = async (doc) => {
      doc.fontSize(20).text("Income & Expenditure", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Period: ${from} → ${to}`);
      doc.text(`Generated ${new Date(report.generatedAt).toLocaleString("en-GB")}`);
      doc.moveDown();
      doc.fontSize(12).text(`Income: ${currency.format(report.income)}`);
      doc.text(`Expense: ${currency.format(report.expense)}`);
      doc.text(`Net: ${currency.format(report.net)}`);
      doc.moveDown();
      doc.fontSize(14).text("Transactions", { underline: true });
      report.transactions.forEach((txn, index) => {
        doc.moveDown(0.3);
        doc.fontSize(12).text(`${index + 1}. ${txn.date} – ${txn.description}`);
        doc.fontSize(11).text(`Type: ${txn.type} · Amount: ${currency.format(txn.amount)}`);
      });
    };
  }

  const doc = new PDFDocument({ margin: 48 });
  const buffers: Uint8Array[] = [];
  doc.on("data", (chunk: Uint8Array) => buffers.push(chunk));

  await buildPdf(doc);
  doc.end();
  await new Promise((resolve) => doc.on("end", resolve));

  const pdfBuffer = Buffer.concat(buffers);
  const filename = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename || type}-report.pdf"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
