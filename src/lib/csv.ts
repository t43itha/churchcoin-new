import Papa from "papaparse";

export type ParsedCsvRow = Record<string, string>;

export function detectBankFormat(headers: string[]): "barclays" | "hsbc" | "generic" {
  const lowered = headers.map((header) => header.toLowerCase());
  if (lowered.includes("type") && lowered.includes("balance")) {
    return "barclays";
  }
  if (lowered.includes("transaction type") && lowered.includes("account name")) {
    return "hsbc";
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

  return {
    date: findHeader(["date", "transaction date"], headers[0] ?? "Date"),
    description: findHeader(["description", "narrative", "details"], headers[1] ?? "Description"),
    amount: findHeader(["amount", "credit", "debit"], headers[2] ?? "Amount"),
    reference: lower.includes("reference")
      ? headers[lower.indexOf("reference")]
      : undefined,
    type: lower.includes("type") ? headers[lower.indexOf("type")] : undefined,
  };
}
