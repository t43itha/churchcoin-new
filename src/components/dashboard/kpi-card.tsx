"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useId } from "react";
import type { ComponentProps } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

export interface TrendPoint {
  label: string;
  value: number;
}

export interface KpiDelta {
  value: number;
  percentage?: number;
  isPositive: boolean;
  comparisonLabel?: string;
}

export interface KpiCardProps extends ComponentProps<typeof Card> {
  title: string;
  value: string;
  subtitle?: string;
  delta?: KpiDelta;
  sparkline?: TrendPoint[];
  badge?: string;
  status?: "positive" | "negative" | "neutral";
  onOpenDetails?: () => void;
}

export function KpiCard({
  title,
  value,
  subtitle,
  delta,
  sparkline,
  badge,
  status = "neutral",
  onOpenDetails,
  className,
  ...cardProps
}: KpiCardProps) {
  const gradientId = useId();
  const deltaColor = delta
    ? delta.isPositive
      ? "text-success"
      : "text-error"
    : "text-grey-mid";

  return (
    <motion.div
      layout
      layoutRoot
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        {...cardProps}
        role={onOpenDetails ? "button" : undefined}
        tabIndex={onOpenDetails ? 0 : undefined}
        onClick={onOpenDetails}
        onKeyDown={(event) => {
          if (!onOpenDetails) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenDetails();
          }
        }}
        className={cn(
          "group relative overflow-hidden border-ledger bg-paper transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
          onOpenDetails && "cursor-pointer hover:shadow-lg",
          className
        )}
      >
        <CardHeader className="space-y-3 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-primary uppercase tracking-wide text-grey-mid">
                {title}
              </CardTitle>
              {subtitle && (
                <p className="mt-1 text-xs font-primary text-grey-mid">{subtitle}</p>
              )}
            </div>
            {badge && (
              <Badge
                variant="secondary"
                className="font-primary text-xs uppercase tracking-wide"
              >
                {badge}
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-3">
            <motion.span
              aria-live="polite"
              className={cn(
                "text-3xl font-semibold leading-none text-ink transition-colors",
                status === "positive" && "text-success",
                status === "negative" && "text-error"
              )}
              key={value}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {value}
            </motion.span>
            {delta && (
              <motion.div
                className={cn("flex items-center gap-1 text-xs font-primary", deltaColor)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
              >
                {delta.isPositive ? (
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                )}
                <span className="font-medium">
                  {delta.value > 0 ? `£${delta.value.toLocaleString()}` : `${delta.value}`}
                </span>
                {typeof delta.percentage === "number" && (
                  <span>({delta.percentage.toFixed(1)}%)</span>
                )}
                {delta.comparisonLabel && (
                  <span className="text-grey-mid">{delta.comparisonLabel}</span>
                )}
              </motion.div>
            )}
          </div>
        </CardHeader>
        <CardContent className="mt-6">
          <div className="h-16">
            {sparkline && sparkline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkline}>
                  <defs>
                    <linearGradient id={`${gradientId}-sparkline`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#0A5F38" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0A5F38" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={status === "negative" ? "#8B0000" : "#0A5F38"}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#${gradientId}-sparkline)`}
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-ledger text-xs font-primary text-grey-mid">
                No trend data
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
