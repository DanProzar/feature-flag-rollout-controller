import { Flag, Plus } from "lucide-react";
import Link from "next/link";
import { DeleteFlagButton } from "@/components/delete-flag-button";
import { CohortBadges } from "@/components/flag-badges";
import { KillSwitch } from "@/components/kill-switch";
import { LinkRow } from "@/components/link-row";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServices } from "@/server";

export default async function FlagsPage() {
  const flags = await (await getServices()).flags.list();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Flags</h1>
        <Link href="/flags/new" className={buttonVariants()}>
          <Plus />
          New flag
        </Link>
      </div>

      {flags.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Flag />
            </EmptyMedia>
            <EmptyTitle>No flags yet</EmptyTitle>
            <EmptyDescription>
              Create a flag to start a rollout.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/flags/new" className={buttonVariants()}>
              <Plus />
              New flag
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Rollout</TableHead>
                <TableHead className="hidden sm:table-cell">Sticky</TableHead>
                <TableHead className="hidden sm:table-cell">Include</TableHead>
                <TableHead className="hidden sm:table-cell">Exclude</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((flag) => (
                <LinkRow key={flag.key} href={`/flags/${flag.key}`}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/flags/${flag.key}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {flag.key}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <KillSwitch flag={flag} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {flag.percentage}%
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {flag.sticky ? (
                      <Badge variant="outline">Sticky</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <CohortBadges cohorts={flag.includeCohorts} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <CohortBadges
                      cohorts={flag.excludeCohorts}
                      variant="destructive"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteFlagButton flagKey={flag.key} />
                  </TableCell>
                </LinkRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
