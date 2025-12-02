"use client";

import { useState, useCallback, useMemo } from "react";

/**
 * Options for configuring the form dialog hook
 */
export interface UseFormDialogOptions<TData = unknown> {
  /** Callback when form is submitted successfully */
  onSubmit?: (data: TData) => Promise<void> | void;
  /** Callback when submission succeeds */
  onSuccess?: () => void;
  /** Callback when submission fails */
  onError?: (error: Error) => void;
  /** Initial open state */
  defaultOpen?: boolean;
}

/**
 * Return value from useFormDialog hook
 */
export interface UseFormDialogReturn<TData = unknown> {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Open the dialog */
  open: () => void;
  /** Close the dialog (disabled while submitting) */
  close: () => void;
  /** Toggle dialog open/close state */
  toggle: () => void;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Set error manually */
  setError: (error: string | null) => void;
  /** Clear error */
  clearError: () => void;
  /** Handle form submission with automatic state management */
  handleSubmit: (data: TData) => Promise<void>;
  /** Reset dialog to initial state */
  reset: () => void;
  /** Props to spread on Dialog component */
  dialogProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };
}

/**
 * Hook for managing form dialog state
 *
 * Replaces the boilerplate pattern of:
 * - useState for isOpen
 * - useState for isSubmitting
 * - useState for error
 * - Manual error handling in try/catch
 *
 * @example
 * ```tsx
 * function CreateFundDialog() {
 *   const createFund = useMutation(api.funds.createFund);
 *
 *   const dialog = useFormDialog({
 *     onSubmit: async (data) => {
 *       await createFund(data);
 *     },
 *     onSuccess: () => {
 *       toast.success("Fund created!");
 *     },
 *   });
 *
 *   return (
 *     <>
 *       <Button onClick={dialog.open}>Create Fund</Button>
 *
 *       <Dialog {...dialog.dialogProps}>
 *         <DialogContent>
 *           <form onSubmit={handleSubmit(dialog.handleSubmit)}>
 *             {dialog.error && <ErrorMessage>{dialog.error}</ErrorMessage>}
 *
 *             <Input {...register("name")} />
 *
 *             <Button type="submit" disabled={dialog.isSubmitting}>
 *               {dialog.isSubmitting ? "Creating..." : "Create"}
 *             </Button>
 *           </form>
 *         </DialogContent>
 *       </Dialog>
 *     </>
 *   );
 * }
 * ```
 */
export function useFormDialog<TData = unknown>(
  options: UseFormDialogOptions<TData> = {}
): UseFormDialogReturn<TData> {
  const { onSubmit, onSuccess, onError, defaultOpen = false } = options;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setError(null);
  }, []);

  const close = useCallback(() => {
    if (!isSubmitting) {
      setIsOpen(false);
      setError(null);
    }
  }, [isSubmitting]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsOpen(defaultOpen);
    setIsSubmitting(false);
    setError(null);
  }, [defaultOpen]);

  const handleSubmit = useCallback(
    async (data: TData) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      setError(null);

      try {
        await onSubmit?.(data);
        setIsOpen(false);
        onSuccess?.();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, onSubmit, onSuccess, onError]
  );

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setIsOpen(true);
        setError(null);
      } else if (!isSubmitting) {
        setIsOpen(false);
        setError(null);
      }
    },
    [isSubmitting]
  );

  const dialogProps = useMemo(
    () => ({
      open: isOpen,
      onOpenChange,
    }),
    [isOpen, onOpenChange]
  );

  return {
    isOpen,
    open,
    close,
    toggle,
    isSubmitting,
    error,
    setError,
    clearError,
    handleSubmit,
    reset,
    dialogProps,
  };
}

/**
 * Simplified hook for confirmation dialogs (no form data)
 *
 * @example
 * ```tsx
 * const confirmDelete = useConfirmDialog({
 *   onConfirm: async () => {
 *     await deleteFund({ id: fundId });
 *   },
 * });
 *
 * return (
 *   <ConfirmDialog
 *     {...confirmDelete.dialogProps}
 *     title="Delete Fund?"
 *     description="This action cannot be undone."
 *     isLoading={confirmDelete.isSubmitting}
 *     onConfirm={confirmDelete.confirm}
 *   />
 * );
 * ```
 */
export function useConfirmDialog(options: {
  onConfirm: () => Promise<void> | void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const dialog = useFormDialog<void>({
    onSubmit: options.onConfirm,
    onSuccess: options.onSuccess,
    onError: options.onError,
  });

  return {
    ...dialog,
    confirm: () => dialog.handleSubmit(undefined as void),
  };
}

/**
 * Hook for managing edit dialog with initial data
 *
 * @example
 * ```tsx
 * const editDialog = useEditDialog<Fund>({
 *   onSubmit: async (data) => {
 *     await updateFund(data);
 *   },
 * });
 *
 * // Open with data to edit
 * <Button onClick={() => editDialog.openWith(fund)}>Edit</Button>
 *
 * // Access current data in form
 * const defaultValues = editDialog.data;
 * ```
 */
export function useEditDialog<TData>(
  options: Omit<UseFormDialogOptions<TData>, "defaultOpen"> = {}
) {
  const [data, setData] = useState<TData | null>(null);
  const dialog = useFormDialog<TData>(options);

  const openWith = useCallback(
    (initialData: TData) => {
      setData(initialData);
      dialog.open();
    },
    [dialog]
  );

  const close = useCallback(() => {
    dialog.close();
    // Clear data after dialog closes
    if (!dialog.isSubmitting) {
      setData(null);
    }
  }, [dialog]);

  return {
    ...dialog,
    close,
    data,
    openWith,
    hasData: data !== null,
  };
}
