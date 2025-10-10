"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { Settings2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Id } from "@/lib/convexGenerated";

import { SettingsAutomationTab } from "./_components/automation-tab";
import { SettingsTeamTab } from "./_components/team-tab";

type TabValue = "team" | "automation";

const TAB_ITEMS: Array<{ value: TabValue; label: string; description: string }> = [
  {
    value: "team",
    label: "Team",
    description: "Invite and manage access for your finance and administration team.",
  },
  {
    value: "automation",
    label: "Automation",
    description: "Configure import defaults, AI categorisation, and category seeding.",
  },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = (searchParams.get("tab") as TabValue | null) ?? null;
  const activeTab: TabValue = tabParam === "automation" ? "automation" : "team";

  const churchParam = searchParams.get("church");
  const churches = useQuery(api.churches.listChurches, {});
  
  // Derive churchId from URL or default to first church
  const churchId = useMemo(() => {
    if (churchParam) {
      return churchParam as Id<"churches">;
    }
    if (churches && churches.length > 0) {
      return churches[0]._id;
    }
    return null;
  }, [churchParam, churches]);

  // Set default church in URL if not present (avoid redundant replaces)
  useEffect(() => {
    if (!churchParam && churches && churches.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const firstId = churches[0]._id;
      const current = params.get("church");
      if (current === firstId) return;
      params.set("church", firstId);
      const queryString = params.toString();
      const newUrl = queryString ? `/settings?${queryString}` : "/settings";
      if (newUrl !== window.location.pathname + window.location.search) {
        router.replace(newUrl, { scroll: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchParam, churches]);

  const activeTabMeta = useMemo(
    () => TAB_ITEMS.find((item) => item.value === activeTab),
    [activeTab]
  );

  const handleTabChange = (value: string) => {
    const tabValue = value as TabValue;
    const params = new URLSearchParams(window.location.search);
    if (tabValue === "team") {
      params.delete("tab");
    } else {
      params.set("tab", tabValue);
    }
    const queryString = params.toString();
    const newUrl = queryString ? `/settings?${queryString}` : "/settings";
    if (newUrl !== window.location.pathname + window.location.search) {
      router.replace(newUrl, { scroll: false });
    }
  };

  const handleChurchChange = (value: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("church", value);
    const queryString = params.toString();
    const newUrl = queryString ? `/settings?${queryString}` : "/settings";
    if (newUrl !== window.location.pathname + window.location.search) {
      router.replace(newUrl, { scroll: false });
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-12">
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-grey-mid">
                <Settings2 className="h-5 w-5 text-grey-mid" />
                <span className="text-sm uppercase tracking-wide">Settings</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink">Organisation settings</h1>
              <p className="text-sm text-grey-mid">
                Manage team access, automation preferences, and future configuration in one place.
              </p>
            </div>

            {churches && churches.length > 0 ? (
              <div className="w-full max-w-xs space-y-2">
                <label className="text-sm font-medium text-grey-mid">Active church</label>
                <Select
                  value={churchId ?? undefined}
                  onValueChange={handleChurchChange}
                >
                  <SelectTrigger className="border-ledger font-primary">
                    <SelectValue placeholder="Select church" />
                  </SelectTrigger>
                  <SelectContent className="font-primary text-sm">
                    {churches.map((church) => (
                      <SelectItem key={church._id} value={church._id}>
                        {church.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex flex-wrap gap-2 font-primary">
            {TAB_ITEMS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {activeTabMeta ? (
            <p className="text-sm text-grey-mid">{activeTabMeta.description}</p>
          ) : null}

          {activeTab === "team" && (
            <TabsContent value="team">
              <SettingsTeamTab />
            </TabsContent>
          )}

          {activeTab === "automation" && (
            <TabsContent value="automation">
              <SettingsAutomationTab churchId={churchId} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
