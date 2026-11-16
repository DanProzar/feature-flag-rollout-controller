import { LoadingRegion } from "@/components/loading-region";
import { Skeleton } from "@/components/ui/skeleton";

/** The users page while it loads: heading, then a table with five rows. */
export default function Loading() {
  return (
    <LoadingRegion className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="rounded-lg border">
        <div className="flex h-10 items-center gap-6 border-b px-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="flex h-14 items-center gap-6 border-b px-2 last:border-b-0"
          >
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
