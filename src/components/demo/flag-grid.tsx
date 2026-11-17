import { Flag } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type DemoEvaluation, sortFlagKeys } from "@/lib/demo";

/** Every stored flag's answer for the selected user, one row per flag, sorted by key. */
export function FlagGrid({
  flagKeys,
  evaluations,
}: {
  flagKeys: string[];
  evaluations: Record<string, DemoEvaluation>;
}) {
  if (flagKeys.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Flag />
          </EmptyMedia>
          <EmptyTitle>No flags</EmptyTitle>
          <EmptyDescription>
            Create one in the admin or run{" "}
            <code className="font-mono">npm run seed</code>.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flag</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortFlagKeys(flagKeys).map((key) => (
            <FlagRow
              key={key}
              flagKey={key}
              evaluation={evaluations[key] ?? { status: "loading" }}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FlagRow({
  flagKey,
  evaluation,
}: {
  flagKey: string;
  evaluation: DemoEvaluation;
}) {
  return (
    <TableRow aria-busy={evaluation.status === "loading" || undefined}>
      <TableCell className="font-medium">
        <Link
          href={`/flags/${encodeURIComponent(flagKey)}`}
          className="underline-offset-4 hover:underline"
        >
          {flagKey}
        </Link>
      </TableCell>
      {evaluation.status === "loading" ? (
        <>
          <TableCell>
            <Skeleton className="h-5 w-10" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
        </>
      ) : evaluation.status === "error" ? (
        <>
          <TableCell>
            <Badge variant="destructive">Error</Badge>
          </TableCell>
          <TableCell className="text-sm whitespace-normal text-destructive">
            {evaluation.error}
          </TableCell>
        </>
      ) : (
        <>
          <TableCell>
            <Badge
              className={
                evaluation.enabled
                  ? "bg-emerald-600 text-white"
                  : "bg-red-600 text-white"
              }
            >
              {evaluation.enabled ? "on" : "off"}
            </Badge>
          </TableCell>
          <TableCell className="font-mono text-sm">
            {evaluation.reason}
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
