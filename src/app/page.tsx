import { Plus } from "lucide-react";
import Link from "next/link";
import { CohortBadges } from "@/components/flag-badges";
import { KillSwitch } from "@/components/kill-switch";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServices } from "@/server";

export const dynamic = "force-dynamic";

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
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No flags yet. Create one to start a rollout.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Rollout</TableHead>
                <TableHead>Sticky</TableHead>
                <TableHead>Include</TableHead>
                <TableHead>Exclude</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((flag) => (
                <TableRow key={flag.key}>
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
                  <TableCell>
                    {flag.sticky ? (
                      <Badge variant="outline">Sticky</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <CohortBadges cohorts={flag.includeCohorts} />
                  </TableCell>
                  <TableCell>
                    <CohortBadges
                      cohorts={flag.excludeCohorts}
                      variant="destructive"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
