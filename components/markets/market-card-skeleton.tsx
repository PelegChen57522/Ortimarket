import { Skeleton } from "@/components/ui/skeleton";

export function MarketCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <div className="w-full space-y-2">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <div className="mt-3 space-y-2.5">
        <Skeleton className="h-3 w-7/12" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      <Skeleton className="mt-3 h-3 w-6/12" />
    </div>
  );
}
