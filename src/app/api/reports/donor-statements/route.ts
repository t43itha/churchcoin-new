import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import type { Id } from "@/lib/convexGenerated";
import { api, convexServerClient } from "@/lib/convexServerClient";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

const pageSize: [number, number] = [595, 842];

const buildingPalette = {
  background: rgb(1, 1, 1),
  primary: rgb(0.78, 0.57, 0.39),
  secondary: rgb(0.1, 0.14, 0.2),
  accent: rgb(0.992, 0.976, 0.94),
  text: rgb(0.11, 0.11, 0.12),
  muted: rgb(0.45, 0.45, 0.45),
};

type DonorStatement = {
  donor: {
    name: string;
    address?: string | null;
    email?: string | null;
    giftAidDeclaration?: {
      signed?: boolean;
      signedAt?: string | number | null;
    } | null;
  };
  transactions: Array<{
    _id: string;
    date: string;
    description: string;
    amount: number;
    giftAid?: boolean;
    fundName?: string | null;
  }>;
  total: number;
  pledgeSummary?: {
    pledgedTotal: number;
    totalPaid: number;
    balanceDue: number;
    pledgeCount: number;
  };
};

type BuildingPageOptions = {
  continued: boolean;
};

type BuildingRenderContext = {
  statement: DonorStatement;
  fonts: { regular: PDFFont; bold: PDFFont };
  logo?: PDFImage;
  fromDate: string;
  toDate: string;
  pdfDoc: PDFDocument;
};

type BuildingTableContext = BuildingRenderContext & { page: PDFPage };

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [] as string[];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawBuildingHeader(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  statement: DonorStatement,
  fromDate: string,
  toDate: string,
  logo: PDFImage | undefined,
  pageNumber: number,
  options: BuildingPageOptions
) {
  const { continued } = options;
  const { width, height } = page.getSize();
  const margin = 56;
  const headerHeight = 136;

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: buildingPalette.background,
  });

  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width,
    height: headerHeight,
    color: rgb(1, 1, 1),
  });

  page.drawRectangle({
    x: 0,
    y: height - 14,
    width,
    height: 14,
    color: buildingPalette.primary,
  });

  let titleX = margin;
  if (logo) {
    const scaled = logo.scale(130 / logo.width);
    page.drawImage(logo, {
      x: margin,
      y: height - headerHeight + (headerHeight - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height,
    });
    titleX += scaled.width + 20;
  }

  page.drawText("Building Fund Statement", {
    x: titleX,
    y: height - margin + 12,
    size: 24,
    font: fonts.bold,
    color: buildingPalette.secondary,
  });

  page.drawText(statement.donor.name, {
    x: titleX,
    y: height - margin - 14,
    size: 12,
    font: fonts.regular,
    color: buildingPalette.secondary,
  });

  page.drawText(`Period: ${fromDate} – ${toDate}`, {
    x: titleX,
    y: height - margin - 32,
    size: 11,
    font: fonts.regular,
    color: buildingPalette.muted,
  });

  page.drawText(`Page ${pageNumber}`, {
    x:
      width -
      margin -
      fonts.regular.widthOfTextAtSize(`Page ${pageNumber}`, 10),
    y: height - margin - 32,
    size: 10,
    font: fonts.regular,
    color: buildingPalette.muted,
  });

  if (continued) {
    page.drawText("Statement Continuation", {
      x: titleX,
      y: height - margin - 48,
      size: 11,
      font: fonts.regular,
      color: buildingPalette.secondary,
    });
  }

  page.drawLine({
    start: { x: margin, y: margin + 24 },
    end: { x: width - margin, y: margin + 24 },
    thickness: 1,
    color: buildingPalette.primary,
  });

  page.drawText("Thank you for investing in the Legacy Building Project vision.", {
    x: margin,
    y: margin + 10,
    size: 10,
    font: fonts.regular,
    color: buildingPalette.muted,
  });
}

