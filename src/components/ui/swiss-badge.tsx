import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "neutral"
  | "fund-general"
  | "fund-restricted"
  | "fund-designated";

interface SwissBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Badge variant determines the color scheme
   * @default "neutral"
   */
  variant?: BadgeVariant;
  /**
   * Size of the badge
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
}

/**
 * SwissBadge - Swiss Ledger style badge component
 *
 * Status badges with pill shape and uppercase text.
 * Includes fund type variants for General, Restricted, and Designated funds.
 *
 * @example
 * <SwissBadge variant="success">Healthy</SwissBadge>
 * <SwissBadge variant="fund-general">General</SwissBadge>
 * <SwissBadge variant="warning">Pending</SwissBadge>
 */
const SwissBadge = React.forwardRef<HTMLSpanElement, SwissBadgeProps>(
  ({ className, variant = "neutral", size = "md", ...props }, ref) => {
    const variantClasses: Record<BadgeVariant, string> = {
      success: "swiss-badge-success",
      warning: "swiss-badge-warning",
      error: "swiss-badge-error",
      neutral: "swiss-badge-neutral",
      "fund-general": "swiss-badge-fund-general",
      "fund-restricted": "swiss-badge-fund-restricted",
      "fund-designated": "swiss-badge-fund-designated",
    };

    const sizeClasses = {
      sm: "px-2 py-0.5 text-[10px]",
      md: "px-3 py-1 text-xs",
      lg: "px-4 py-1.5 text-sm",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "swiss-badge inline-flex items-center font-semibold",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
SwissBadge.displayName = "SwissBadge";

/**
 * FundTypeBadge - Convenience component for fund type badges
 */
interface FundTypeBadgeProps extends Omit<SwissBadgeProps, "variant"> {
  fundType: "general" | "restricted" | "designated";
}

const FundTypeBadge = React.forwardRef<HTMLSpanElement, FundTypeBadgeProps>(
  ({ fundType, ...props }, ref) => {
    const variantMap: Record<string, BadgeVariant> = {
      general: "fund-general",
      restricted: "fund-restricted",
      designated: "fund-designated",
    };

    const labelMap = {
      general: "General",
      restricted: "Restricted",
      designated: "Designated",
    };

    return (
      <SwissBadge ref={ref} variant={variantMap[fundType]} {...props}>
        {labelMap[fundType]}
      </SwissBadge>
    );
  }
);
FundTypeBadge.displayName = "FundTypeBadge";

/**
 * StatusBadge - Convenience component for status badges
 */
interface StatusBadgeProps extends Omit<SwissBadgeProps, "variant"> {
  status: "healthy" | "warning" | "critical" | "pending" | "neutral";
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, children, ...props }, ref) => {
    const variantMap: Record<string, BadgeVariant> = {
      healthy: "success",
      warning: "warning",
      critical: "error",
      pending: "warning",
      neutral: "neutral",
    };

    const defaultLabels: Record<string, string> = {
      healthy: "Healthy",
      warning: "Warning",
      critical: "Critical",
      pending: "Pending",
      neutral: "Neutral",
    };

    return (
      <SwissBadge ref={ref} variant={variantMap[status]} {...props}>
        {children || defaultLabels[status]}
      </SwissBadge>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { SwissBadge, FundTypeBadge, StatusBadge };
