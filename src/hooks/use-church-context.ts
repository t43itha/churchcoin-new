"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convexGenerated";
import type { Id } from "@/lib/convexGenerated";

/**
 * Storage key for persisting selected church
 */
const CHURCH_STORAGE_KEY = "churchcoin_selected_church";

/**
 * Church context returned by the hook
 */
export interface ChurchContextValue {
  /** Currently selected church ID */
  churchId: Id<"churches"> | null;
  /** Set the selected church ID */
  setChurchId: (id: Id<"churches">) => void;
  /** All churches the user belongs to */
  churches: Array<{
    _id: Id<"churches">;
    name: string;
    charityNumber?: string;
  }>;
  /** Currently selected church data */
  selectedChurch: {
    _id: Id<"churches">;
    name: string;
    charityNumber?: string;
  } | null;
  /** Current user data */
  user: {
    _id: Id<"users">;
    name: string;
    email: string;
    role: string;
    churchId?: Id<"churches">;
  } | null;
  /** Whether the hook is still loading */
  isLoading: boolean;
  /** Whether there was an error loading data */
  error: string | null;
  /** Whether user has write permissions */
  canWrite: boolean;
  /** Whether user has admin permissions */
  canAdmin: boolean;
}

/**
 * Normalize legacy role values to canonical names
 * Matches backend normalizeRole in convex/roles.ts
 */
function normalizeRole(role: string | undefined): string {
  if (!role) return "";
  const normalized = role.toLowerCase().trim();

  // Map legacy role names to canonical names
  const roleMap: Record<string, string> = {
    admin: "administrator",
    finance_manager: "finance",
    pastor: "pastorate",
    guest: "secured_guest",
  };

  return roleMap[normalized] ?? normalized;
}

/**
 * Roles that can write data
 */
const WRITE_ROLES = ["administrator", "finance"];

/**
 * Roles that can administer
 */
const ADMIN_ROLES = ["administrator"];

/**
 * Hook for managing church context across the application
 *
 * This hook:
 * 1. Loads the current user
 * 2. Loads available churches
 * 3. Auto-selects church from user or localStorage
 * 4. Persists selection to localStorage
 * 5. Provides permission helpers
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { churchId, selectedChurch, isLoading, canWrite } = useChurchContext();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!churchId) return <NoChurchError />;
 *
 *   return (
 *     <div>
 *       <h1>{selectedChurch?.name}</h1>
 *       {canWrite && <CreateButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useChurchContext(): ChurchContextValue {
  const [churchId, setChurchIdState] = useState<Id<"churches"> | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Fetch current user
  const currentUser = useQuery(api.auth.getCurrentUser);

  // Fetch churches for the user
  const churches = useQuery(api.churches.listChurches, {});

  // Determine if still loading
  const isLoading = currentUser === undefined || churches === undefined;

  // Set church ID with localStorage persistence
  const setChurchId = (id: Id<"churches">) => {
    setChurchIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(CHURCH_STORAGE_KEY, id);
    }
  };

  // Initialize church selection
  useEffect(() => {
    if (initialized || isLoading) return;

    // Try to restore from localStorage first
    const savedChurchId = typeof window !== "undefined"
      ? localStorage.getItem(CHURCH_STORAGE_KEY)
      : null;

    // Check if saved church is valid for this user
    const validSavedChurch = savedChurchId && churches?.some(
      (c) => c._id === savedChurchId
    );

    if (validSavedChurch) {
      setChurchIdState(savedChurchId as Id<"churches">);
    } else if (currentUser?.churchId) {
      // Use user's assigned church
      setChurchIdState(currentUser.churchId);
      if (typeof window !== "undefined") {
        localStorage.setItem(CHURCH_STORAGE_KEY, currentUser.churchId);
      }
    } else if (churches && churches.length > 0) {
      // Fallback to first available church
      setChurchIdState(churches[0]._id);
      if (typeof window !== "undefined") {
        localStorage.setItem(CHURCH_STORAGE_KEY, churches[0]._id);
      }
    }

    setInitialized(true);
  }, [isLoading, churches, currentUser, initialized]);

  // Find selected church
  const selectedChurch = churches?.find((c) => c._id === churchId) ?? null;

  // Compute permissions (normalize to handle legacy role values)
  const role = normalizeRole(currentUser?.role);
  const canWrite = WRITE_ROLES.includes(role);
  const canAdmin = ADMIN_ROLES.includes(role);

  // Compute error
  let error: string | null = null;
  if (!isLoading) {
    if (!currentUser) {
      error = "User not authenticated";
    } else if (!churches || churches.length === 0) {
      error = "No churches available";
    }
  }

  return {
    churchId,
    setChurchId,
    churches: churches ?? [],
    selectedChurch,
    user: currentUser ?? null,
    isLoading,
    error,
    canWrite,
    canAdmin,
  };
}

/**
 * Hook for getting just the church ID (convenience wrapper)
 *
 * @example
 * ```tsx
 * const churchId = useChurchId();
 * const funds = useQuery(api.funds.getFunds, churchId ? { churchId } : "skip");
 * ```
 */
export function useChurchId(): Id<"churches"> | null {
  const { churchId } = useChurchContext();
  return churchId;
}

/**
 * Hook for checking if user can write data
 */
export function useCanWrite(): boolean {
  const { canWrite, isLoading } = useChurchContext();
  return !isLoading && canWrite;
}

/**
 * Hook for checking if user can administer
 */
export function useCanAdmin(): boolean {
  const { canAdmin, isLoading } = useChurchContext();
  return !isLoading && canAdmin;
}
