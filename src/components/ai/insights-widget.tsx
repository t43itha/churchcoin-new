"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Info,
  Eye,
  Sparkles,
  MessageCircle,
  FileText,
  Bell,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, type Id } from "@/lib/convexGenerated";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface InsightsWidgetProps {
  churchId: Id<"churches">;
}

export function InsightsWidget({ churchId }: InsightsWidgetProps) {
  const insights = useQuery(api.aiInsights.listActiveInsights, { churchId });
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case "anomaly":
        return AlertCircle;
      case "trend":
        return TrendingUp;
      case "compliance":
        return AlertTriangle;
      case "prediction":
        return TrendingUp;
      case "recommendation":
        return Info;
      default:
        return Sparkles;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-error";
      case "warning":
        return "text-amber-600";
      case "info":
        return "text-blue-600";
      default:
        return "text-grey-mid";
    }
  };

  const handleDismiss = (insightId: string) => {
    setDismissed((prev) => new Set(prev).add(insightId));
  };

  const activeInsights = useMemo(
    () => (insights ?? []).filter((insight) => !dismissed.has(insight._id)),
    [insights, dismissed]
  );

  const severityCopy = useMemo(
    () => ({
      critical: { label: "Critical", className: "text-error" },
      warning: { label: "Warning", className: "text-amber-600" },
      info: { label: "Information", className: "text-blue-600" },
    }),
    []
  );

  const renderQuickActions = (insight: (typeof activeInsights)[number]) => {
    const actions: ReactElement[] = [];
    if (insight.actionable && insight.actionUrl) {
      actions.push(
        <Link key="view" href={insight.actionUrl}>
          <Button
            variant="outline"
            size="sm"
            className="border-ledger font-primary text-xs uppercase tracking-wide"
          >
            <Eye className="mr-2 h-3 w-3" />
            View Details
          </Button>
        </Link>
      );
    }

    if (insight.type === "compliance" || insight.type === "trend") {
      actions.push(
        <Link key="contact" href="/donors">
          <Button
            variant="outline"
            size="sm"
            className="border-ledger font-primary text-xs uppercase tracking-wide"
          >
            <MessageCircle className="mr-2 h-3 w-3" />
            Contact Donors
          </Button>
        </Link>
      );
    }

    if (insight.type === "anomaly" || insight.type === "trend") {
      actions.push(
        <Link key="report" href="/reports">
          <Button
            variant="outline"
            size="sm"
            className="border-ledger font-primary text-xs uppercase tracking-wide"
          >
            <FileText className="mr-2 h-3 w-3" />
            Run Report
          </Button>
        </Link>
      );
    }

    return actions;
  };

  const visibleInsights = useMemo(() => {
    if (showAll) return activeInsights.slice(0, 5);
    return activeInsights.slice(0, 3);
  }, [activeInsights, showAll]);

  const hasMore = activeInsights.length > visibleInsights.length;

  if (activeInsights.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50/60 shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-ink font-primary">AI Insights</CardTitle>
            </div>
            <Badge variant="secondary" className="font-primary text-xs uppercase">
              Up to date
            </Badge>
          </div>
          <CardDescription className="text-grey-mid font-primary">
            No new alerts — finances look steady.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/70 shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-ink font-primary">AI Insights &amp; Alerts</CardTitle>
              <Badge variant="secondary" className="font-primary text-xs uppercase tracking-wide">
                {activeInsights.length} alerts
              </Badge>
              <Badge variant="outline" className="font-primary text-[10px] uppercase tracking-[0.2em]">
                Real-time monitoring
              </Badge>
            </div>
            <p className="text-sm font-primary text-grey-mid">
              Insightful summaries focus attention on material trends and recommended follow-up actions.
            </p>
          </div>
          <div className="flex flex-col items-end text-right text-xs font-primary uppercase text-amber-700">
            <span className="font-semibold">{activeInsights.length} alerts</span>
            <span>Prioritised by severity</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-white/50 px-4 py-3 text-sm font-primary text-grey-dark">
          <span className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            Prioritised alerts surface the most material risks first.
          </span>
          <span className="text-xs uppercase text-grey-mid">Critical → Warning → Info</span>
        </div>
        <div className="space-y-3">
          {visibleInsights.map((insight) => {
            const Icon = getIcon(insight.type);
            const severityColor = getSeverityColor(insight.severity);
            const severity = severityCopy[insight.severity];
            const actions = renderQuickActions(insight);

            return (
              <div
                key={insight._id}
                className="rounded-lg border border-amber-200/70 bg-white/80 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full bg-amber-100",
                      severityColor
                    )}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-primary text-sm font-semibold text-ink">
                        {insight.title}
                      </h3>
                      <Badge variant="secondary" className="font-primary text-[10px] uppercase tracking-[0.2em]">
                        {insight.type}
                      </Badge>
                      {severity && (
                        <span className={cn("text-[10px] font-primary uppercase", severity.className)}>
                          {severity.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-primary leading-relaxed text-grey-dark">
                      {insight.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {actions}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="font-primary text-xs uppercase tracking-wide text-grey-mid hover:text-ink"
                        onClick={() => handleDismiss(insight._id)}
                      >
                        <Bell className="mr-2 h-3 w-3" />
                        Remind me later
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-xs font-primary text-grey-mid">
          <span>AI reviews funds, donors, and transactions hourly to surface anomalies.</span>
          {activeInsights.length > 3 && (
            <Button
              variant="link"
              className="h-auto p-0 text-xs uppercase tracking-wide text-amber-700"
              onClick={() => setShowAll((prev) => !prev)}
            >
              {hasMore ? "View all insights →" : "Show fewer"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
