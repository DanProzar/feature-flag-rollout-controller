import { LoadingRegion } from "@/components/loading-region";
import { Skeleton } from "@/components/ui/skeleton";

/** The demo page while it loads: heading, switcher, a five-row grid and the storefront card. */
export default function Loading() {
  return (
    <LoadingRegion className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="ml-auto h-8 w-24" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border">
          <div className="flex h-10 items-center gap-6 border-b px-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
          </div>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex h-12 items-center gap-6 border-b px-2 last:border-b-0"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </LoadingRegion>
  );
}
