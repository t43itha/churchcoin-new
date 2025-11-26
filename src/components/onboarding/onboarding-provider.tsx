"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Id } from "@/lib/convexGenerated";

// ============================================================================
// Types
// ============================================================================

export type OnboardingFlowType = "new-church" | "invited";

export type OnboardingData = {
  // Flow metadata
  flowType: OnboardingFlowType | null;
  inviteToken: string | null;

  // New church flow data
  churchName: string;
  charityNumber: string;
  address: string;
  reviewedFunds: boolean;
  invitedEmails: string[];

  // Invited flow data
  churchToJoin: {
    id: Id<"churches">;
    name: string;
  } | null;
  assignedRole: string | null;

  // Common
  churchId: Id<"churches"> | null;
};

type OnboardingContextValue = {
  // Data
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;

  // Navigation
  currentStep: number;
  totalSteps: number;
  goToStep: (step: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canGoBack: boolean;
  canGoForward: boolean;

  // Flow state
  isLoading: boolean;
  setFlowType: (flowType: OnboardingFlowType) => void;
};

const STORAGE_KEY = "churchcoin_onboarding";

const NEW_CHURCH_STEPS = 5;
const INVITED_STEPS = 3;

const defaultData: OnboardingData = {
  flowType: null,
  inviteToken: null,
  churchName: "",
  charityNumber: "",
  address: "",
  reviewedFunds: false,
  invitedEmails: [],
  churchToJoin: null,
  assignedRole: null,
  churchId: null,
};

// ============================================================================
// Context
// ============================================================================

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined
);

// ============================================================================
// Provider
// ============================================================================

function OnboardingProviderContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<OnboardingData>(defaultData);
  const [isLoading, setIsLoading] = useState(true);

  // Determine current step from URL
  const currentStep = useMemo(() => {
    const match = pathname?.match(/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : 1;
  }, [pathname]);

  // Determine total steps based on flow type
  const totalSteps = useMemo(() => {
    if (data.flowType === "new-church") return NEW_CHURCH_STEPS;
    if (data.flowType === "invited") return INVITED_STEPS;
    return 1;
  }, [data.flowType]);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<OnboardingData>;
        setData((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore storage errors
    }

    // Check for invite token in URL
    const inviteToken = searchParams?.get("invite") ?? null;
    if (inviteToken) {
      setData((prev) => ({ ...prev, inviteToken }));
    }

    setIsLoading(false);
  }, [searchParams]);

  // Persist data to localStorage on changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Ignore storage errors
      }
    }
  }, [data, isLoading]);

  // Update data
  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Set flow type
  const setFlowType = useCallback((flowType: OnboardingFlowType) => {
    setData((prev) => ({ ...prev, flowType }));
  }, []);

  // Navigation
  const goToStep = useCallback(
    (step: number) => {
      if (step < 1 || step > totalSteps) return;

      const flowPath = data.flowType === "invited" ? "invited" : "new-church";
      const url = `/onboarding/${flowPath}/${step}`;

      // Preserve invite token in URL if present
      if (data.inviteToken) {
        router.push(`${url}?invite=${data.inviteToken}`);
      } else {
        router.push(url);
      }
    },
    [data.flowType, data.inviteToken, router, totalSteps]
  );

  const goToNextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, goToStep]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const canGoBack = currentStep > 1;
  const canGoForward = currentStep < totalSteps;

  // Context value
  const value = useMemo<OnboardingContextValue>(
    () => ({
      data,
      updateData,
      currentStep,
      totalSteps,
      goToStep,
      goToNextStep,
      goToPreviousStep,
      canGoBack,
      canGoForward,
      isLoading,
      setFlowType,
    }),
    [
      data,
      updateData,
      currentStep,
      totalSteps,
      goToStep,
      goToNextStep,
      goToPreviousStep,
      canGoBack,
      canGoForward,
      isLoading,
      setFlowType,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ledger border-t-ink" />
        </div>
      }
    >
      <OnboardingProviderContent>{children}</OnboardingProviderContent>
    </Suspense>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

// ============================================================================
// Utils
// ============================================================================

export function clearOnboardingData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
