"use client";

import { useMemo } from "react";
import type { Doc } from "@/lib/convexGenerated";
import { cn } from "@/lib/utils";

interface FundSelectProps {
  /** Array of fund documents to display */
  funds: Doc<"funds">[];
  /** Currently selected fund ID */
  value: string;
  /** Callback when selection changes */
  onChange: (fundId: string) => void;
  /** Label for the select field */
  label?: string;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Whether to show the fund balance */
  showBalance?: boolean;
  /** Error message to display */
  error?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Optional name for form registration */
  name?: string;
}

/**
 * Reusable fund selection dropdown with optional balance display
 *
 * @example
 * ```tsx
 * <FundSelect
 *   funds={funds}
 *   value={selectedFundId}
 *   onChange={(id) => setSelectedFundId(id)}
 *   showBalance
 * />
 * ```
 */
export function FundSelect({
  funds,
  value,
  onChange,
  label = "Fund",
  placeholder = "Select fund",
  showBalance = true,
  error,
  disabled = false,
  className,
  name,
}: FundSelectProps) {
  const selectedFund = useMemo(() => {
    return funds.find((fund) => fund._id === value) ?? null;
  }, [funds, value]);

  const formatCurrency = useMemo(() => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
    });
  }, []);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label className="text-sm font-medium text-ink">{label}</label>
      )}
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink",
          "focus:outline-none focus:ring-2 focus:ring-grey-mid",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-error"
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {funds.map((fund) => (
          <option key={fund._id} value={fund._id}>
            {fund.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-error">{error}</p>}
      {showBalance && (
        <p className="text-xs text-grey-mid">
          Balance: {selectedFund ? formatCurrency.format(selectedFund.balance) : "—"}
        </p>
      )}
    </div>
  );
}

/**
 * Props for react-hook-form integration
 */
interface FundSelectRHFProps extends Omit<FundSelectProps, "value" | "onChange"> {
  /** react-hook-form register function return value */
  register: {
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLSelectElement>) => void;
    name: string;
    ref: React.Ref<HTMLSelectElement>;
  };
  /** Currently watched value from react-hook-form */
  watchValue: string;
}

/**
 * FundSelect variant for react-hook-form integration
 *
 * @example
 * ```tsx
 * <FundSelectRHF
 *   funds={funds}
 *   register={register("fundId")}
 *   watchValue={watch("fundId")}
 *   error={errors.fundId?.message}
 *   showBalance
 * />
 * ```
 */
export function FundSelectRHF({
  funds,
  register,
  watchValue,
  label = "Fund",
  placeholder = "Select fund",
  showBalance = true,
  error,
  disabled = false,
  className,
}: FundSelectRHFProps) {
  const selectedFund = useMemo(() => {
    return funds.find((fund) => fund._id === watchValue) ?? null;
  }, [funds, watchValue]);

  const formatCurrency = useMemo(() => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
    });
  }, []);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label className="text-sm font-medium text-ink">{label}</label>
      )}
      <select
        {...register}
        disabled={disabled}
        className={cn(
          "h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink",
          "focus:outline-none focus:ring-2 focus:ring-grey-mid",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-error"
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {funds.map((fund) => (
          <option key={fund._id} value={fund._id}>
            {fund.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-error">{error}</p>}
      {showBalance && (
        <p className="text-xs text-grey-mid">
          Balance: {selectedFund ? formatCurrency.format(selectedFund.balance) : "—"}
        </p>
      )}
    </div>
  );
}
