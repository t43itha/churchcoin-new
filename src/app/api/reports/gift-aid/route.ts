import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { api } from "@/lib/convexGenerated";
import { fetchQuery } from "convex/nextjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { churchId, startDate, endDate } = body;

    if (!churchId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const report = await fetchQuery(api.reports.getGiftAidClaimReport, {
      churchId,
      startDate,
      endDate,
    });

    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const margin = 50;
    let yPosition = height - margin;

    page.drawText("Gift Aid Claim Report", {
      x: margin,
      y: yPosition,
      size: 20,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });

    yPosition -= 30;
    page.drawText(`Period: ${startDate} to ${endDate}`, {
      x: margin,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    yPosition -= 40;
    page.drawText("Summary", {
      x: margin,
      y: yPosition,
      size: 14,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });

    yPosition -= 25;
    const currency = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    });

    const summaryLines = [
      `Total Claimable Donations: ${currency.format(report.claimableAmount)}`,
      `Gift Aid Value (25%): ${currency.format(report.giftAidValue)}`,
      `Number of Transactions: ${report.transactionCount}`,
      `Number of Donors: ${report.donorBreakdown.length}`,
    ];

    for (const line of summaryLines) {
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: 11,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
    }

    yPosition -= 20;
    page.drawText("Donor Breakdown", {
      x: margin,
      y: yPosition,
      size: 14,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });

    yPosition -= 30;
    page.drawText("Donor Name", {
      x: margin,
      y: yPosition,
      size: 10,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });
    page.drawText("Donations", {
      x: margin + 200,
      y: yPosition,
      size: 10,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });
    page.drawText("Gift Aid", {
      x: margin + 300,
      y: yPosition,
      size: 10,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });
    page.drawText("Declaration", {
      x: margin + 400,
      y: yPosition,
      size: 10,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });

    yPosition -= 5;
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    yPosition -= 20;

    for (const donor of report.donorBreakdown) {
      if (yPosition < margin + 50) {
        pdfDoc.addPage([595, 842]);
        yPosition = height - margin;
      }

      page.drawText(donor.donorName.substring(0, 30), {
        x: margin,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });

      page.drawText(currency.format(donor.donationTotal), {
        x: margin + 200,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });

      page.drawText(currency.format(donor.giftAidAmount), {
        x: margin + 300,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: donor.hasDeclaration ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0),
      });

      page.drawText(donor.hasDeclaration ? "Yes" : "No", {
        x: margin + 400,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: donor.hasDeclaration ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0),
      });

      yPosition -= 20;
    }

    yPosition -= 30;
    if (yPosition < margin + 50) {
      pdfDoc.addPage([595, 842]);
      yPosition = height - margin;
    }

    page.drawText(
      "Note: Only donations from donors with valid Gift Aid declarations are eligible for HMRC claims.",
      {
        x: margin,
        y: yPosition,
        size: 9,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
        maxWidth: width - 2 * margin,
      }
    );

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="gift-aid-${startDate}-${endDate}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating Gift Aid report:", error);
    return NextResponse.json(
      { error: "Failed to generate Gift Aid report" },
      { status: 500 }
    );
  }
}
