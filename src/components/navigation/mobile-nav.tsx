"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Calculator,
  PiggyBank,
  Receipt,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitMerge, Upload, FileText, Settings } from "lucide-react";

const mainNavItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Calculator,
  },
  {
    name: "Funds",
    href: "/funds",
    icon: PiggyBank,
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: Receipt,
  },
  {
    name: "Donors",
    href: "/donors",
    icon: Users,
  },
];

const moreNavItems = [
  {
    name: "Reconciliation",
    href: "/reconciliation",
    icon: GitMerge,
  },
  {
    name: "Import",
    href: "/imports",
    icon: Upload,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

/**
 * MobileNav - Bottom navigation for mobile devices
 *
 * Swiss Ledger styled mobile navigation with 5 items:
 * Dashboard, Funds, Transactions, Donors, and a "More" menu.
 *
 * Features:
 * - Large touch targets (44px minimum)
 * - Sage accent for active state
 * - Icon + label for clarity
 */
export function MobileNav() {
  const pathname = usePathname();

  // Check if any "more" items are active
  const moreIsActive = moreNavItems.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href))
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-ledger md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] h-full px-2 transition-colors",
                isActive ? "text-sage" : "text-grey-mid"
              )}
            >
              <item.icon
                className={cn(
                  "h-6 w-6 mb-1",
                  isActive ? "text-sage" : "text-grey-mid"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive ? "text-sage" : "text-grey-mid"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex flex-col items-center justify-center min-w-[64px] h-full px-2 transition-colors outline-none",
              moreIsActive ? "text-sage" : "text-grey-mid"
            )}
          >
            <MoreHorizontal
              className={cn(
                "h-6 w-6 mb-1",
                moreIsActive ? "text-sage" : "text-grey-mid"
              )}
            />
            <span
              className={cn(
                "text-xs font-medium",
                moreIsActive ? "text-sage" : "text-grey-mid"
              )}
            >
              More
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-56 mb-2 border-ink bg-white"
          >
            {moreNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <DropdownMenuItem key={item.name} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 cursor-pointer",
                      isActive
                        ? "bg-sage-light text-ink"
                        : "text-grey-mid hover:text-ink"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}

export default MobileNav;
