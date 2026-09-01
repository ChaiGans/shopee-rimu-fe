import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-[var(--rimu-badge-gap)] rounded-full border border-border px-[var(--rimu-badge-padding-x)] py-[var(--rimu-badge-padding-y)] text-[length:var(--rimu-badge-font-size)] font-[var(--rimu-badge-font-weight)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&>svg]:size-[var(--rimu-badge-icon-size)] [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        pending: "border-status-pending-border bg-status-pending text-status-pending-foreground",
        queued: "border-status-queued-border bg-status-queued text-status-queued-foreground [&>[data-icon=inline-start]]:animate-spin",
        running: "border-status-running-border bg-status-running text-status-running-foreground [&>[data-icon=inline-start]]:animate-spin",
        succeeded: "border-status-succeeded-border bg-status-succeeded text-status-succeeded-foreground",
        failed: "border-status-failed-border bg-status-failed text-status-failed-foreground",
        cancelled: "border-status-cancelled-border bg-status-cancelled text-status-cancelled-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
