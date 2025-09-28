import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";

import type { Doc, Id } from "@/lib/convexGenerated";
import { api, convexServerClient } from "@/lib/convexServerClient";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

const formatDate = (input: number | string | undefined) => {
  if (!input) {
    return "";
  }

  const date = typeof input === "number" ? new Date(input) : new Date(input);
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

type PendingSnapshot = {
  transaction?: Doc<"transactions">;
  description?: string;
  amount?: number;
  type?: "income" | "expense";
  date?: string;
  reason?: string;
  record?: { reason?: string };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const report = await convexServerClient.query(
    api.reconciliation.getReconciliationReport,
    { sessionId: sessionId as Id<"reconciliationSessions"> }
  );

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const doc = new PDFDocument({ margin: 48 });
  const buffers: Uint8Array[] = [];

  doc.on("data", (chunk: Uint8Array) => buffers.push(chunk));

  const session = report.session;
  const bankBalance = report.bankBalance ?? session.bankBalance;
  const ledgerBalance = report.ledgerBalance ?? session.ledgerBalance;
  const pendingTotal = report.pendingTotal ?? 0;
  const variance = report.variance ?? 0;
  const adjustments = report.adjustments ?? 0;

  doc.fontSize(20).text(`Reconciliation Report – ${session.month}`, { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Generated ${formatDate(Date.now())}`);
  doc.text(`Church ID: ${session.churchId}`);
  doc.moveDown();

  doc.fontSize(14).text("Summary", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Bank balance: ${currency.format(bankBalance)}`);
  doc.text(`Ledger balance: ${currency.format(ledgerBalance)}`);
  doc.text(`Adjustments: ${currency.format(adjustments)}`);
  doc.text(`Outstanding items: ${currency.format(pendingTotal)}`);
  doc.text(`Variance: ${currency.format(variance)}`);
  if (report.notes) {
    doc.moveDown();
    doc.fontSize(12).text("Notes:");
    doc.fontSize(11).text(report.notes, { indent: 12 });
  }

  const pending = (report.pendingTransactions ?? report.pending ?? []) as PendingSnapshot[];
  if (pending.length > 0) {
    doc.addPage();
    doc.fontSize(14).text("Outstanding items", { underline: true });
    doc.moveDown(0.5);
    pending.forEach((entry, index) => {
      const transaction =
        entry.transaction ??
        ({
          description: entry.description ?? "Pending item",
          amount: entry.amount ?? 0,
          type: entry.type ?? "income",
          date: entry.date,
        } as Doc<"transactions">);
      const reason = entry.reason ?? entry.record?.reason ?? "";
      const amount = transaction.amount ?? 0;
      const signAdjusted = transaction.type === "expense" ? -Math.abs(amount) : Math.abs(amount);
      const displayAmount = currency.format(signAdjusted);

      doc.fontSize(12).text(`${index + 1}. ${transaction.description ?? "Pending item"}`);
      doc.fontSize(11).text(`Amount: ${displayAmount}`);
      if (transaction.date) {
        doc.fontSize(11).text(`Date: ${formatDate(transaction.date)}`);
      }
      if (reason) {
        doc.fontSize(11).text(`Reason: ${reason}`);
      }
      doc.moveDown(0.5);
    });
  }

  const unreconciled = (report.unreconciled ?? []) as Doc<"transactions">[];
  if (unreconciled.length > 0) {
    doc.addPage();
    doc.fontSize(14).text("Unreconciled transactions", { underline: true });
    doc.moveDown(0.5);
    unreconciled.forEach((txn, index) => {
      const amount = currency.format(txn.type === "income" ? txn.amount : -txn.amount);
      doc.fontSize(12).text(`${index + 1}. ${txn.description}`);
      doc.fontSize(11).text(`Amount: ${amount}`);
      doc.fontSize(11).text(`Date: ${formatDate(txn.date)}`);
      doc.moveDown(0.5);
    });
  }

  doc.end();

  await new Promise((resolve) => doc.on("end", resolve));
  const pdfBuffer = Buffer.concat(buffers);

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reconciliation-${session.month}.pdf"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
