import Papa from "papaparse";

export type ParsedCsvRow = Record<string, string>;

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const monthNames = new Map(
  [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ].map((name, index) => [name, index + 1])
);

const pad = (value: number) => value.toString().padStart(2, "0");

const isLeapYear = (year: number) => {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
};

const daysInMonth = (month: number, year: number) => {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
};

const formatDateParts = (year: number, month: number, day: number) =>
  `${pad(day)}/${pad(month)}/${year.toString().padStart(4, "0")}`;

const isValidDateParts = (year: number, month: number, day: number) => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (year < 1000 || month < 1 || month > 12 || day < 1) {
    return false;
  }
  return day <= daysInMonth(month, year);
};

const fromExcelSerial = (value: number) => {
  if (!Number.isFinite(value)) {
    return null;
  }

  const serial = Math.floor(value);
  if (serial <= 0) {
    return null;
  }

  const adjustedSerial = serial > 59 ? serial - 1 : serial;
  const milliseconds = EXCEL_EPOCH + adjustedSerial * MS_IN_DAY;
  const date = new Date(milliseconds);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

const parseNumericDateParts = (raw: string) => {
  const isoMatch = raw.match(/^([0-9]{4})[-/.]([0-9]{1,2})[-/.]([0-9]{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (isValidDateParts(year, month, day)) {
      return { year, month, day };
    }
  }

  const ukMatch = raw.match(/^([0-9]{1,2})[-/.]([0-9]{1,2})[-/.]([0-9]{2,4})$/);
  if (ukMatch) {
    const day = Number(ukMatch[1]);
    const month = Number(ukMatch[2]);
    let year = Number(ukMatch[3]);

    if (year < 100) {
      year = year + (year >= 50 ? 1900 : 2000);
    }

    if (isValidDateParts(year, month, day)) {
      return { year, month, day };
    }
  }

  return null;
};

const parseTextualDate = (raw: string) => {
  const match = raw.match(/^([0-9]{1,2})\s+([A-Za-z]{3,})\s+([0-9]{2,4})$/);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const monthName = match[2].slice(0, 3).toLowerCase();
  let year = Number(match[3]);

  if (year < 100) {
    year = year + (year >= 50 ? 1900 : 2000);
  }

  const month = monthNames.get(monthName);
  if (!month) {
    return null;
  }

  if (isValidDateParts(year, month, day)) {
    return { year, month, day };
  }

  return null;
};

export const normalizeCsvDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate()
    );
  }

  if (typeof value === "number") {
    const parts = fromExcelSerial(value);
    if (parts) {
      return formatDateParts(parts.year, parts.month, parts.day);
    }
  }

  const raw = String(value ?? "").trim();
  if (raw.length === 0) {
    return "";
  }

  if (/^[0-9]+$/.test(raw)) {
    const numericParts = fromExcelSerial(Number(raw));
    if (numericParts) {
      return formatDateParts(numericParts.year, numericParts.month, numericParts.day);
    }
  }

  const numericParts = parseNumericDateParts(raw);
  if (numericParts) {
    return formatDateParts(numericParts.year, numericParts.month, numericParts.day);
  }

  const textualParts = parseTextualDate(raw);
  if (textualParts) {
    return formatDateParts(textualParts.year, textualParts.month, textualParts.day);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateParts(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth() + 1,
      parsed.getUTCDate()
    );
  }

  return raw;
};

export function detectBankFormat(headers: string[]): "barclays" | "hsbc" | "metrobank" | "generic" {
  const lowered = headers.map((header) => header.toLowerCase());
  if (lowered.includes("type") && lowered.includes("balance")) {
    return "barclays";
  }
  if (lowered.includes("transaction type") && lowered.includes("account name")) {
    return "hsbc";
  }
  if (lowered.includes("in") && lowered.includes("out") && lowered.includes("details")) {
    return "metrobank";
  }
  return "generic";
}

export function parseCsv(content: string) {
  return Papa.parse<ParsedCsvRow>(content, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
}

export function deriveMapping(
  headers: string[]
): {
  date: string;
  description: string;
  amount: string;
  amountIn?: string;
  amountOut?: string;
  reference?: string;
  type?: string;
} {
  const lower = headers.map((header) => header.toLowerCase());
  const findHeader = (candidates: string[], fallback: string) => {
    for (const candidate of candidates) {
      const index = lower.indexOf(candidate);
      if (index !== -1) {
        return headers[index];
      }
    }
    return fallback;
  };

  // Check if this is Metro Bank format (has separate In/Out columns)
  const hasInOut = lower.includes("in") && lower.includes("out");

  return {
    date: findHeader(["date", "transaction date"], headers[0] ?? "Date"),
    description: findHeader(["description", "narrative", "details"], headers[1] ?? "Description"),
    amount: hasInOut ? "" : findHeader(["amount", "credit", "debit"], headers[2] ?? "Amount"),
    amountIn: hasInOut ? headers[lower.indexOf("in")] : undefined,
    amountOut: hasInOut ? headers[lower.indexOf("out")] : undefined,
    reference: lower.includes("reference")
      ? headers[lower.indexOf("reference")]
      : undefined,
    type: lower.includes("type") || lower.includes("transaction type")
      ? headers[lower.indexOf("transaction type") !== -1 ? lower.indexOf("transaction type") : lower.indexOf("type")]
      : undefined,
  };
}
