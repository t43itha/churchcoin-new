/**
 * Shared form components for consistent data entry across the application
 *
 * This module exports reusable form components that maintain the ChurchCoin
 * ledger-inspired design system. Each component has two variants:
 *
 * 1. Controlled: For use with useState or custom state management
 * 2. RHF (React Hook Form): For integration with react-hook-form
 *
 * @example
 * ```tsx
 * // Controlled usage
 * import { FundSelect, DonorSelect } from "@/components/forms";
 *
 * <FundSelect
 *   funds={funds}
 *   value={selectedFundId}
 *   onChange={setSelectedFundId}
 *   showBalance
 * />
 *
 * // React Hook Form usage
 * import { FundSelectRHF, CategorySelectRHF } from "@/components/forms";
 *
 * <FundSelectRHF
 *   funds={funds}
 *   register={register("fundId")}
 *   watchValue={watch("fundId")}
 *   error={errors.fundId?.message}
 * />
 * ```
 */

// Fund selection
export { FundSelect, FundSelectRHF } from "./fund-select";

// Category selection
export { CategorySelect, CategorySelectRHF } from "./category-select";

// Donor selection
export { DonorSelect, DonorSelectRHF } from "./donor-select";

// Amount input
export { AmountInput, AmountInputRHF } from "./amount-input";
