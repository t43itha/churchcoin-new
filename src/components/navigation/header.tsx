"use client";

import { usePathname } from "next/navigation";
import { Menu, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

// Navigation breadcrumb mapping
const breadcrumbMap: Record<string, string[]> = {
  "/dashboard": ["Dashboard"],
  "/dashboard/funds": ["Dashboard", "Funds"],
  "/dashboard/transactions": ["Dashboard", "Transactions"],
  "/dashboard/reconciliation": ["Dashboard", "Reconciliation"],
  "/dashboard/donors": ["Dashboard", "Donors"],
  "/dashboard/imports": ["Dashboard", "Import"],
  "/dashboard/reports": ["Dashboard", "Reports"],
};

interface HeaderProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export function Header({ title, description, children }: HeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = breadcrumbMap[pathname] || ["Dashboard"];

  // If custom title is provided, use it, otherwise derive from breadcrumbs
  const pageTitle = title || breadcrumbs[breadcrumbs.length - 1];

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

      {/* Page title and description */}
      {(pageTitle || description) && (
        <div className="border-b border-ledger bg-paper px-6 py-4">
          {pageTitle && (
            <h1 className="text-2xl font-semibold text-ink font-primary">
              {pageTitle}
            </h1>
          )}
          {description && (
            <p className="text-sm text-grey-mid font-primary mt-1">
              {description}
            </p>
          )}
        </div>
      )}
    </header>
  );
}