function drawSummarySection(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  statement: DonorStatement,
  fromDate: string,
  toDate: string,
  startY: number
) {
  const { width } = page.getSize();
  const margin = 56;
  const hasPledgeSummary = Boolean(statement.pledgeSummary);
  const cardHeight = hasPledgeSummary ? 148 : 108;
  const cardY = startY - cardHeight;

  const giftAidTotal = statement.transactions
    .filter((txn) => txn.giftAid)
    .reduce((sum, txn) => sum + txn.amount, 0);

  page.drawRectangle({
    x: margin,
    y: cardY,
    width: width - margin * 2,
    height: cardHeight,
    color: buildingPalette.accent,
    borderColor: buildingPalette.primary,
    borderWidth: 1.2,
  });

  page.drawText("Contribution Summary", {
    x: margin + 18,
    y: cardY + cardHeight - 26,
    size: 13,
    font: fonts.bold,
    color: buildingPalette.secondary,
  });

  const baseY = cardY + cardHeight - 60;
  const columnWidth = (width - margin * 2 - 36) / 3;
  const metricsRows: Array<
    Array<{ label: string; value: string }>
  > = [];

  if (statement.pledgeSummary) {
    metricsRows.push([
      {
        label: "Pledge Amount",
        value: currency.format(statement.pledgeSummary.pledgedTotal),
      },
      {
        label: "Total Paid",
        value: currency.format(statement.pledgeSummary.totalPaid),
      },
      {
        label: "Balance Due",
        value: currency.format(statement.pledgeSummary.balanceDue),
      },
    ]);
  }

  metricsRows.unshift([
    {
      label: "Gift Aid Eligible",
      value: currency.format(giftAidTotal),
    },
    {
      label: "Number of Gifts",
      value: `${statement.transactions.length}`,
    },
    {
      label: "Average Gift",
      value:
        statement.transactions.length > 0
          ? currency.format(statement.total / statement.transactions.length)
          : currency.format(0),
    },
  ]);

  metricsRows.forEach((row, rowIndex) => {
    const rowY = baseY - rowIndex * 42;
    row.forEach((item, index) => {
      const x = margin + 18 + index * columnWidth;
      page.drawText(item.label, {
        x,
        y: rowY + 14,
        size: 10,
        font: fonts.regular,
        color: buildingPalette.muted,
      });

      page.drawText(item.value, {
        x,
        y: rowY,
        size: 14,
        font: fonts.bold,
        color: buildingPalette.secondary,
      });
    });
  });

  return cardY - 24;
}

function drawSectionHeading(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  title: string,
  y: number
) {
  const { width } = page.getSize();
  const margin = 56;
  const headingY = y - 8;

  page.drawText(title, {
    x: margin,
    y: headingY,
    size: 12,
    font: fonts.bold,
    color: buildingPalette.secondary,
  });

  page.drawLine({
    start: { x: margin, y: headingY - 6 },
    end: { x: width - margin, y: headingY - 6 },
    thickness: 1,
    color: buildingPalette.primary,
  });

  return headingY - 20;
}

function drawDonorDetails(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  statement: DonorStatement,
  startY: number
) {
  let y = drawSectionHeading(page, fonts, "Donor Details", startY);
  const { width } = page.getSize();
  const margin = 56;
  const contentWidth = width - margin * 2;
  const fontSize = 10;

  page.drawText(statement.donor.name, {
    x: margin,
    y,
    size: fontSize,
    font: fonts.bold,
    color: buildingPalette.text,
  });

  y -= 14;

  if (statement.donor.address) {
    const addressLines = wrapText(
      statement.donor.address,
      fonts.regular,
      fontSize,
      contentWidth
    );

    for (const line of addressLines) {
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font: fonts.regular,
        color: buildingPalette.text,
      });
      y -= 12;
    }
  }

  if (statement.donor.email) {
    page.drawText(statement.donor.email, {
      x: margin,
      y,
      size: fontSize,
      font: fonts.regular,
      color: buildingPalette.text,
    });
    y -= 14;
  }

  const giftAidStatus = statement.donor.giftAidDeclaration?.signed
    ? "Gift Aid declaration is on file."
    : "No Gift Aid declaration recorded.";

  page.drawText(giftAidStatus, {
    x: margin,
    y,
    size: fontSize,
    font: fonts.regular,
    color: buildingPalette.muted,
  });

  return y - 24;
}

