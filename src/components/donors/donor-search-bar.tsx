"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DonorSearchBarProps = {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
};

const DEBOUNCE_MS = 300;

export function DonorSearchBar({
  onSearch,
  placeholder = "Search donors...",
  className,
}: DonorSearchBarProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      onSearch(value.trim());
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [value, onSearch]);

  const showClear = useMemo(() => value.length > 0, [value]);

  return (
    <div
      className={cn(
        "relative flex items-center",
        "rounded-md border border-ledger bg-paper",
        "shadow-sm transition focus-within:border-ink",
        className,
      )}
    >
      <Search className="pointer-events-none ml-3 h-4 w-4 text-grey-mid" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="h-10 flex-1 border-0 bg-transparent pl-3 pr-10 font-mono text-sm text-ink focus-visible:ring-0"
      />
      {showClear ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear donor search"
          className="mr-2 rounded-full p-1 text-grey-mid transition hover:bg-ledger hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
