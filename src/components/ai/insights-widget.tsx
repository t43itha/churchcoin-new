"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Info,
  X,
  Eye,
  Sparkles,
  MessageCircle,
  FileText,
  Bell,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, type Id } from "@/lib/convexGenerated";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface InsightsWidgetProps {
  churchId: Id<"churches">;
}

export function InsightsWidget({ churchId }: InsightsWidgetProps) {
  const insights = useQuery(api.aiInsights.listActiveInsights, { churchId });
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

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
    const actions = [] as Array<JSX.Element>;
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

  if (activeInsights.length === 0) {
    return (
      <Card className="border-ledger bg-paper shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-grey-mid" />
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
    <Card className="border-ledger bg-paper shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-grey-mid" />
            <CardTitle className="text-ink font-primary">AI Insights</CardTitle>
            <Badge variant="secondary" className="font-primary text-xs uppercase">
              {activeInsights.length} alerts
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-primary text-xs uppercase">
              Real-time monitoring
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-grey-mid hover:text-ink"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={collapsed ? "Expand AI insights" : "Collapse AI insights"}
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <CardDescription className="text-grey-mid font-primary">
          Intelligent alerts surface emerging risks, donor changes, and growth opportunities.
        </CardDescription>
      </CardHeader>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-3">
              {activeInsights.map((insight) => {
                const Icon = getIcon(insight.type);
                const severityColor = getSeverityColor(insight.severity);
                const severity = severityCopy[insight.severity];
                const actions = renderQuickActions(insight);

                return (
                  <motion.div
                    key={insight._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-lg border border-ledger bg-highlight/70 p-4"
                  >
                    <button
                      onClick={() => handleDismiss(insight._id)}
                      className="absolute top-2 right-2 text-grey-mid hover:text-ink"
                      aria-label="Dismiss insight"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex flex-col gap-3 pr-6 md:flex-row md:items-start">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-paper", severityColor)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-medium text-ink font-primary text-sm">
                            {insight.title}
                          </h4>
                          <Badge variant="secondary" className="font-primary text-[10px] uppercase tracking-wide">
                            {insight.type}
                          </Badge>
                          {severity && (
                            <span className={cn("flex items-center gap-1 text-[10px] font-primary uppercase", severity.className)}>
                              <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
                              {severity.label}
                            </span>
                          )}
                        </div>

                        <ul className="space-y-1 text-sm font-primary text-grey-dark">
                          {insight.description
                            .split("—")
                            .flatMap((sentence) => sentence.split(".") )
                            .map((sentence) => sentence.trim())
                            .filter(Boolean)
                            .map((sentence, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="mt-[6px] block h-1.5 w-1.5 rounded-full bg-ink" aria-hidden />
                                <span>{sentence}</span>
                              </li>
                            ))}
                        </ul>

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
                  </motion.div>
                );
              })}
            </CardContent>
            <CardFooter className="border-t border-ledger bg-highlight/40 py-3 text-xs font-primary text-grey-mid">
              AI monitors giving, funds, and transactions every hour and highlights anything requiring attention.
            </CardFooter>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
