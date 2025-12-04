"use client";

import { useMemo, useState } from "react";
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
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleDisplayName, getRolePermissions } from "@/lib/rbac";
import { useSession } from "@/components/auth/session-provider";
import { useChurch } from "@/contexts/church-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChatDialog } from "@/components/ai/chat-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const baseNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: Calculator },
  { name: "Funds", href: "/funds", icon: PiggyBank },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Reconciliation", href: "/reconciliation", icon: GitMerge },
  { name: "Donors", href: "/donors", icon: Users },
  { name: "Import", href: "/imports", icon: Upload },
  { name: "Reports", href: "/reports", icon: FileText },
];

const adminNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useSession();
  const [chatOpen, setChatOpen] = useState(false);
  const { churchId, setChurchId, churches } = useChurch();

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
      {/* Header - Swiss Ledger Style */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-5 border-b border-ink/10">
        <div className="flex items-center justify-center w-10 h-10 bg-ink rounded-lg">
          <Calculator className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-ink tracking-tight">ChurchCoin</h1>
          <p className="text-xs text-grey-mid uppercase tracking-widest">Church Finance</p>
        </div>
      </div>

      {/* AI Assistant Button - Amber accent on hover */}
      <div className="shrink-0 px-4 pt-6 pb-4">
        <Button
          onClick={() => setChatOpen(true)}
          className="w-full h-12 gap-3 bg-ink text-white hover:bg-charcoal font-medium text-base
                     border border-ink shadow-hard-sm hover:shadow-hard-amber hover:-translate-x-0.5 hover:-translate-y-0.5
                     transition-all duration-200"
        >
          <Sparkles className="h-5 w-5" />
          AI Assistant
        </Button>
      </div>

      {/* Section Divider */}
      <div className="shrink-0 px-4">
        <div className="h-px bg-ledger" />
      </div>

      {/* Navigation Label */}
      <div className="shrink-0 px-6 pt-4 pb-2">
        <span className="swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid">
          Navigation
        </span>
      </div>

      {/* Navigation - scrollable */}
      <nav className="flex-1 min-h-0 px-4 pb-4 overflow-y-auto">
        <ul className="space-y-1">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-all duration-200",
                    isActive
                      ? "bg-sage-light text-ink"
                      : "text-grey-mid hover:bg-paper hover:text-ink"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive ? "text-sage" : "text-grey-mid group-hover:text-ink"
                    )}
                  />
                  <span className="flex-1">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <ChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        churchId={churchId ?? undefined}
        context={{ page: currentPage }}
      />

      {/* Compact Footer - User + Church selector */}
      <div className="shrink-0 border-t border-ledger p-3">
        <div className="flex items-center gap-2">
          {/* User avatar with popover */}
          {user && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2">
                  <Avatar className="h-9 w-9 border border-ink cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarFallback className="bg-ink text-white font-semibold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="start" side="top">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
                    <p className="text-xs text-grey-mid uppercase tracking-wide">
                      {getRoleDisplayName(user.role)}
                    </p>
                  </div>
                  <div className="h-px bg-ledger" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="w-full h-9 gap-2 text-sm font-medium border-ink/20 text-grey-mid
                               hover:border-ink hover:text-ink hover:bg-paper transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Church selector - compact */}
          {churches && churches.length > 0 && (
            <Select
              value={churchId ?? undefined}
              onValueChange={(value) => setChurchId(value as typeof churchId)}
            >
              <SelectTrigger className="flex-1 h-9 text-sm bg-white border-ink/20 hover:border-ink focus:border-ink transition-colors">
                <SelectValue placeholder="Church" />
              </SelectTrigger>
              <SelectContent>
                {churches.map((church) => (
                  <SelectItem key={church._id} value={church._id}>
                    {church.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}
