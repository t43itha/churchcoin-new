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

  // Try ISO format as last resort (YYYY-MM-DD only)
  const isoOnlyMatch = raw.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
  if (isoOnlyMatch) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateParts(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth() + 1,
        parsed.getUTCDate()
      );
    }
  }

  // Return raw if unable to parse - don't use new Date() as it defaults to US format
  return raw;
};

export function detectBankFormat(headers: string[]): "barclays" | "hsbc" | "metrobank" | "generic" {
  const lowered = headers.map((header) => header.toLowerCase());

  const includesAny = (keywords: string[]) =>
    lowered.some((header) => keywords.some((keyword) => header.includes(keyword)));

  // Check Metro Bank first (most specific pattern)
  // Metro format: separate "In"/"Out" columns (or "Paid In"/"Paid Out")
  const hasPaidIn = includesAny(["paid in", "amount in", "in"]);
  const hasPaidOut = includesAny(["paid out", "amount out", "out"]);
  const hasDetails = includesAny(["details", "description"]);

  // Metro Bank has separate In/Out columns AND details/description
  if (hasPaidIn && hasPaidOut && hasDetails) {
    // Additional check: ensure we have actual separate In/Out columns, not just words containing "in"/"out"
    const inColumn = lowered.find(h => h === "in" || h === "paid in" || h === "amount in");
    const outColumn = lowered.find(h => h === "out" || h === "paid out" || h === "amount out");
    if (inColumn && outColumn) {
      return "metrobank";
    }
  }

  // HSBC has "Transaction Type" and "Account Name"
  if (includesAny(["transaction type"]) && includesAny(["account name"])) {
    return "hsbc";
  }

  // Barclays has single "Amount" column with "Type" and "Balance"
  // Must NOT have separate In/Out columns (to avoid matching Metro)
  const hasType = includesAny(["type"]);
  const hasBalance = includesAny(["balance"]);
  const hasSeparateInOut = hasPaidIn && hasPaidOut;

  if (hasType && hasBalance && !hasSeparateInOut) {
    return "barclays";
  }

  return "generic";
}

export function parseCsv(content: string) {
  return Papa.parse<ParsedCsvRow>(content, {
    header: true,
    dynamicTyping: false, // Disable automatic type conversion to preserve date strings
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

  const findIndex = (candidates: string[]) =>
    lower.findIndex((value) => candidates.some((candidate) => value.includes(candidate)));

  const getHeader = (candidates: string[], fallback?: string) => {
    const index = findIndex(candidates);
    if (index !== -1) {
      return headers[index];
    }
    return fallback;
  };

  const inIndex = findIndex(["paid in", "amount in", "credit", "in"]);
  const outIndex = findIndex(["paid out", "amount out", "debit", "out"]);
  const hasInOut = inIndex !== -1 && outIndex !== -1;

  return {
    date: getHeader(["date", "transaction date"], headers[0] ?? "Date")!,
    description: getHeader(["description", "narrative", "details"], headers[1] ?? "Description")!,
    amount: hasInOut ? "" : getHeader(["amount", "credit", "debit"], headers[2] ?? "Amount")!,
    amountIn: hasInOut ? headers[inIndex] : undefined,
    amountOut: hasInOut ? headers[outIndex] : undefined,
    reference: getHeader(["reference", "bank reference", "transaction reference", "ref"], undefined),
    type: getHeader(["transaction type", "type"], undefined),
  };
}

export function deriveDonorMapping(headers: string[]): {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  bankReference?: string;
  giftAidSigned?: string;
  giftAidDate?: string;
  notes?: string;
} {
  const lower = headers.map((header) => header.toLowerCase());
  const findHeader = (candidates: string[]) => {
    for (const candidate of candidates) {
      const index = lower.indexOf(candidate);
      if (index !== -1) {
        return headers[index];
      }
    }
    return undefined;
  };

  return {
    name: findHeader(["name", "donor name", "full name", "donor"]) ?? headers[0] ?? "Name",
    email: findHeader(["email", "e-mail", "email address"]),
    phone: findHeader(["phone", "telephone", "mobile", "phone number"]),
    address: findHeader(["address", "postal address", "home address"]),
    bankReference: findHeader(["bank reference", "reference", "bank ref", "ref"]),
    giftAidSigned: findHeader(["gift aid", "giftaid", "gift aid signed", "ga signed"]),
    giftAidDate: findHeader(["gift aid date", "ga date", "declaration date"]),
    notes: findHeader(["notes", "comments", "remarks"]),
  };
}

export function derivePledgeMapping(headers: string[]): {
  donorName: string;
  donorEmail?: string;
  amount: string;
  pledgedDate: string;
  dueDate?: string;
  notes?: string;
} {
  const lower = headers.map((header) => header.toLowerCase());
  const findHeader = (candidates: string[]) => {
    for (const candidate of candidates) {
      const index = lower.indexOf(candidate);
      if (index !== -1) {
        return headers[index];
      }
    }
    return undefined;
  };

  return {
    donorName: findHeader(["donor name", "name", "donor", "supporter", "member name"]) ?? headers[0] ?? "Donor Name",
    donorEmail: findHeader(["donor email", "email", "e-mail", "email address"]),
    amount: findHeader(["amount", "pledged", "pledge amount", "commitment", "total"]) ?? headers[1] ?? "Amount",
    pledgedDate: findHeader(["pledged date", "date", "pledge date", "commitment date", "date pledged"]) ?? headers[2] ?? "Pledged Date",
    dueDate: findHeader(["due date", "deadline", "target date", "expiry", "due"]),
    notes: findHeader(["notes", "comments", "remarks", "description", "memo"]),
  };
}