function drawTransactionsTable(
  context: BuildingTableContext,
  startY: number
) {
  const { pdfDoc, fonts, statement } = context;
  let { page } = context;
  let y = startY;
  let pageNumber = 1;
  const margin = 56;
  const tableWidth = page.getSize().width - margin * 2;
  const headerHeight = 30;
  const columnWidths = {
    date: 86,
    amount: 96,
    giftAid: 68,
    description: tableWidth - (86 + 96 + 68),
  } as const;

  const rows = [...statement.transactions].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const columnPositions = {
    date: margin + 12,
    description: margin + 12 + columnWidths.date + 12,
    amount:
      margin + columnWidths.date + columnWidths.description + columnWidths.amount - 12,
    giftAid:
      margin + columnWidths.date + columnWidths.description + columnWidths.amount + 12,
  } as const;

  const ensureSpace = (required: number, continuation = false) => {
    if (y - required < margin + 50) {
      pageNumber += 1;
      page = pdfDoc.addPage(pageSize);
      drawBuildingHeader(
        page,
        fonts,
        statement,
        context.fromDate,
        context.toDate,
        context.logo,
        pageNumber,
        { continued: true }
      );
      y = page.getSize().height - 136 - 40;
      if (continuation) {
        drawTableHeader(false);
      }
    }
  };

  const drawTableHeader = (withSpacing: boolean) => {
    if (withSpacing) {
      y -= 12;
    }
    page.drawRectangle({
      x: margin,
      y: y - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: buildingPalette.secondary,
    });

    const headerY = y - 20;
    page.drawText("Date", {
      x: columnPositions.date,
      y: headerY,
      size: 11,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    });

    page.drawText("Description", {
      x: columnPositions.description,
      y: headerY,
      size: 11,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    });

    const amountHeaderX =
      margin + columnWidths.date + columnWidths.description + columnWidths.amount / 2;
    page.drawText("Amount", {
      x: amountHeaderX - fonts.bold.widthOfTextAtSize("Amount", 11) / 2,
      y: headerY,
      size: 11,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    });

    const giftAidHeaderX =
      margin +
      columnWidths.date +
      columnWidths.description +
      columnWidths.amount +
      columnWidths.giftAid / 2;
    page.drawText("Gift Aid", {
      x: giftAidHeaderX - fonts.bold.widthOfTextAtSize("Gift Aid", 11) / 2,
      y: headerY,
      size: 11,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    });

    y -= headerHeight + 8;
  };

  drawTableHeader(true);

  if (rows.length === 0) {
    ensureSpace(60);
    page.drawText("No recorded contributions in this period.", {
      x: margin,
      y,
      size: 11,
      font: fonts.regular,
      color: buildingPalette.muted,
    });
    return;
  }

  rows.forEach((txn, index) => {
    const descriptionLines = wrapText(
      txn.description || "Contribution",
      fonts.regular,
      10,
      columnWidths.description - 24
    );
    const rowHeight = Math.max(28, descriptionLines.length * 12 + 14);

    ensureSpace(rowHeight + 16, true);

    const rowY = y - rowHeight;
    if (index % 2 === 0) {
      page.drawRectangle({
        x: margin,
        y: rowY,
        width: tableWidth,
        height: rowHeight,
        color: rgb(1, 1, 1),
      });
    }

    page.drawText(txn.date, {
      x: columnPositions.date,
      y: rowY + rowHeight - 16,
      size: 10,
      font: fonts.regular,
      color: buildingPalette.text,
    });

    let textY = rowY + rowHeight - 16;
    for (const line of descriptionLines) {
      page.drawText(line, {
        x: columnPositions.description,
        y: textY,
        size: 10,
        font: fonts.regular,
        color: buildingPalette.text,
      });
      textY -= 12;
    }

    const amountText = currency.format(txn.amount);
    const amountX =
      margin +
      columnWidths.date +
      columnWidths.description +
      columnWidths.amount -
      12 -
      fonts.regular.widthOfTextAtSize(amountText, 10);

    page.drawText(amountText, {
      x: amountX,
      y: rowY + rowHeight - 16,
      size: 10,
      font: fonts.bold,
      color: buildingPalette.secondary,
    });

    const giftAidText = txn.giftAid ? "Yes" : "No";
    const giftAidX =
      margin +
      columnWidths.date +
      columnWidths.description +
      columnWidths.amount +
      columnWidths.giftAid / 2 -
      fonts.regular.widthOfTextAtSize(giftAidText, 10) / 2;

    page.drawText(giftAidText, {
      x: giftAidX,
      y: rowY + rowHeight - 16,
      size: 10,
      font: fonts.regular,
      color: buildingPalette.text,
    });

    y = rowY - 8;
  });
}

