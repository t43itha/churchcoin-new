"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

interface HeaderProps {
  children?: React.ReactNode;
}

// Map path segments to page titles
const pageTitles: Record<string, string> = {
  dashboard: "Dashboard",
  funds: "Funds",
  transactions: "Transactions",
  reconciliation: "Reconciliation",
  donors: "Donors",
  imports: "Import",
  reports: "Reports",
  settings: "Settings",
};

export function Header({ children }: HeaderProps) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Get current page title for mobile
  const segment = pathname.split("/")[1] || "dashboard";
  const currentPage = pageTitles[segment] || "Dashboard";

  return (
    <header className="border-b border-ink/10 bg-white">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        {/* Mobile menu trigger - Swiss Ledger style */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="md:hidden h-10 w-10 p-0 border-ink/20 hover:border-ink hover:bg-paper transition-colors"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-r border-ink/10">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <Sidebar onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Mobile: Page title */}
        <div className="md:hidden">
          <h1 className="text-lg font-semibold text-ink">{currentPage}</h1>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Header actions */}
        {children}
      </div>
    </header>
  );
}