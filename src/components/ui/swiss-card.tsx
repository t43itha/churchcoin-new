"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwissCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the card is interactive (adds hover effects)
   * @default false
   */
  interactive?: boolean;
  /**
   * Whether to show the step number indicator
   */
  stepNumber?: number;
  /**
   * Shadow variant
   * @default "sm"
   */
  shadow?: "none" | "sm" | "md" | "lg" | "amber";
  /**
   * Border style
   * @default "default"
   */
  border?: "none" | "default" | "thick";
  /**
   * Card variant for different contexts
   * @default "default"
   */
  variant?: "default" | "metric" | "highlighted";
}

/**
 * SwissCard - Swiss Ledger style card component
 *
 * Features hard shadows, lift effects on hover, and step number indicators.
 * Designed for the ChurchCoin app's Swiss Ledger aesthetic.
 *
 * @example
 * <SwissCard interactive>
 *   <SwissCardHeader>
 *     <SwissCardTitle>Fund Balance</SwissCardTitle>
 *   </SwissCardHeader>
 *   <SwissCardContent>£12,450.00</SwissCardContent>
 * </SwissCard>
 */
const SwissCard = React.forwardRef<HTMLDivElement, SwissCardProps>(
  (
    {
      className,
      interactive = false,
      stepNumber,
      shadow = "sm",
      border = "default",
      variant = "default",
      children,
      ...props
    },
    ref
  ) => {
    const shadowClasses = {
      none: "",
      sm: "shadow-hard-sm",
      md: "shadow-hard-md",
      lg: "shadow-hard-lg",
      amber: "shadow-hard-amber",
    };

    const borderClasses = {
      none: "border-0",
      default: "border border-ink",
      thick: "border-2 border-ink",
    };

    const variantClasses = {
      default: "bg-white",
      metric: "bg-white",
      highlighted: "bg-amber-light border-amber",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "swiss-card rounded-lg p-6",
          borderClasses[border],
          variantClasses[variant],
          interactive && [
            "swiss-card-interactive cursor-pointer",
            shadowClasses[shadow],
          ],
          !interactive && shadow !== "none" && shadowClasses[shadow],
          className
        )}
        {...props}
      >
        {stepNumber !== undefined && (
          <div className="flex items-start justify-between mb-4">
            <span className="swiss-step-number-active flex items-center justify-center w-8 h-8 text-sm font-semibold">
              {String(stepNumber).padStart(2, "0")}
            </span>
          </div>
        )}
        {children}
      </div>
    );
  }
);
SwissCard.displayName = "SwissCard";

const SwissCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
));
SwissCardHeader.displayName = "SwissCardHeader";

const SwissCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "swiss-label text-xs font-semibold uppercase tracking-widest text-grey-mid",
      className
    )}
    {...props}
  />
));
SwissCardTitle.displayName = "SwissCardTitle";

const SwissCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-grey-mid", className)}
    {...props}
  />
));
SwissCardDescription.displayName = "SwissCardDescription";

const SwissCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-2", className)} {...props} />
));
SwissCardContent.displayName = "SwissCardContent";

const SwissCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4 border-t border-ledger mt-4", className)}
    {...props}
  />
));
SwissCardFooter.displayName = "SwissCardFooter";

const SwissCardValue = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-3xl font-bold font-[family-name:var(--font-mono)] text-ink",
      className
    )}
    {...props}
  />
));
SwissCardValue.displayName = "SwissCardValue";

export {
  SwissCard,
  SwissCardHeader,
  SwissCardTitle,
  SwissCardDescription,
  SwissCardContent,
  SwissCardFooter,
  SwissCardValue,
};
