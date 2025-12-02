"use client";

import { useMemo } from "react";
import type { Doc } from "@/lib/convexGenerated";
import { cn } from "@/lib/utils";

interface CategorySelectProps {
  /** Array of category documents to display */
  categories: Doc<"categories">[];
  /** Currently selected category ID */
  value: string;
  /** Callback when selection changes */
  onChange: (categoryId: string) => void;
  /** Filter categories by type (income or expense) */
  type?: "income" | "expense";
  /** Label for the select field */
  label?: string;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Whether to allow no category selection */
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
 * Reusable category selection dropdown with optional type filtering
 *
 * @example
 * ```tsx
 * <CategorySelect
 *   categories={categories}
 *   value={selectedCategoryId}
 *   onChange={(id) => setSelectedCategoryId(id)}
 *   type="income"
 *   allowEmpty
 * />
 * ```
 */
export function CategorySelect({
  categories,
  value,
  onChange,
  type,
  label = "Category",
  placeholder = "Select category",
  allowEmpty = true,
  emptyLabel = "No category",
  error,
  disabled = false,
  className,
  name,
}: CategorySelectProps) {
  const filteredCategories = useMemo(() => {
    if (!type) return categories;
    return categories.filter((category) => category.type === type);
  }, [categories, type]);

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
        {filteredCategories.map((category) => (
          <option key={category._id} value={category._id}>
            {category.name}
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
interface CategorySelectRHFProps extends Omit<CategorySelectProps, "value" | "onChange"> {
  /** react-hook-form register function return value */
  register: {
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLSelectElement>) => void;
    name: string;
    ref: React.Ref<HTMLSelectElement>;
  };
}

/**
 * CategorySelect variant for react-hook-form integration
 *
 * @example
 * ```tsx
 * <CategorySelectRHF
 *   categories={categories}
 *   register={register("categoryId")}
 *   type={transactionType}
 *   error={errors.categoryId?.message}
 *   allowEmpty
 * />
 * ```
 */
export function CategorySelectRHF({
  categories,
  register,
  type,
  label = "Category",
  placeholder = "Select category",
  allowEmpty = true,
  emptyLabel = "No category",
  error,
  disabled = false,
  className,
}: CategorySelectRHFProps) {
  const filteredCategories = useMemo(() => {
    if (!type) return categories;
    return categories.filter((category) => category.type === type);
  }, [categories, type]);

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
        {filteredCategories.map((category) => (
          <option key={category._id} value={category._id}>
            {category.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
