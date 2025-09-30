const pad = (value: number) => value.toString().padStart(2, "0");

export type DateInput = string | number | Date | null | undefined;

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const numericFormatter = new Intl.DateTimeFormat("en-GB", DEFAULT_FORMAT);

const asDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const ukMatch = raw.match(/^([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-]([0-9]{2,4})$/);
  if (ukMatch) {
    const day = Number(ukMatch[1]);
    const month = Number(ukMatch[2]);
    let year = Number(ukMatch[3]);

    if (year < 100) {
      year = year + (year >= 50 ? 1900 : 2000);
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const isoMatch = raw.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
  if (isoMatch) {
    const date = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const parseDateInput = (value: DateInput) => {
  const parsed = asDate(value);
  return parsed ? new Date(parsed.getTime()) : null;
};

export const formatUkDate = (
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_FORMAT
) => {
  const date = parseDateInput(value);
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", options).format(date);
};

export const formatUkDateNumeric = (value: DateInput) => {
  const date = parseDateInput(value);
  if (!date) {
    return "";
  }

  const day = pad(date.getUTCDate());
  const month = pad(date.getUTCMonth() + 1);
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export const formatUkDateWithMonth = (value: DateInput) => {
  const date = parseDateInput(value);
  if (!date) {
    return "";
  }

  return numericFormatter.format(date);
};

export const formatUkDateTime = (
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  }
) => {
  const date = parseDateInput(value);
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", options).format(date);
};
