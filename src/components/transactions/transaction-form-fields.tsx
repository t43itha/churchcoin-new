"use client";

import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { TransactionFormValues } from "@/lib/validators";
import { formatCurrency } from "@/lib/formats";
import type { Doc } from "@/lib/convexGenerated";

// =============================================================================
// CONSTANTS
// =============================================================================

const methodOptions = [
  { value: "", label: "No method" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "bank-transfer", label: "Bank transfer" },
  { value: "card", label: "Card reader" },
  { value: "online", label: "Online" },
];

// =============================================================================
// SHARED STYLES
// =============================================================================

const selectClassName =
  "h-9 w-full rounded-md border border-ledger bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid";

// =============================================================================
// RESTRICTED EDIT VIEW (Read-only summary)
// =============================================================================

interface RestrictedEditViewProps {
  form: UseFormReturn<TransactionFormValues>;
  defaultValues?: Partial<TransactionFormValues>;
}

export function RestrictedEditView({ form, defaultValues }: RestrictedEditViewProps) {
  const { watch } = form;

  return (
    <div className="space-y-4 rounded-lg border border-ledger bg-highlight/30 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="text-xs text-grey-mid">Date</span>
          <p className="font-medium text-ink">{defaultValues?.date || watch("date")}</p>
        </div>
        <div>
          <span className="text-xs text-grey-mid">Type</span>
          <p className="font-medium text-ink capitalize">
            {defaultValues?.type || watch("type")}
          </p>
        </div>
      </div>

      <div>
        <span className="text-xs text-grey-mid">Description</span>
        <p className="font-medium text-ink">
          {defaultValues?.description || watch("description")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="text-xs text-grey-mid">Amount</span>
          <p
            className={`font-medium font-mono ${
              (defaultValues?.type || watch("type")) === "income"
                ? "text-success"
                : "text-error"
            }`}
          >
            {(defaultValues?.type || watch("type")) === "expense" ? "-" : ""}
            {formatCurrency(defaultValues?.amount || watch("amount") || 0)}
          </p>
        </div>
        {(defaultValues?.method || watch("method")) ? (
          <div>
            <span className="text-xs text-grey-mid">Method</span>
            <p className="text-ink">
              {(defaultValues?.method || watch("method") || "").toUpperCase()}
            </p>
          </div>
        ) : null}
      </div>

      {(defaultValues?.reference || watch("reference")) ? (
        <div>
          <span className="text-xs text-grey-mid">Reference</span>
          <p className="text-ink">{defaultValues?.reference || watch("reference")}</p>
        </div>
      ) : null}
    </div>
  );
}

// =============================================================================
// DATE & TYPE FIELDS
// =============================================================================

interface DateTypeFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
}

export function DateTypeFields({ form }: DateTypeFieldsProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink">Transaction date</label>
        <Input
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          className="font-primary"
          {...register("date")}
        />
        {errors.date ? (
          <p className="text-sm text-error">{errors.date.message}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink">Type</label>
        <select {...register("type")} className={selectClassName}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        {errors.type ? (
          <p className="text-sm text-error">{errors.type.message}</p>
        ) : null}
      </div>
    </div>
  );
}

// =============================================================================
// DESCRIPTION FIELD
// =============================================================================

interface DescriptionFieldProps {
  form: UseFormReturn<TransactionFormValues>;
}

export function DescriptionField({ form }: DescriptionFieldProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink">Description</label>
      <Input
        placeholder="e.g. Sunday service collection"
        className="font-primary"
        {...register("description")}
      />
      {errors.description ? (
        <p className="text-sm text-error">{errors.description.message}</p>
      ) : null}
    </div>
  );
}

// =============================================================================
// FUND & AMOUNT FIELDS
// =============================================================================

interface FundAmountFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
  funds: Doc<"funds">[];
  selectedFund: Doc<"funds"> | null;
  restrictedEdit?: boolean;
}

