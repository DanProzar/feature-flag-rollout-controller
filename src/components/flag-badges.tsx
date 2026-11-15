import { Badge } from "@/components/ui/badge";

/** One badge per cohort, or a muted dash when there are none. */
export function CohortBadges({
  cohorts,
  variant = "outline",
}: {
  cohorts: string[];
  variant?: "outline" | "destructive";
}) {
  if (cohorts.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {cohorts.map((cohort) => (
        <Badge key={cohort} variant={variant}>
          {cohort}
        </Badge>
      ))}
    </div>
  );
}
