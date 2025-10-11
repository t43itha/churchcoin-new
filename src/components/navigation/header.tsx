"use client";

import { usePathname } from "next/navigation";
import { Menu, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

// Navigation breadcrumb mapping
const breadcrumbMap: Record<string, string[]> = {
  "/dashboard": ["Dashboard"],
  "/funds": ["Dashboard", "Funds"],
  "/transactions": ["Dashboard", "Transactions"],
  "/reconciliation": ["Dashboard", "Reconciliation"],
  "/donors": ["Dashboard", "Donors"],
  "/imports": ["Dashboard", "Import"],
  "/reports": ["Dashboard", "Reports"],
};

interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = breadcrumbMap[pathname] || ["Dashboard"];

  return (
    <header className="border-b border-ledger bg-paper">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Mobile menu trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="md:hidden border-ledger"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm font-primary">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-grey-mid" />
              )}
              <span
                className={
                  index === breadcrumbs.length - 1
                    ? "text-ink font-medium"
                    : "text-grey-mid"
                }
              >
                {crumb}
              </span>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Header actions */}
        {children}
      </div>

    </header>
  );
}