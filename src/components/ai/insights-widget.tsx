"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Info,
  X,
  Eye,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, type Id } from "@/lib/convexGenerated";
import Link from "next/link";

interface InsightsWidgetProps {
  churchId: Id<"churches">;
}

export function InsightsWidget({ churchId }: InsightsWidgetProps) {
  const insights = useQuery(api.aiInsights.listActiveInsights, { churchId });
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

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

  const activeInsights = insights?.filter(
    (insight) => !dismissed.has(insight._id)
  );

  if (!activeInsights || activeInsights.length === 0) {
    return (
      <Card className="border-ledger bg-paper shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-grey-mid" />
            <CardTitle className="text-ink font-primary">AI Insights</CardTitle>
          </div>
          <CardDescription className="text-grey-mid font-primary">
            No new insights at the moment
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
          </div>
          <Badge variant="secondary" className="font-primary">
            {activeInsights.length} new
          </Badge>
        </div>
        <CardDescription className="text-grey-mid font-primary">
          AI-powered financial insights and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeInsights.map((insight) => {
          const Icon = getIcon(insight.type);
          const severityColor = getSeverityColor(insight.severity);

          return (
            <div
              key={insight._id}
              className="relative rounded-lg border border-ledger bg-highlight p-4"
            >
              <button
                onClick={() => handleDismiss(insight._id)}
                className="absolute top-2 right-2 text-grey-mid hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-3 pr-6">
                <div className={`p-2 rounded-full bg-paper ${severityColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-ink font-primary text-sm">
                      {insight.title}
                    </h4>
                    <Badge
                      variant="secondary"
                      className="font-primary text-xs capitalize"
                    >
                      {insight.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-grey-dark font-primary">
                    {insight.description}
                  </p>

                  {insight.actionable && insight.actionUrl && (
                    <Link href={insight.actionUrl}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 border-ledger font-primary text-xs gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View Details
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
