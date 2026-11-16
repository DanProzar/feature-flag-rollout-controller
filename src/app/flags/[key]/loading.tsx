import { FormSkeleton } from "@/components/form-skeleton";
import { LoadingRegion } from "@/components/loading-region";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** The flag page while it loads: key and switch, the two cards, then the history. */
export default function Loading() {
  return (
    <LoadingRegion className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-20" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-6">
            <FormSkeleton />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </CardContent>
      </Card>
    </LoadingRegion>
  );
}
