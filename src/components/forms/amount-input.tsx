"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AmountInputProps {
  /** Current value */
  value: number | string;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Label for the input field */
  label?: string;
  /** Currency symbol to display */
  currency?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Helper text shown below the input */
  helperText?: string;
  /** Error message to display */
  error?: string;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Decimal precision step */
  step?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Optional name for form registration */
  name?: string;
}

/**
 * Reusable currency amount input with formatting
 *
 * @example
 * ```tsx
 * <AmountInput
 *   value={amount}
 *   onChange={(value) => setAmount(value)}
 *   label="Amount"
 *   helperText="Always enter positive amounts."
 * />
 * ```
 */
export function AmountInput({
  value,
  onChange,
  label = "Amount",
  currency = "£",
  placeholder = "0.00",
  helperText,
  error,
  min = 0,
  max,
  step = "0.01",
  disabled = false,
  className,
  name,
}: AmountInputProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label className="text-sm font-medium text-ink">{label}</label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-mid font-primary">
          {currency}
        </span>
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          disabled={disabled}
          name={name}
          className={cn(
            "pl-7 font-primary",
            error && "border-error"
          )}
        />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-grey-mid">{helperText}</p>
      )}
    </div>
  );
}

/**
 * Props for react-hook-form integration
 */
interface AmountInputRHFProps extends Omit<AmountInputProps, "value" | "onChange"> {
  /** react-hook-form register function return value */
  register: {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    name: string;
    ref: React.Ref<HTMLInputElement>;
  };
}

/**
 * AmountInput variant for react-hook-form integration
 *
 * @example
 * ```tsx
 * <AmountInputRHF
 *   register={register("amount")}
 *   error={errors.amount?.message}
 *   helperText="Always enter positive amounts."
 * />
 * ```
 */
export function AmountInputRHF({
  register,
  label = "Amount",
  currency = "£",
  placeholder = "0.00",
  helperText,
  error,
  min = 0,
  max,
  step = "0.01",
  disabled = false,
  className,
}: AmountInputRHFProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label className="text-sm font-medium text-ink">{label}</label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-mid font-primary">
          {currency}
        </span>
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          disabled={disabled}
          {...register}
          className={cn(
            "pl-7 font-primary",
            error && "border-error"
          )}
        />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-grey-mid">{helperText}</p>
      )}
    </div>
  );
}
