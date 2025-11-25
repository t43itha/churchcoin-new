import { readFile } from "node:fs/promises";
import { join } from "node:path";

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
import { api } from "@/lib/convexServerClient";
import { assertUserInChurch, requireSessionContext } from "@/lib/server-auth";

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

const tithePalette = {
  background: rgb(1, 1, 1),
  primary: rgb(0.2, 0.3, 0.5), // Slate Blue
  secondary: rgb(0.1, 0.15, 0.25), // Darker Slate
  accent: rgb(0.96, 0.97, 0.99), // Very light blue/gray
  text: rgb(0.15, 0.15, 0.18),
  muted: rgb(0.5, 0.5, 0.55),
};

type Palette = typeof buildingPalette;

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
  title: string;
  footerText: string;
  palette: Palette;
};

type BuildingTableContext = BuildingRenderContext & { page: PDFPage };

function formatDateForPdf(value?: string | number | null) {
  if (!value) {
    return "";
  }

  if (typeof value === "number") {
    const numericDate = new Date(value);
    if (!Number.isNaN(numericDate.getTime())) {
      const day = String(numericDate.getDate()).padStart(2, "0");
      const month = String(numericDate.getMonth() + 1).padStart(2, "0");
      return `${day}-${month}-${numericDate.getFullYear()}`;
    }
  }

  const text = String(value);
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${day}-${month}-${parsed.getFullYear()}`;
  }

  const delimiterMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (delimiterMatch) {
    const [, year, month, day] = delimiterMatch;
    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
  }

  const reversedMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (reversedMatch) {
    const [, day, month, year] = reversedMatch;
    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
  }

  return text;
}

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
  title: string,
  footerText: string,
  palette: Palette,
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
    color: palette.background,
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
    color: palette.primary,
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

  page.drawText(title, {
    x: titleX,
    y: height - margin + 12,
    size: 24,
    font: fonts.bold,
    color: palette.secondary,
  });

  page.drawText(statement.donor.name, {
    x: titleX,
    y: height - margin - 14,
    size: 12,
    font: fonts.regular,
    color: palette.secondary,
  });

  const formattedFrom = formatDateForPdf(fromDate);
  const formattedTo = formatDateForPdf(toDate);

  page.drawText(`Period: ${formattedFrom} – ${formattedTo}`, {
    x: titleX,
    y: height - margin - 32,
    size: 11,
    font: fonts.regular,
    color: palette.muted,
  });

  page.drawText(`Page ${pageNumber}`, {
    x:
      width -
      margin -
      fonts.regular.widthOfTextAtSize(`Page ${pageNumber}`, 10),
    y: height - margin - 32,
    size: 10,
    font: fonts.regular,
    color: palette.muted,
  });

  if (continued) {
    page.drawText("Statement Continuation", {
      x: titleX,
      y: height - margin - 48,
      size: 11,
      font: fonts.regular,
      color: palette.secondary,
    });
  }

  page.drawLine({
    start: { x: margin, y: margin + 24 },
    end: { x: width - margin, y: margin + 24 },
    thickness: 1,
    color: palette.primary,
  });

  page.drawText(footerText, {
    x: margin,
    y: margin + 10,
    size: 10,
    font: fonts.regular,
    color: palette.muted,
  });
}

function drawSummarySection(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  statement: DonorStatement,
  fromDate: string,
  toDate: string,
  palette: Palette,
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
    color: palette.accent,
    borderColor: palette.primary,
    borderWidth: 1.2,
  });

  page.drawText("Contribution Summary", {
    x: margin + 18,
    y: cardY + cardHeight - 26,
    size: 13,
    font: fonts.bold,
    color: palette.secondary,
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
        color: palette.muted,
      });

      page.drawText(item.value, {
        x,
        y: rowY,
        size: 14,
        font: fonts.bold,
        color: palette.secondary,
      });
    });
  });

  return cardY - 24;
}

function drawSectionHeading(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  title: string,
  palette: Palette,
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
    color: palette.secondary,
  });

  page.drawLine({
    start: { x: margin, y: headingY - 6 },
    end: { x: width - margin, y: headingY - 6 },
    thickness: 1,
    color: palette.primary,
  });

  return headingY - 20;
}

function drawDonorDetails(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  statement: DonorStatement,
  palette: Palette,
  startY: number
) {
  let y = drawSectionHeading(page, fonts, "Donor Details", palette, startY);
  const { width } = page.getSize();
  const margin = 56;
  const contentWidth = width - margin * 2;
  const fontSize = 10;

  page.drawText(statement.donor.name, {
    x: margin,
    y,
    size: fontSize,
    font: fonts.bold,
    color: palette.text,
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
        color: palette.text,
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
      color: palette.text,
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
    color: palette.muted,
  });

  return y - 24;
}

function drawTransactionsTable(
  context: BuildingTableContext,
  startY: number
) {
  const { pdfDoc, fonts, statement, palette } = context;
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
        context.title,
        context.footerText,
        context.palette,
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
      color: palette.secondary,
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
      color: palette.muted,
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

    page.drawText(formatDateForPdf(txn.date), {
      x: columnPositions.date,
      y: rowY + rowHeight - 16,
      size: 10,
      font: fonts.regular,
      color: palette.text,
    });

    let textY = rowY + rowHeight - 16;
    for (const line of descriptionLines) {
      page.drawText(line, {
        x: columnPositions.description,
        y: textY,
        size: 10,
        font: fonts.regular,
        color: palette.text,
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
      color: palette.secondary,
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
      color: palette.text,
    });

    y = rowY - 8;
  });
}

function renderBuildingFundStatement(
  context: BuildingRenderContext
) {
  const { pdfDoc, fonts, statement, fromDate, toDate, logo, title, footerText, palette } = context;
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
    title,
    footerText,
    palette,
    { continued: false }
  );

  let y = page.getSize().height - 136 - 40;
  y = drawSummarySection(page, fonts, statement, fromDate, toDate, palette, y);

  y = drawDonorDetails(page, fonts, statement, palette, y);

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

    const sessionResult = await requireSessionContext().catch((error: Error) => error);
    if (sessionResult instanceof Error) {
      const status = (sessionResult as { status?: number }).status ?? 500;
      return NextResponse.json({ error: sessionResult.message }, { status });
    }
    const { user, client } = sessionResult;

    const { churchId, fromDate, toDate, fundType, donorIds } = body as {
      churchId?: string;
      fromDate: string;
      toDate: string;
      fundType?: "general" | "restricted" | "designated" | "all";
      donorIds?: string[];
    };

    const resolvedChurchId = (churchId ?? user.churchId ?? null) as
      | Id<"churches">
      | null;

    if (!resolvedChurchId || !fromDate || !toDate) {
      return NextResponse.json(
        { error: "Church context, fromDate and toDate are required" },
        { status: 400 }
      );
    }

    if (donorIds && (!Array.isArray(donorIds) || donorIds.some((id) => typeof id !== "string"))) {
      return NextResponse.json(
        { error: "donorIds must be an array of strings" },
        { status: 400 }
      );
    }

    if (churchId) {
      assertUserInChurch(user, resolvedChurchId);
    }

    const donorIdList = donorIds?.length
      ? donorIds.map((id) => id as Id<"donors">)
      : undefined;

    const queryArgs: {
      churchId: Id<"churches">;
      fromDate: string;
      toDate: string;
      fundType?: "general" | "restricted" | "designated" | "all";
      donorIds?: Id<"donors">[];
    } = {
      churchId: resolvedChurchId,
      fromDate,
      toDate,
      fundType: fundType || "all",
    };

    if (donorIdList) {
      queryArgs.donorIds = donorIdList;
    }

    const statements = await client.query(api.reports.getDonorStatementBatch, queryArgs);

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
    const publicDir = process.env.VERCEL
      ? join(process.cwd(), "public")
      : join(process.cwd(), "public");

    if (fundTypeLabel === "Building Fund") {
      const logoFiles = [
        "legacy logo.jpg",
        "legacy-logo.jpg",
        "legacy_logo.jpg",
        "legacy-logo.png",
        "legacy_logo.png",
        "legacy-logo.jpeg",
      ];

      for (const fileName of logoFiles) {
        if (logoImage) break;
        try {
          const logoPath = join(publicDir, fileName);
          const logoBytes = await readFile(logoPath);
          try {
            logoImage = await pdfDoc.embedJpg(logoBytes);
          } catch {
            try {
              logoImage = await pdfDoc.embedPng(logoBytes);
            } catch {
              logoImage = undefined;
            }
          }
        } catch {
          // try next file name
        }
      }
    } else {
      // Try loading the tithe logo for other statement types
      try {
        const logoPath = join(publicDir, "tithe_logo.png");
        const logoBytes = await readFile(logoPath);
        try {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } catch {
          try {
            logoImage = await pdfDoc.embedJpg(logoBytes);
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }

    for (const statement of statements) {
      const statementPayload = statement as DonorStatement;

      const title = fundTypeLabel === "Building Fund" ? "Building Fund Statement" : `${fundTypeLabel} Statement`;
      const footerText = fundTypeLabel === "Building Fund"
        ? "Thank you for investing in the Legacy Building Project vision."
        : "Thank you for your faithful giving.";

      const palette = fundTypeLabel === "Building Fund" ? buildingPalette : tithePalette;

      renderBuildingFundStatement({
        pdfDoc,
        fonts: { regular: helvetica, bold: helveticaBold },
        statement: statementPayload,
        fromDate,
        toDate,
        logo: logoImage,
        title,
        footerText,
        palette
      });
    }

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="donor-statements-${fromDate}-${toDate}.pdf"`,
        "Content-Length": pdfBytes.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating donor statements:", error);

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

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to generate donor statements",
        details: errorMessage,
      },
      { status }
    );
  }
}
