"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Calculator,
  PiggyBank,
  Receipt,
  GitMerge,
  Users,
  Upload,
  FileText,
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Calculator,
  },
  {
    name: "Funds",
    href: "/dashboard/funds",
    icon: PiggyBank,
  },
  {
    name: "Transactions",
    href: "/dashboard/transactions",
    icon: Receipt,
  },
  {
    name: "Reconciliation",
    href: "/dashboard/reconciliation",
    icon: GitMerge,
  },
  {
    name: "Donors",
    href: "/dashboard/donors",
    icon: Users,
  },
  {
    name: "Import",
    href: "/dashboard/imports",
    icon: Upload,
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useSession();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className={cn("flex h-full flex-col bg-paper border-r border-ledger", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-ledger">
        <Calculator className="h-8 w-8 text-grey-dark" />
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-ink font-primary">ChurchCoin</h1>
          <p className="text-xs text-grey-mid font-primary">Church Finance</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium font-primary transition-colors",
                    isActive
                      ? "bg-highlight text-ink border border-ledger"
                      : "text-grey-mid hover:bg-ledger hover:text-ink"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-ink" : "text-grey-mid group-hover:text-ink"
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-ledger p-4">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-ledger text-ink font-primary text-xs">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink font-primary truncate">
                {user.name}
              </p>
              <p className="text-xs text-grey-mid font-primary capitalize">
                {user.role}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 font-primary border-ledger text-grey-mid hover:text-ink"
          >
            <Settings className="h-3 w-3 mr-1" />
            Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="font-primary border-ledger text-grey-mid hover:text-ink"
          >
            <LogOut className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
