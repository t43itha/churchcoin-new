import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
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

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

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

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const lineHeight = 16;
  let y = page.getHeight() - margin;

  const writeLine = (text: string, options?: { bold?: boolean; size?: number }) => {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([595, 842]);
      y = page.getHeight() - margin;
    }
    const size = options?.size ?? 12;
    const bold = options?.bold ?? false;
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight;
  };

  const addSpacer = (amount = lineHeight / 2) => {
    y -= amount;
  };

  const session = report.session;
  const bankBalance = report.bankBalance ?? session.bankBalance;
  const ledgerBalance = report.ledgerBalance ?? session.ledgerBalance;
  const pendingTotal = report.pendingTotal ?? 0;
  const variance = report.variance ?? 0;
  const adjustments = report.adjustments ?? 0;

  writeLine(`Reconciliation Report – ${session.month}`, { bold: true, size: 18 });
  addSpacer();
  writeLine(`Generated ${formatDate(Date.now())}`);
  writeLine(`Church ID: ${session.churchId}`);
  addSpacer();

  writeLine("Summary", { bold: true, size: 14 });
  addSpacer(6);
  writeLine(`Bank balance: ${currency.format(bankBalance)}`);
  writeLine(`Ledger balance: ${currency.format(ledgerBalance)}`);
  writeLine(`Adjustments: ${currency.format(adjustments)}`);
  writeLine(`Outstanding items: ${currency.format(pendingTotal)}`);
  writeLine(`Variance: ${currency.format(variance)}`);
  if (report.notes) {
    addSpacer();
    writeLine("Notes:", { bold: true });
    const lines = wrapText(report.notes, font, 11, page.getWidth() - margin * 2);
    lines.forEach((line) => {
      writeLine(line, { size: 11 });
    });
  }

  const pending = (report.pendingTransactions ?? report.pending ?? []) as PendingSnapshot[];
  if (pending.length > 0) {
    page = pdfDoc.addPage([595, 842]);
    y = page.getHeight() - margin;
    writeLine("Outstanding items", { bold: true, size: 14 });
    addSpacer(6);
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

      writeLine(`${index + 1}. ${transaction.description ?? "Pending item"}`, {
        bold: true,
      });
      writeLine(`Amount: ${displayAmount}`, { size: 11 });
      if (transaction.date) {
        writeLine(`Date: ${formatDate(transaction.date)}`, { size: 11 });
      }
      if (reason) {
        writeLine(`Reason: ${reason}`, { size: 11 });
      }
      addSpacer();
    });
  }

  const unreconciled = (report.unreconciled ?? []) as Doc<"transactions">[];
  if (unreconciled.length > 0) {
    page = pdfDoc.addPage([595, 842]);
    y = page.getHeight() - margin;
    writeLine("Unreconciled transactions", { bold: true, size: 14 });
    addSpacer(6);
    unreconciled.forEach((txn, index) => {
      const amount = currency.format(txn.type === "income" ? txn.amount : -txn.amount);
      writeLine(`${index + 1}. ${txn.description}`, { bold: true });
      writeLine(`Amount: ${amount}`, { size: 11 });
      writeLine(`Date: ${formatDate(txn.date)}`, { size: 11 });
      addSpacer();
    });
  }

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reconciliation-${session.month}.pdf"`,
      "Content-Length": pdfBytes.length.toString(),
    },
  });
}
