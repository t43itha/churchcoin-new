/**
 * Shared Zod validation schemas for forms across the application.
 * Centralized here to ensure consistency and reusability.
 */

import { z } from "zod";

// =============================================================================
// TRANSACTION SCHEMAS
// =============================================================================

/**
 * Schema for transaction form validation
 */
export const transactionSchema = z.object({
  churchId: z.string().min(1, "Select a church"),
  date: z.string().min(1, "Select a transaction date"),
  type: z.enum(["income", "expense"]),
  description: z
    .string()
    .min(3, "Description must be at least 3 characters")
    .max(140, "Keep descriptions concise"),
  amount: z.coerce.number().gt(0, "Amount must be greater than zero"),
  fundId: z.string().min(1, "Choose a fund"),
  categoryId: z.string().optional(),
  donorId: z.string().optional(),
  method: z.string().optional(),
  reference: z.string().optional(),
  giftAid: z.boolean().default(false),
  notes: z.string().optional(),
  enteredByName: z.string().optional(),
  receiptStorageId: z.string().optional(),
  receiptFilename: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

// =============================================================================
// FUND SCHEMAS
// =============================================================================

/**
 * Schema for fund form validation
 */
export const fundSchema = z.object({
  name: z.string().min(1, "Fund name is required").max(100),
  type: z.enum(["general", "restricted", "designated"]),
  description: z.string().max(500).optional(),
  targetAmount: z.coerce.number().min(0).optional(),
});

export type FundFormValues = z.infer<typeof fundSchema>;

// =============================================================================
// DONOR SCHEMAS
// =============================================================================

/**
 * Schema for donor form validation
 */
export const donorSchema = z.object({
  name: z.string().min(1, "Donor name is required").max(100),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  giftAidEligible: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

export type DonorFormValues = z.infer<typeof donorSchema>;

// =============================================================================
// CATEGORY SCHEMAS
// =============================================================================

/**
 * Schema for category form validation
 */
export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  type: z.enum(["income", "expense"]),
  parentId: z.string().optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
