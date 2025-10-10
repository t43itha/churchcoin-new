"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Calculator,
  PiggyBank,
  Receipt,
  GitMerge,
  Users,
  Upload,
  FileText,
  Settings,
  LogOut,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleDisplayName, getRolePermissions } from "@/lib/rbac";
import { useSession } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChatDialog } from "@/components/ai/chat-dialog";
import { api } from "@/lib/convexGenerated";

const baseNavigation = [
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
    name: "Reconciliation",
    href: "/reconciliation",
    icon: GitMerge,
  },
  {
    name: "Donors",
    href: "/donors",
    icon: Users,
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
];

const adminNavigation = [
  {
    name: "Team",
    href: "/settings/users",
    icon: ShieldCheck,
  },
  {
    name: "Automation",
    href: "/settings/automation",
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useSession();
  const [chatOpen, setChatOpen] = useState(false);
  const churches = useQuery(api.churches.listChurches, {});
  const churchId = churches?.[0]?._id;

  const permissions = useMemo(
    () => getRolePermissions(user?.role),
    [user?.role]
  );

  const visibleNavigation = useMemo(() => {
    if (permissions.restrictedToManualEntry) {
      return baseNavigation.filter((item) => item.href === "/transactions");
    }

    return permissions.canManageUsers
      ? [...baseNavigation, ...adminNavigation]
      : baseNavigation;
  }, [permissions.canManageUsers, permissions.restrictedToManualEntry]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const currentPage = pathname.split("/")[1] || "dashboard";

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

      {/* AI Assistant Button */}
      <div className="px-4 pt-6 pb-3">
        <Button
          onClick={() => setChatOpen(true)}
          className="w-full gap-2 bg-ink text-paper hover:bg-grey-dark font-primary"
        >
          <Sparkles className="h-4 w-4" />
          AI Assistant
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 pb-6">
        <ul className="space-y-2">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

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

      <ChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        churchId={churchId}
        context={{ page: currentPage }}
      />

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
              <p className="text-xs text-grey-mid font-primary">
                {getRoleDisplayName(user.role)}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {permissions.canManageUsers ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 font-primary border-ledger text-grey-mid hover:text-ink"
              asChild
            >
              <Link href="/settings/users" className="flex items-center justify-center gap-1">
                <Settings className="h-3 w-3" />
                Settings
              </Link>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="flex-1 font-primary border-ledger text-grey-mid hover:text-ink"
          >
            <LogOut className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}