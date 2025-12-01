/**
 * Custom React Hooks
 *
 * Central export for all custom hooks used in the application.
 */

// Church context and permissions
export {
  useChurchContext,
  useChurchId,
  useCanWrite,
  useCanAdmin,
  type ChurchContextValue,
} from "./use-church-context";

// Form dialog state management
export {
  useFormDialog,
  useConfirmDialog,
  useEditDialog,
  type UseFormDialogOptions,
  type UseFormDialogReturn,
} from "./use-form-dialog";

// Church data hooks (queries and mutations)
export {
  useChurchFunds,
  useChurchTransactions,
  useChurchDonors,
  useChurchCategories,
  useFundOverview,
  useFund,
  useDonor,
  useFinancialPeriods,
  useAiInsights,
} from "./use-church-data";
