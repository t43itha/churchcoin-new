"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Doc } from "@/lib/convexGenerated";
import { cn } from "@/lib/utils";

type DonorSelectProps = {
  donors: Doc<"donors">[];
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  variant?: "default" | "compact";
};

const VARIANT_STYLES: Record<NonNullable<DonorSelectProps["variant"]>, string> = {
  default: "h-11 text-sm",
  compact: "h-9 text-xs",
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    const handler = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
    };

    handler(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handler as (event: MediaQueryListEvent) => void);
      return () => mediaQuery.removeEventListener("change", handler as (event: MediaQueryListEvent) => void);
    }

    mediaQuery.addListener(handler as (event: MediaQueryListEvent) => void);
    return () => mediaQuery.removeListener(handler as (event: MediaQueryListEvent) => void);
  }, [breakpoint]);

  return isMobile;
}

export function DonorSelect({
  donors,
  value,
  onChange,
  onBlur,
  id,
  placeholder = "Anonymous donor",
  emptyLabel = "Anonymous donor",
  className,
  variant = "default",
}: DonorSelectProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const selectedDonor = useMemo(() => {
    return donors.find((donor) => donor._id === value) ?? null;
  }, [donors, value]);

  const triggerLabel = selectedDonor ? selectedDonor.name : placeholder;

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    onBlur?.();
    setOpen(false);
  };

  const renderCommandList = () => (
    <Command className="border border-ledger bg-paper">
      <CommandInput placeholder="Search donors..." className="h-11" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty className="py-6 text-sm text-grey-mid">No donors found.</CommandEmpty>
        <CommandGroup heading="Suggested donors" className="max-h-[60vh] overflow-auto">
          <CommandItem
            value="__anonymous"
            onSelect={() => handleSelect("")}
            className="text-sm"
          >
            <UserRound className="mr-2 size-4" />
            <span className="flex-1">{emptyLabel}</span>
            {!selectedDonor && <Check className="size-4 text-success" />}
          </CommandItem>
          {donors.map((donor) => {
            const isSelected = donor._id === value;
            return (
              <CommandItem
                key={donor._id}
                value={donor.name}
                onSelect={() => handleSelect(donor._id)}
                className="text-sm"
              >
                <span className="flex flex-col text-left">
                  <span className="font-medium text-ink">{donor.name}</span>
                  {donor.email ? (
                    <span className="text-xs text-grey-mid">{donor.email}</span>
                  ) : null}
                </span>
                {isSelected ? <Check className="ml-auto size-4 text-success" /> : null}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      id={id}
      className={cn(
        "border-ledger font-normal text-left text-ink hover:bg-muted/50 justify-between",
        VARIANT_STYLES[variant],
        className
      )}
    >
      <span className="truncate">
        {triggerLabel}
      </span>
      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[80vh] rounded-t-2xl border-ledger bg-paper p-0"
        >
          <SheetHeader className="border-b border-ledger">
            <SheetTitle className="text-base font-semibold text-ink">Select donor</SheetTitle>
          </SheetHeader>
          <div className="p-4 pt-2">{renderCommandList()}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent className="w-[320px] border-ledger p-0" align="start">
        {renderCommandList()}
      </PopoverContent>
    </Popover>
  );
}
