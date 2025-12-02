"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Doc, Id } from "@/lib/convexGenerated";
import type { TransactionFormValues } from "@/lib/validators";
import { useTransactionForm } from "@/hooks/pages/use-transaction-form";
import {
  RestrictedEditView,
  DateTypeFields,
  DescriptionField,
  FundAmountFields,
  CategoryDonorFields,
  MethodReferenceFields,
  GiftAidField,
  NotesField,
  ReceiptField,
  EnteredByField,
} from "./transaction-form-fields";

// Re-export types for consumers
export type { TransactionFormValues } from "@/lib/validators";

type TransactionFormProps = {
  churchId: Id<"churches">;
  funds: Doc<"funds">[];
  categories: Doc<"categories">[];
  donors: Doc<"donors">[];
  defaultValues?: Partial<Omit<TransactionFormValues, "churchId">>;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onSubmitSuccess?: () => void;
  heading?: string;
  subheading?: string;
  submitLabel?: string;
  showReceiptHint?: boolean;
  restrictedEdit?: boolean;
};

/**
 * Transaction form component for manual entry of income/expenses.
 * Supports both full edit mode and restricted edit mode.
 */
export function TransactionForm({
  churchId,
  funds,
  categories,
  donors,
  defaultValues,
  onSubmit,
  onSubmitSuccess,
  heading = "Manual transaction entry",
  subheading = "Capture one-off income or expenses with full audit detail.",
  submitLabel = "Record transaction",
  showReceiptHint = true,
  restrictedEdit = false,
}: TransactionFormProps) {
  const {
    form,
    submitError,
    selectedFund,
    expenseCategories,
    incomeCategories,
    onSubmitHandler,
    handleReceiptChange,
    handleRemoveReceipt,
  } = useTransactionForm({
    churchId,
    funds,
    categories,
    defaultValues,
    onSubmit,
    onSubmitSuccess,
  });

  const { formState: { isSubmitting } } = form;

  return (
    <Card className="border-ledger bg-paper shadow-none">
      <CardHeader>
        <CardTitle className="text-ink">{heading}</CardTitle>
        <CardDescription className="text-grey-mid">{subheading}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmitHandler}>
          {/* Error display */}
          {submitError ? (
            <div className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
              {submitError}
            </div>
          ) : null}

          {/* Restricted edit mode: read-only summary */}
          {restrictedEdit ? (
            <RestrictedEditView form={form} defaultValues={defaultValues} />
          ) : null}

          {/* Full edit mode fields */}
          {!restrictedEdit ? (
            <>
              <DateTypeFields form={form} />
              <DescriptionField form={form} />
              <FundAmountFields
                form={form}
                funds={funds}
                selectedFund={selectedFund}
              />
            </>
          ) : null}

          {/* Fund select for restricted edit */}
          {restrictedEdit ? (
            <FundAmountFields
              form={form}
              funds={funds}
              selectedFund={selectedFund}
              restrictedEdit
            />
          ) : null}

          {/* Category & donor - always shown */}
          <CategoryDonorFields
            form={form}
            donors={donors}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
          />

          {/* Additional fields for full edit mode */}
          {!restrictedEdit ? (
            <>
              <MethodReferenceFields form={form} />
              <GiftAidField form={form} />
              <NotesField form={form} />
              <ReceiptField
                form={form}
                onFileChange={handleReceiptChange}
                onRemove={handleRemoveReceipt}
                showHint={showReceiptHint}
              />
              <EnteredByField form={form} />
            </>
          ) : null}

          {/* Submit button */}
          <div className="flex items-center justify-end gap-2 border-t border-ledger pt-4">
            <Button type="submit" className="font-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
