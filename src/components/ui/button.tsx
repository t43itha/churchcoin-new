import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ink focus-visible:ring-ink/20 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-ink text-white hover:bg-ink/90 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_#d4a574] hover:-translate-x-0.5 hover:-translate-y-0.5",
        destructive:
          "bg-error text-white hover:bg-error/90 focus-visible:ring-error/20 dark:focus-visible:ring-error/40",
        outline:
          "border border-ink/20 bg-white shadow-xs hover:bg-ink/5 hover:border-ink hover:text-ink dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-sage-light text-sage-dark hover:bg-sage-light/80 border border-sage",
        ghost:
          "hover:bg-ink/5 hover:text-ink dark:hover:bg-accent/50",
        link: "text-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
