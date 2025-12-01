"use client";

import type { Doc } from "@/lib/convexGenerated";
import { cn } from "@/lib/utils";

interface DonorSelectProps {
  /** Array of donor documents to display */
  donors: Doc<"donors">[];
  /** Currently selected donor ID */
  value: string;
  /** Callback when selection changes */
  onChange: (donorId: string) => void;
  /** Label for the select field */
  label?: string;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Whether to allow no donor selection */
  allowEmpty?: boolean;
  /** Empty option label */
  emptyLabel?: string;
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
 * Reusable donor selection dropdown
 *
 * @example
 * ```tsx
 * <DonorSelect
 *   donors={donors}
 *   value={selectedDonorId}
 *   onChange={(id) => setSelectedDonorId(id)}
 *   allowEmpty
 * />
 * ```
 */
export function DonorSelect({
  donors,
  value,
  onChange,
  label = "Donor",
  placeholder = "Select donor",
  allowEmpty = true,
  emptyLabel = "No donor",
  error,
  disabled = false,
  className,
  name,
}: DonorSelectProps) {
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
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {!allowEmpty && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {donors.map((donor) => (
          <option key={donor._id} value={donor._id}>
            {donor.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}

/**
 * Props for react-hook-form integration
 */
interface DonorSelectRHFProps extends Omit<DonorSelectProps, "value" | "onChange"> {
  /** react-hook-form register function return value */
  register: {
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLSelectElement>) => void;
    name: string;
    ref: React.Ref<HTMLSelectElement>;
  };
}

/**
 * DonorSelect variant for react-hook-form integration
 *
 * @example
 * ```tsx
 * <DonorSelectRHF
 *   donors={donors}
 *   register={register("donorId")}
 *   error={errors.donorId?.message}
 *   allowEmpty
 *   label="Donor (optional)"
 * />
 * ```
 */
export function DonorSelectRHF({
  donors,
  register,
  label = "Donor",
  placeholder = "Select donor",
  allowEmpty = true,
  emptyLabel = "No donor",
  error,
  disabled = false,
  className,
}: DonorSelectRHFProps) {
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
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {!allowEmpty && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {donors.map((donor) => (
          <option key={donor._id} value={donor._id}>
            {donor.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
