"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export type FilterOption<T extends string> = {
  value: T;
  label: string;
};

interface SearchFilterBarProps<T extends string> {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filterValue: T;
  onFilterChange: (value: T) => void;
  filterOptions: FilterOption<T>[];
  className?: string;
}

export function SearchFilterBar<T extends string>({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filterValue,
  onFilterChange,
  filterOptions,
  className = "",
}: SearchFilterBarProps<T>) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      {/* Filter Pills - Left Side */}
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((option) => {
          const isActive = filterValue === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-primary transition-colors ${
                isActive
                  ? "bg-ink text-paper"
                  : "bg-paper text-grey-mid border border-ledger hover:border-ink hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Search Input - Right Side */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-mid" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 font-primary border-ledger bg-paper"
        />
      </div>
    </div>
  );
}
