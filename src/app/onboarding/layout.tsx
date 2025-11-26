"use client";

import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-paper">
        {/* Minimal header */}
        <header className="border-b border-ledger bg-paper">
          <div className="mx-auto max-w-3xl px-4 py-4">
            <h1 className="font-primary text-xl font-bold text-ink">
              ChurchCoin
            </h1>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      </div>
    </OnboardingProvider>
  );
}
