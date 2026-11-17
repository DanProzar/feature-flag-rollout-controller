import { ArrowRight, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { diffFlags, FIELD_LABELS, formatFieldValue } from "@/lib/audit-diff";
import type { AuditEntry } from "@/server";

/** "2026-01-01 00:00:00 UTC": the same on every server and browser. */
function formatAt(at: Date): string {
  return `${at.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

/** A flag's audit log, newest first, showing only the fields each change touched. */
export function AuditHistory({
  entries,
  userNames,
}: {
  entries: AuditEntry[];
  /** Seeded users' names by id, shown next to known actor ids. */
  userNames: Map<string, string>;
}) {
  const newestFirst = [...entries].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>History</h2>
        </CardTitle>
        <CardDescription>
          Every change to this flag, newest first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {newestFirst.length === 0 ? (
          <Empty className="p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <History />
              </EmptyMedia>
              <EmptyTitle>No changes recorded yet</EmptyTitle>
              <EmptyDescription>
                Every save, kill and delete will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="divide-y">
            {newestFirst.map((entry, i) => {
              const changes = diffFlags(entry.before, entry.after);
              const name = entry.actorId && userNames.get(entry.actorId);
              return (
                <li
                  key={`${entry.at.toISOString()}-${i}`}
                  className="space-y-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <time
                      dateTime={entry.at.toISOString()}
                      className="font-mono text-muted-foreground"
                    >
                      {formatAt(entry.at)}
                    </time>
                    {entry.actorId === null ? (
                      <span className="text-muted-foreground">anonymous</span>
                    ) : (
                      <span className={name ? undefined : "font-mono"}>
                        {name || entry.actorId}
                      </span>
                    )}
                    {entry.before === null && <Badge>created</Badge>}
                    {changes.length === 0 && (
                      <Badge variant="outline">no changes</Badge>
                    )}
                  </div>
                  {changes.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {changes.map(({ field, before, after }) => (
                        <li
                          key={field}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <span className="w-24 text-muted-foreground">
                            {FIELD_LABELS[field]}
                          </span>
                          {entry.before !== null && (
                            <>
                              <span className="font-mono">
                                {formatFieldValue(field, before)}
                              </span>
                              <ArrowRight className="size-3 text-muted-foreground" />
                            </>
                          )}
                          <span className="font-mono">
                            {formatFieldValue(field, after)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
