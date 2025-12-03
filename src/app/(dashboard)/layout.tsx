"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ChurchProvider } from "@/contexts/church-context";
import { Sidebar } from "@/components/navigation/sidebar";
import { Header } from "@/components/navigation/header";
import { MobileNav } from "@/components/navigation/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ChurchProvider>
      <div className="flex h-screen bg-paper">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-72 md:flex-col">
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header - mobile only */}
          <div className="md:hidden">
            <Header />
          </div>

          {/* Page Content - Swiss Ledger grid background */}
          <main className="flex-1 overflow-y-auto ledger-grid-bg pb-20 md:pb-0">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
      </ChurchProvider>
    </AuthGuard>
  );
}