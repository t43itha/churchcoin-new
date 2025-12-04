"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const STORAGE_PREFIX = "churchcoin-dashboard-section";

/**
 * CollapsibleSection - Swiss Ledger styled collapsible section
 *
 * Features:
 * - Hard border with Swiss styling
 * - Sage accent on hover
 * - Smooth collapse animation
 */
export function CollapsibleSection({
  id,
  title,
  description,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}:${id}`);
    if (stored === "open") {
      setIsOpen(true);
    }
    if (stored === "closed") {
      setIsOpen(false);
    }
  }, [id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      `${STORAGE_PREFIX}:${id}`,
      isOpen ? "open" : "closed"
    );
  }, [id, isOpen]);

  return (
    <section className="rounded-lg border border-ink/20 bg-white overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors",
          "hover:bg-sage-light/50",
          isOpen && "border-b border-ink/10"
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {/* Chevron with sage accent */}
          <span className={cn(
            "flex items-center justify-center w-6 h-6 rounded transition-colors",
            isOpen ? "bg-sage text-white" : "bg-ledger text-grey-mid"
          )}>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden />
            )}
          </span>
          <div>
            <h2 className="swiss-label text-xs font-semibold uppercase tracking-widest text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-grey-mid">{description}</p>
            )}
          </div>
        </div>
        <span className={cn(
          "text-xs uppercase tracking-wider font-medium transition-colors",
          isOpen ? "text-sage" : "text-grey-mid"
        )}>
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>

      {/* Content */}
      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0">
          <div className="space-y-6 px-5 py-6">{children}</div>
        </div>
      </div>
    </section>
  );
}
