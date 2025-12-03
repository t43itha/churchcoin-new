import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-grey-mid selection:bg-sage-light selection:text-ink dark:bg-input/30 border-ink/20 h-10 w-full min-w-0 rounded-md border bg-white px-3 py-2 text-base transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ink focus-visible:ring-ink/10 focus-visible:ring-[3px] focus-visible:shadow-[2px_2px_0px_rgba(0,0,0,0.05)]",
        "aria-invalid:ring-error/20 dark:aria-invalid:ring-error/40 aria-invalid:border-error",
        className
      )}
      {...props}
    />
  )
}

export { Input }
