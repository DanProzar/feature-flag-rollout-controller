import { FormSkeleton } from "@/components/form-skeleton";
import { LoadingRegion } from "@/components/loading-region";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** The create form while it loads. */
export default function Loading() {
  return (
    <LoadingRegion>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <Skeleton className="h-7 w-28" />
        </CardHeader>
        <CardContent className="space-y-6">
          <FormSkeleton />
        </CardContent>
      </Card>
    </LoadingRegion>
  );
}
