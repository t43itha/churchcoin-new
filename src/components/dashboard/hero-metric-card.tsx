"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TypewriterNumber } from "@/components/ui/typewriter-number";
import { cn } from "@/lib/utils";

export type HeroMetricTrendDirection = "up" | "down" | "flat";

export interface HeroMetricTrend {
  direction: HeroMetricTrendDirection;
  valueLabel: string;
  comparisonLabel: string;
}

export type HeroMetricStatus = "healthy" | "warning" | "critical";

// Swiss Ledger status styles using sage/amber/error
const STATUS_STYLES: Record<HeroMetricStatus, string> = {
  healthy: "bg-sage-light text-sage-dark border-sage",
  warning: "bg-amber-light text-amber-dark border-amber",
  critical: "bg-error-light text-error border-error",
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
  stepNumber?: number;
  useTypewriter?: boolean;
  prefix?: string;
  suffix?: string;
}

/**
 * HeroMetricCard - Swiss Ledger styled metric card
 *
 * Features:
 * - Hard shadow with lift effect on hover
 * - Step number indicator
 * - Typewriter animation for values
 * - Sage/amber/error status badges
 */
export function HeroMetricCard({
  title,
  value,
  description,
  trend,
  status,
  statusLabel,
  stepNumber,
  useTypewriter = false,
  prefix = "",
  suffix = "",
}: HeroMetricCardProps) {
  return (
    <Card className="swiss-card swiss-card-interactive bg-white border border-ink transition-all duration-200">
      <CardHeader className="relative pb-2 pt-4">
        <div className="flex items-start justify-between gap-4">
          {/* Step Number */}
          {stepNumber !== undefined && (
            <span className="swiss-step-number-active flex items-center justify-center w-8 h-8 text-sm font-semibold shrink-0">
              {String(stepNumber).padStart(2, "0")}
            </span>
          )}

          {/* Status Badge */}
          {status && (
            <span
              className={cn(
                "swiss-badge text-[10px] font-semibold uppercase tracking-wider shrink-0",
                STATUS_STYLES[status]
              )}
            >
              {statusLabel ?? STATUS_LABELS[status]}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="mt-3">
          <p className="swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid mb-2">
            {title}
          </p>

          {/* Value - with optional typewriter effect */}
          <div className="text-3xl font-bold text-ink">
            {useTypewriter ? (
              <TypewriterNumber
                value={value}
                prefix={prefix}
                suffix={suffix}
                showCursor={true}
              />
            ) : (
              <span className="font-[family-name:var(--font-mono)]">
                {prefix}{value}{suffix}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-0 pb-4">
        {/* Trend */}
        {trend && (
          <div className="flex items-baseline gap-2 text-sm">
            <span
              className={cn(
                "font-semibold font-[family-name:var(--font-mono)]",
                trend.direction === "up" && "text-sage",
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

        {/* Description */}
        {description && (
          <p className="text-sm leading-relaxed text-grey-mid">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default HeroMetricCard;
