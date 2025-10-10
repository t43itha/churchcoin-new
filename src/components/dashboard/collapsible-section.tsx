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
    <section className="rounded-xl border border-ledger bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-grey-mid" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 text-grey-mid" aria-hidden />
          )}
          <div>
            <h2 className="font-primary text-sm font-semibold uppercase tracking-[0.2em] text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs font-primary text-grey-mid">{description}</p>
            )}
          </div>
        </div>
        <span className="text-xs font-primary uppercase text-grey-mid">
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>
      <div
        className={cn(
          "grid overflow-hidden border-t border-ledger transition-all duration-200",
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
