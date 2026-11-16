import { LoadingRegion } from "@/components/loading-region";
import { Skeleton } from "@/components/ui/skeleton";

/** The flags list while it loads: title and button, table header and five rows. */
export default function Loading() {
  return (
    <LoadingRegion className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="rounded-lg border">
        <div className="flex h-10 items-center gap-6 border-b px-2">
          {["w-16", "w-14", "w-14", "w-12", "w-16", "w-16"].map((width, i) => (
            <Skeleton key={i} className={`h-4 ${width}`} />
          ))}
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="flex h-12 items-center gap-6 border-b px-2 last:border-b-0"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="hidden h-5 w-32 sm:block" />
            <Skeleton className="ml-auto size-6" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
