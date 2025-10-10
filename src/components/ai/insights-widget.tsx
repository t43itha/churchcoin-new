"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Info,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type Id } from "@/lib/convexGenerated";
import { cn } from "@/lib/utils";

interface InsightsWidgetProps {
  churchId: Id<"churches">;
}

export function InsightsWidget({ churchId }: InsightsWidgetProps) {
  const insights = useQuery(api.aiInsights.listActiveInsights, { churchId });

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

  const activeInsights = useMemo(() => insights ?? [], [insights]);

  const severityCopy = useMemo(
    () => ({
      critical: { label: "Critical", className: "text-error" },
      warning: { label: "Warning", className: "text-amber-600" },
      info: { label: "Information", className: "text-blue-600" },
    }),
    []
  );

  const visibleInsights = useMemo(() => activeInsights.slice(0, 3), [activeInsights]);

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
          <div className="mt-2">
            <Badge variant="outline" className="font-primary text-[10px] uppercase tracking-[0.2em]">
              Real-time monitoring
            </Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/70 shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-ink font-primary">AI Insights &amp; Alerts</CardTitle>
          <Badge variant="secondary" className="font-primary text-xs uppercase tracking-wide">
            {activeInsights.length} alerts
          </Badge>
          <Badge variant="outline" className="font-primary text-[10px] uppercase tracking-[0.2em]">
            Real-time monitoring
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleInsights.map((insight) => {
          const Icon = getIcon(insight.type);
          const severityColor = getSeverityColor(insight.severity);
          const severity = severityCopy[insight.severity];

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
                    {severity && (
                      <span className={cn("text-[10px] font-primary uppercase", severity.className)}>
                        {severity.label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-primary leading-relaxed text-grey-dark">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
