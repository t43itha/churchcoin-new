"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type HeroMetricTrendDirection = "up" | "down" | "flat";

export interface HeroMetricTrend {
  direction: HeroMetricTrendDirection;
  valueLabel: string;
  comparisonLabel: string;
}

export type HeroMetricStatus = "healthy" | "warning" | "critical";

const STATUS_STYLES: Record<HeroMetricStatus, string> = {
  healthy: "border-success/40 bg-success/5 text-success",
  warning: "border-amber-500/50 bg-amber-100/60 text-amber-700",
  critical: "border-error/50 bg-error/10 text-error",
};

const STATUS_LABELS: Record<HeroMetricStatus, string> = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
};

export interface HeroMetricCardProps {
  title: string;
  value: string;
  description?: string;
  trend?: HeroMetricTrend;
  status?: HeroMetricStatus;
  statusLabel?: string;
}

export function HeroMetricCard({
  title,
  value,
  description,
  trend,
  status,
  statusLabel,
}: HeroMetricCardProps) {
  return (
    <Card className="border-ledger bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-wrap items-start justify-between gap-4 pb-2">
        <div className="space-y-1">
          <CardTitle className="font-primary text-[11px] uppercase tracking-[0.2em] text-grey-mid">
            {title}
          </CardTitle>
          <div className="text-3xl font-semibold text-ink">{value}</div>
        </div>
        {status && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[11px] font-medium uppercase",
              STATUS_STYLES[status]
            )}
          >
            {statusLabel ?? STATUS_LABELS[status]}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {trend && (
          <div className="flex items-baseline gap-2 text-sm font-primary">
            <span
              className={cn(
                "font-semibold",
                trend.direction === "up" && "text-success",
                trend.direction === "down" && "text-error",
                trend.direction === "flat" && "text-grey-mid"
              )}
            >
              {trend.direction === "up" && "↑"}
              {trend.direction === "down" && "↓"}
              {trend.direction === "flat" && "→"} {trend.valueLabel}
            </span>
            <span className="text-xs text-grey-mid">{trend.comparisonLabel}</span>
          </div>
        )}
        {description && (
          <p className="text-xs leading-relaxed text-grey-dark">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
