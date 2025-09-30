import Papa from "papaparse";

export type ParsedCsvRow = Record<string, string>;

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
