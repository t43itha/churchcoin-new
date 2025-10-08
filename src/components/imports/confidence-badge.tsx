import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, User, Key } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfidenceLevel = "high" | "medium" | "low" | "none";
type DetectionSource = "keyword" | "ai" | "feedback" | "manual" | "none";

interface ConfidenceBadgeProps {
  confidence?: number;
  source?: DetectionSource;
  showPercentage?: boolean;
  className?: string;
}

function getConfidenceLevel(confidence?: number): ConfidenceLevel {
  if (!confidence || confidence === 0) return "none";
  if (confidence >= 0.95) return "high";
  if (confidence >= 0.7) return "medium";
  return "low";
}

function getSourceIcon(source?: DetectionSource) {
  switch (source) {
    case "keyword":
      return <Key className="h-3 w-3" />;
    case "ai":
      return <Sparkles className="h-3 w-3" />;
    case "feedback":
      return <CheckCircle2 className="h-3 w-3" />;
    case "manual":
      return <User className="h-3 w-3" />;
    default:
      return null;
  }
}

function getSourceLabel(source?: DetectionSource): string {
  switch (source) {
    case "keyword":
      return "Keyword";
    case "ai":
      return "AI";
    case "feedback":
      return "Learned";
    case "manual":
      return "Manual";
    default:
      return "None";
  }
}

export function ConfidenceBadge({
  confidence,
  source = "none",
  showPercentage = true,
  className,
}: ConfidenceBadgeProps) {
  const level = getConfidenceLevel(confidence);
  const icon = getSourceIcon(source);
  const sourceLabel = getSourceLabel(source);

  if (level === "none") {
    return null;
  }

  const styles = {
    high: "border-success/40 bg-success/10 text-success",
    medium: "border-[#D4A574] bg-highlight text-grey-dark",
    low: "border-ledger bg-grey-light/20 text-grey-mid",
  };

  const percentage = confidence ? Math.round(confidence * 100) : 0;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-primary text-xs font-medium gap-1",
        styles[level],
        className
      )}
    >
      {icon}
      {sourceLabel}
      {showPercentage && confidence && (
        <span className="font-mono">{percentage}%</span>
      )}
    </Badge>
  );
}

export function AutoDetectedIndicator({ detected = false }: { detected?: boolean }) {
  if (!detected) return null;

  return (
    <div className="inline-flex items-center gap-1 text-xs text-success">
      <CheckCircle2 className="h-3 w-3" />
      <span className="font-medium">Auto-detected</span>
    </div>
  );
}
