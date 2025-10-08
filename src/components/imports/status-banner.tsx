"use client";

import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatusVariant = "info" | "success" | "warning" | "error";

type StatusAction = {
  label: string;
  onClick: () => void;
};

type StatusBannerProps = {
  variant: StatusVariant;
  title: string;
  description?: string;
  actions?: StatusAction[];
  onDismiss?: () => void;
};

export function StatusBanner({ variant, title, description, actions, onDismiss }: StatusBannerProps) {
  const icon = getIcon(variant);
  const classes = getClasses(variant);

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border px-4 py-4", classes.container)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", classes.icon)}>{icon}</div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-ink">{title}</p>
          {description ? <p className="text-sm text-grey-mid">{description}</p> : null}
          {actions && actions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {actions.map((action) => (
                <Button key={action.label} size="sm" variant="outline" className="border-ledger" onClick={action.onClick}>
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-grey-mid transition hover:text-ink"
            aria-label="Dismiss status"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function getIcon(variant: StatusVariant) {
  const baseClass = "h-5 w-5";
  switch (variant) {
    case "success":
      return <CheckCircle2 className={baseClass} />;
    case "warning":
      return <AlertCircle className={baseClass} />;
    case "error":
      return <XCircle className={baseClass} />;
    default:
      return <Info className={baseClass} />;
  }
}

function getClasses(variant: StatusVariant) {
  switch (variant) {
    case "success":
      return {
        container: "border-success/40 bg-success/10",
        icon: "bg-success/20 text-success",
      };
    case "warning":
      return {
        container: "border-amber-300 bg-amber-50",
        icon: "bg-amber-100 text-amber-700",
      };
    case "error":
      return {
        container: "border-error/40 bg-error/10",
        icon: "bg-error/20 text-error",
      };
    default:
      return {
        container: "border-ledger bg-highlight/50",
        icon: "bg-highlight text-ink",
      };
  }
}
