import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden bg-accent rounded-md",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent",
        "before:animate-shimmer dark:before:via-white/10",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }