import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-muted text-muted-foreground",
      critical: "bg-destructive/15 text-destructive",
      high: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
      medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      low: "bg-muted text-muted-foreground",
      opportunity: "bg-accent/15 text-accent",
      success: "bg-success/15 text-success",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function severityToVariant(severity: string): "critical" | "high" | "medium" | "low" | "opportunity" {
  switch (severity) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "high";
    case "MEDIUM":
      return "medium";
    case "OPPORTUNITY":
      return "opportunity";
    default:
      return "low";
  }
}
