"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn, type Resolver } from "react-hook-form";

import { transactionSchema, type TransactionFormValues } from "@/lib/validators";
import type { Doc, Id } from "@/lib/convexGenerated";

export interface UseTransactionFormOptions {
  churchId: Id<"churches">;
  funds: Doc<"funds">[];
  categories: Doc<"categories">[];
  defaultValues?: Partial<Omit<TransactionFormValues, "churchId">>;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onSubmitSuccess?: () => void;
}

export interface UseTransactionFormReturn {
  form: UseFormReturn<TransactionFormValues>;
  submitError: string | null;
  receiptFile: File | null;
  setReceiptFile: (file: File | null) => void;
  selectedFund: Doc<"funds"> | null;
  expenseCategories: Doc<"categories">[];
  incomeCategories: Doc<"categories">[];
  onSubmitHandler: (e?: React.BaseSyntheticEvent) => Promise<void>;
  handleReceiptChange: (file: File | null) => void;
  handleRemoveReceipt: () => void;
}

/**
 * Encapsulates all transaction form logic including:
 * - Form state management with react-hook-form
 * - Receipt file upload handling
 * - Category filtering by type
 * - Form submission with sanitization
 */
export function useTransactionForm({
  churchId,
  funds,
  categories,
  defaultValues,
  onSubmit,
  onSubmitSuccess,
}: UseTransactionFormOptions): UseTransactionFormReturn {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Request upload URL for receipt
  const requestUploadUrl = useCallback(async () => {
    const response = await fetch("/api/files/receipts/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ churchId }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { uploadUrl?: string; error?: string }
      | null;

    if (!response.ok || !payload?.uploadUrl) {
      throw new Error(payload?.error ?? "Failed to generate upload URL");
    }

    return payload.uploadUrl;
  }, [churchId]);

  // Initialize form
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as Resolver<TransactionFormValues>,
    defaultValues: {
      churchId,
      date: new Date().toISOString().slice(0, 10),
      type: "income",
      description: "",
      amount: 0,
      fundId: funds[0]?._id ?? "",
      categoryId: "",
      donorId: "",
      method: "cash",
      reference: "",
      giftAid: false,
      notes: "",
      enteredByName: "",
      receiptStorageId: defaultValues?.receiptStorageId,
      receiptFilename: defaultValues?.receiptFilename,
      ...defaultValues,
    },
  });

  // Reset form when churchId or defaultValues change
  useEffect(() => {
    form.reset({
      churchId,
      date: defaultValues?.date ?? new Date().toISOString().slice(0, 10),
      type: defaultValues?.type ?? "income",
      description: defaultValues?.description ?? "",
      amount: defaultValues?.amount ?? 0,
      fundId: defaultValues?.fundId ?? (funds[0]?._id ?? ""),
      categoryId: defaultValues?.categoryId ?? "",
      donorId: defaultValues?.donorId ?? "",
      method: defaultValues?.method ?? "cash",
      reference: defaultValues?.reference ?? "",
      giftAid: defaultValues?.giftAid ?? false,
      notes: defaultValues?.notes ?? "",
      enteredByName: defaultValues?.enteredByName ?? "",
      receiptStorageId: defaultValues?.receiptStorageId,
      receiptFilename: defaultValues?.receiptFilename,
    });
  }, [churchId, defaultValues, form, funds]);

  const { handleSubmit, watch, reset, setValue } = form;

  const selectedFundId = watch("fundId");

  // Memoized selected fund
  const selectedFund = useMemo(() => {
    return funds.find((fund) => fund._id === selectedFundId) ?? null;
  }, [funds, selectedFundId]);

  // Filtered categories by type
  const expenseCategories = useMemo(() => {
    return categories.filter((category) => category.type === "expense");
  }, [categories]);

  const incomeCategories = useMemo(() => {
    return categories.filter((category) => category.type === "income");
  }, [categories]);

  // Handle receipt file change
  const handleReceiptChange = useCallback(
    (file: File | null) => {
      setReceiptFile(file);
      if (file) {
        setValue("receiptFilename", file.name);
        setValue("receiptStorageId", undefined);
      } else {
        setValue("receiptFilename", undefined);
        setValue("receiptStorageId", undefined);
      }
    },
    [setValue]
  );

  // Remove receipt
  const handleRemoveReceipt = useCallback(() => {
    setReceiptFile(null);
    setValue("receiptFilename", undefined);
    setValue("receiptStorageId", undefined);
  }, [setValue]);

  // Submit handler with sanitization and receipt upload
  const onSubmitHandler = handleSubmit(async (values) => {
    setSubmitError(null);

    // Sanitize optional fields
    const sanitized: TransactionFormValues = {
      ...values,
      categoryId:
        values.categoryId && values.categoryId.length > 0
          ? values.categoryId
          : undefined,
      donorId:
        values.donorId && values.donorId.length > 0 ? values.donorId : undefined,
      method:
        values.method && values.method.length > 0 ? values.method : undefined,
      reference:
        values.reference && values.reference.trim().length > 0
          ? values.reference.trim()
          : undefined,
      notes:
        values.notes && values.notes.trim().length > 0
          ? values.notes.trim()
          : undefined,
      enteredByName:
        values.enteredByName && values.enteredByName.trim().length > 0
          ? values.enteredByName.trim()
          : undefined,
      receiptStorageId: values.receiptStorageId,
      receiptFilename: values.receiptFilename,
    };

    try {
      // Upload receipt if present
      if (receiptFile) {
        const uploadUrl = await requestUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": receiptFile.type },
          body: receiptFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload receipt");
        }

        const { storageId } = (await uploadResponse.json()) as {
          storageId: string;
        };
        sanitized.receiptStorageId = storageId;
        sanitized.receiptFilename = receiptFile.name;
      }

      await onSubmit(sanitized);

      // Reset form after successful submission
      reset({
        churchId,
        date: new Date().toISOString().slice(0, 10),
        type: sanitized.type,
        description: "",
        amount: 0,
        fundId: sanitized.fundId,
        categoryId: "",
        donorId: "",
        method: sanitized.method ?? "cash",
        reference: "",
        giftAid: false,
        notes: "",
        enteredByName: sanitized.enteredByName ?? "",
        receiptStorageId: undefined,
        receiptFilename: undefined,
      });
      setReceiptFile(null);
      onSubmitSuccess?.();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to record transaction"
      );
    }
  });

  return {
    form,
    submitError,
    receiptFile,
    setReceiptFile,
    selectedFund,
    expenseCategories,
    incomeCategories,
    onSubmitHandler,
    handleReceiptChange,
    handleRemoveReceipt,
  };
}
