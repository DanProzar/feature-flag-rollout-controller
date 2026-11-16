"use client";

import { useState } from "react";
import { type CohortOption, CohortEditor } from "@/components/cohort-editor";
import { ErrorAlert } from "@/components/error-alert";
import { PendingButton } from "@/components/pending-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { evaluateFlag, type EvaluateFlagResult } from "@/lib/api-client";

export interface TryItUser {
  userId: string;
  name: string;
  cohorts: string[];
}

/**
 * Evaluates the flag for a seeded user through the real evaluate endpoint, sending the user's id
 * as `X-User-Id`. The cohorts start as the user's own and can be changed for this evaluation only.
 */
export function TryIt({
  flagKey,
  sticky,
  users,
  cohorts,
}: {
  flagKey: string;
  sticky: boolean;
  users: TryItUser[];
  cohorts: CohortOption[];
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userCohorts, setUserCohorts] = useState<string[]>([]);
  const [result, setResult] = useState<EvaluateFlagResult | null>(null);
  const [pending, setPending] = useState(false);

  const items = users.map((user) => ({ value: user.userId, label: user.name }));
  const selected = users.find((user) => user.userId === userId);

  async function evaluate(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;
    setPending(true);
    setResult(await evaluateFlag(flagKey, { userId, cohorts: userCohorts }));
    setPending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Try it</CardTitle>
        <CardDescription>
          Evaluate this flag for a user, exactly as a client application would.
          {sticky &&
            " This flag is sticky: the first percentage result for a user is stored and reused."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={evaluate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="try-user">User</Label>
              <Select
                items={items}
                value={userId}
                onValueChange={(value) => {
                  const user = users.find((u) => u.userId === value);
                  setUserId(user?.userId ?? null);
                  setUserCohorts(user ? [...user.cohorts] : []);
                  setResult(null);
                }}
              >
                <SelectTrigger id="try-user" className="w-full">
                  <SelectValue>
                    {() =>
                      selected ? (
                        selected.name
                      ) : (
                        <span className="text-muted-foreground">
                          Select a user
                        </span>
                      )
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.userId} value={user.userId}>
                      {user.name}
                      <UserCohorts cohorts={user.cohorts} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="try-user-id">User id</Label>
              <Input
                id="try-user-id"
                value={userId ?? ""}
                readOnly
                tabIndex={-1}
                placeholder="Pick a user"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="try-cohorts">Cohorts</Label>
            <CohortEditor
              id="try-cohorts"
              value={userCohorts}
              onChange={(next) => {
                setUserCohorts(next);
                setResult(null);
              }}
              catalogue={cohorts}
              disabled={!userId}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PendingButton type="submit" pending={pending} disabled={!userId}>
              Evaluate
            </PendingButton>
            {result?.ok && (
              <div className="flex items-center gap-2" aria-live="polite">
                <Badge
                  className={
                    result.enabled
                      ? "bg-emerald-600 text-white"
                      : "bg-red-600 text-white"
                  }
                >
                  {result.enabled ? "true" : "false"}
                </Badge>
                <span className="font-mono text-sm">{result.reason}</span>
              </div>
            )}
          </div>
          {result && !result.ok && (
            <ErrorAlert title="Evaluation failed" description={result.error} />
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/** A user's cohorts as small badges in a select option, or "no cohorts". */
function UserCohorts({ cohorts }: { cohorts: string[] }) {
  if (cohorts.length === 0) {
    return <span className="text-xs text-muted-foreground">no cohorts</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {cohorts.map((cohort) => (
        <Badge key={cohort} variant="outline" className="font-mono">
          {cohort}
        </Badge>
      ))}
    </span>
  );
}