function renderBuildingFundStatement(
  context: BuildingRenderContext
) {
  const { pdfDoc, fonts, statement, fromDate, toDate, logo } = context;
  const pageNumber = 1;
  const page = pdfDoc.addPage(pageSize);

  drawBuildingHeader(
    page,
    fonts,
    statement,
    fromDate,
    toDate,
    logo,
    pageNumber,
    { continued: false }
  );

  let y = page.getSize().height - 136 - 40;
  y = drawSummarySection(page, fonts, statement, fromDate, toDate, y);

  y = drawDonorDetails(page, fonts, statement, y);

  const tableContext: BuildingTableContext = {
    ...context,
    page,
  };

  drawTransactionsTable(tableContext, y);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { churchId, fromDate, toDate, fundType } = body as {
      churchId: string;
      fromDate: string;
      toDate: string;
      fundType?: "general" | "restricted" | "designated" | "all";
    };

    if (!churchId || !fromDate || !toDate) {
      return NextResponse.json(
        { error: "churchId, fromDate and toDate are required" },
        { status: 400 }
      );
    }

    console.log("Fetching donor statements:", { churchId, fromDate, toDate, fundType });
    console.log("Convex URL:", process.env.NEXT_PUBLIC_CONVEX_URL);

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
    }

    const statements = await convexServerClient.query(
      api.reports.getDonorStatementBatch,
      { 
        churchId: churchId as Id<"churches">, 
        fromDate, 
        toDate,
        fundType: fundType || "all"
      }
    );

    console.log(`Found ${statements?.length || 0} donor statements`);

    if (!statements || statements.length === 0) {
      return NextResponse.json(
        { error: "No donor statements found for the selected period and fund type" },
        { status: 404 }
      );
    }

    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fundTypeLabel = fundType === "general" ? "Tithes" 
      : fundType === "restricted" ? "Building Fund" 
      : fundType === "designated" ? "Designated Funds"
      : "All Donations";

    let logoImage: PDFImage | undefined;
    if (fundTypeLabel === "Building Fund") {
      try {
        const logoPath = `${process.cwd()}/public/legacy logo.jpg`;
        const logoBytes = await readFile(logoPath);
        logoImage = await pdfDoc.embedJpg(logoBytes);
      } catch (error) {
        console.warn("Failed to load building fund logo", error);
      }
    }

    for (const statement of statements) {
      const statementPayload = statement as DonorStatement;

      if (fundTypeLabel === "Building Fund") {
        renderBuildingFundStatement({
          pdfDoc,
          fonts: { regular: helvetica, bold: helveticaBold },
          statement: statementPayload,
          fromDate,
          toDate,
          logo: logoImage,
        });
        continue;
      }

      const page = pdfDoc.addPage(pageSize);
      const { width, height } = page.getSize();
      const margin = 50;
      let yPosition = height - margin;

      const donor = statementPayload.donor;

      page.drawText(`${fundTypeLabel} Statement`, {
        x: width / 2 - 100,
        y: yPosition,
        size: 20,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });

      yPosition -= 30;
      page.drawText(donor.name, {
        x: width / 2 - 80,
        y: yPosition,
        size: 16,
        font: helvetica,
        color: rgb(0, 0, 0),
      });

      yPosition -= 40;
      page.drawText(`Period: ${fromDate} to ${toDate}`, {
        x: margin,
        y: yPosition,
        size: 12,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });

      if (donor.address) {
        yPosition -= 20;
        page.drawText(donor.address.substring(0, 80), {
          x: margin,
          y: yPosition,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      yPosition -= 40;
      page.drawText(`Total ${fundTypeLabel}: ${currency.format(statementPayload.total)}`, {
        x: margin,
        y: yPosition,
        size: 14,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });

      yPosition -= 30;
      page.drawText("Transactions", {
        x: margin,
        y: yPosition,
        size: 14,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });

      yPosition -= 5;
      page.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });

      yPosition -= 25;

      if (statementPayload.transactions.length === 0) {
        page.drawText("No transactions recorded in this period.", {
          x: margin,
          y: yPosition,
          size: 11,
          font: helvetica,
          color: rgb(0.5, 0.5, 0.5),
        });
      } else {
        for (const txn of statementPayload.transactions) {
          if (yPosition < margin + 80) {
            break;
          }

          page.drawText(`${txn.date} - ${txn.description.substring(0, 50)}`, {
            x: margin,
            y: yPosition,
            size: 11,
            font: helvetica,
            color: rgb(0, 0, 0),
          });

          yPosition -= 15;
          const details = `${txn.fundName ?? "Unknown"} · ${currency.format(txn.amount)} · Gift Aid: ${
            txn.giftAid ? "Yes" : "No"
          }`;
          page.drawText(details, {
            x: margin + 10,
            y: yPosition,
            size: 9,
            font: helvetica,
            color: rgb(0.4, 0.4, 0.4),
          });

          yPosition -= 20;
        }
      }

      if (donor.giftAidDeclaration?.signed) {
        yPosition -= 30;
        if (yPosition > margin + 40) {
          page.drawText("Gift Aid Declaration: Valid", {
            x: margin,
            y: margin + 20,
            size: 9,
            font: helvetica,
            color: rgb(0, 0.5, 0),
          });
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    console.log(`Generated PDF: ${pdfBytes.length} bytes`);
  
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="donor-statements-${fromDate}-${toDate}.pdf"`,
        "Content-Length": pdfBytes.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating donor statements:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });
    
    return NextResponse.json(
      { 
        error: "Failed to generate donor statements",
        details: errorMessage,
        type: error instanceof Error ? error.constructor.name : typeof error,
      },
      { status: 500 }
    );
  }
}
