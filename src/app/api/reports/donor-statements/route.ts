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

  const { churchId, fromDate, toDate } = body as {
    churchId: string;
    fromDate: string;
    toDate: string;
  };

  if (!churchId || !fromDate || !toDate) {
    return NextResponse.json(
      { error: "churchId, fromDate and toDate are required" },
      { status: 400 }
    );
  }

  const statements = await convexServerClient.query(
    api.reports.getDonorStatementBatch,
    { churchId: churchId as Id<"churches">, fromDate, toDate }
  );

  const doc = new PDFDocument({ margin: 48 });
  const buffers: Uint8Array[] = [];
  doc.on("data", (chunk: Uint8Array) => buffers.push(chunk));

  statements.forEach((statement, index) => {
    if (index > 0) {
      doc.addPage();
    }

    const donor = statement.donor;
    doc.fontSize(20).text(`Giving statement – ${donor.name}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${fromDate} → ${toDate}`);
    if (donor.address) {
      doc.text(donor.address);
    }
    doc.moveDown();
    doc.fontSize(12).text(`Total received: ${currency.format(statement.total)}`);
    doc.moveDown();
    doc.fontSize(14).text("Transactions", { underline: true });

    if (statement.transactions.length === 0) {
      doc.fontSize(11).text("No transactions recorded in this period.");
    } else {
      statement.transactions.forEach((txn) => {
        doc.moveDown(0.3);
        doc.fontSize(12).text(`${txn.date} – ${txn.description}`);
        doc.fontSize(11).text(
          `Fund: ${txn.fundName ?? txn.fundId ?? "Unknown"} · Amount: ${currency.format(txn.amount)} · Gift Aid: ${
            txn.giftAid ? "Yes" : "No"
          }`
        );
      });
    }
  });

  doc.end();
  await new Promise((resolve) => doc.on("end", resolve));

  const pdfBuffer = Buffer.concat(buffers);
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="donor-statements-${fromDate}-${toDate}.pdf"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
