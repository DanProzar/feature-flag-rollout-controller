import { Skeleton } from "@/components/ui/skeleton";

/** Label + control blocks shaped like the flag form. */
export function FormSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-8 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-8 w-24" />
    </>
  );
}