export function FundAmountFields({
  form,
  funds,
  selectedFund,
  restrictedEdit,
}: FundAmountFieldsProps) {
  const {
    register,
    formState: { errors },
  } = form;

  if (restrictedEdit) {
    // Only show fund select in restricted edit mode
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink">Fund</label>
        <select {...register("fundId")} className={selectClassName}>
          <option value="" disabled>
            Select fund
          </option>
          {funds.map((fund) => (
            <option key={fund._id} value={fund._id}>
              {fund.name}
            </option>
          ))}
        </select>
        {errors.fundId ? (
          <p className="text-sm text-error">{errors.fundId.message}</p>
        ) : null}
        <p className="text-xs text-grey-mid">
          Balance: {selectedFund ? formatCurrency(selectedFund.balance) : "—"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink">Fund</label>
        <select {...register("fundId")} className={selectClassName}>
          <option value="" disabled>
            Select fund
          </option>
          {funds.map((fund) => (
            <option key={fund._id} value={fund._id}>
              {fund.name}
            </option>
          ))}
        </select>
        {errors.fundId ? (
          <p className="text-sm text-error">{errors.fundId.message}</p>
        ) : null}
        <p className="text-xs text-grey-mid">
          Balance: {selectedFund ? formatCurrency(selectedFund.balance) : "—"}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink">Amount</label>
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          className="font-primary"
          {...register("amount")}
        />
        {errors.amount ? (
          <p className="text-sm text-error">{errors.amount.message}</p>
        ) : null}
        <p className="text-xs text-grey-mid">Always enter positive amounts.</p>
      </div>
    </div>
  );
}

// =============================================================================
// CATEGORY & DONOR FIELDS
// =============================================================================

interface CategoryDonorFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
  donors: Doc<"donors">[];
  expenseCategories: Doc<"categories">[];
  incomeCategories: Doc<"categories">[];
}

export function CategoryDonorFields({
  form,
  donors,
  expenseCategories,
  incomeCategories,
}: CategoryDonorFieldsProps) {
  const { register, watch } = form;
  const type = watch("type");

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink">Category</label>
        <select {...register("categoryId")} className={selectClassName}>
          <option value="">No category</option>
          {(type === "expense" ? expenseCategories : incomeCategories).map(
            (category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            )
          )}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink">Donor (optional)</label>
        <select {...register("donorId")} className={selectClassName}>
          <option value="">No donor</option>
          {donors.map((donor) => (
            <option key={donor._id} value={donor._id}>
              {donor.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// =============================================================================
// METHOD & REFERENCE FIELDS
// =============================================================================

interface MethodReferenceFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
}

export function MethodReferenceFields({ form }: MethodReferenceFieldsProps) {
  const { register } = form;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink">Method</label>
        <select {...register("method")} className={selectClassName}>
          {methodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink">Reference</label>
        <Input
          placeholder="e.g. HSBC REF 1234"
          className="font-primary"
          {...register("reference")}
        />
      </div>
    </div>
  );
}

// =============================================================================
// GIFT AID FIELD
// =============================================================================

interface GiftAidFieldProps {
  form: UseFormReturn<TransactionFormValues>;
}

export function GiftAidField({ form }: GiftAidFieldProps) {
  const { register, watch } = form;
  const type = watch("type");

  if (type !== "income") return null;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink">Gift Aid eligible?</label>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-ledger accent-ink"
          {...register("giftAid")}
        />
        Gift Aid declaration recorded for this donation
      </label>
    </div>
  );
}

// =============================================================================
// NOTES FIELD
// =============================================================================

interface NotesFieldProps {
  form: UseFormReturn<TransactionFormValues>;
}

export function NotesField({ form }: NotesFieldProps) {
  const { register } = form;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink">Notes (optional)</label>
      <textarea
        rows={4}
        className="w-full rounded-md border border-ledger bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-grey-mid"
        placeholder="Add any contextual details or split explanations"
        {...register("notes")}
      />
    </div>
  );
}

// =============================================================================
// RECEIPT FIELD
// =============================================================================

interface ReceiptFieldProps {
  form: UseFormReturn<TransactionFormValues>;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
  showHint?: boolean;
}

export function ReceiptField({
  form,
  onFileChange,
  onRemove,
  showHint = true,
}: ReceiptFieldProps) {
  const { watch } = form;
  const type = watch("type");
  const receiptFilename = watch("receiptFilename");

  if (type !== "expense") return null;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink">Receipt attachment</label>
      <Input
        type="file"
        accept="image/*,.pdf"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          onFileChange(file);
        }}
      />
      {receiptFilename ? (
        <div className="flex items-center gap-2 text-xs text-grey-mid">
          <Badge
            variant="secondary"
            className="border-ledger bg-highlight text-ink"
          >
            {receiptFilename}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-error"
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      ) : null}
      {showHint ? (
        <p className="text-xs text-grey-mid">
          Upload PDFs or images. Receipts live alongside the ledger entry for audits.
        </p>
      ) : null}
    </div>
  );
}

// =============================================================================
// ENTERED BY FIELD
// =============================================================================

interface EnteredByFieldProps {
  form: UseFormReturn<TransactionFormValues>;
}

export function EnteredByField({ form }: EnteredByFieldProps) {
  const { register } = form;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink">Entered by</label>
      <Input
        placeholder="e.g. Sarah Thompson"
        className="font-primary"
        {...register("enteredByName")}
      />
      <p className="text-xs text-grey-mid">
        Used to attribute manual entries when user accounts are unavailable.
      </p>
    </div>
  );
}
