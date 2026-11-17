"use client";

import { useRef, useState } from "react";
import { type CohortOption, CohortEditor } from "@/components/cohort-editor";
import { EnabledBadge } from "@/components/enabled-badge";
import { ErrorAlert } from "@/components/error-alert";
import { NoUsersEmpty } from "@/components/no-users-empty";
import { PendingButton } from "@/components/pending-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type UserOption, UserSelect } from "@/components/user-select";
import { evaluateFlag, type EvaluateFlagResult } from "@/lib/api-client";

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
  users: UserOption[];
  cohorts: CohortOption[];
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userCohorts, setUserCohorts] = useState<string[]>([]);
  const [result, setResult] = useState<EvaluateFlagResult | null>(null);
  const [pending, setPending] = useState(false);
  // Only the latest request may show its answer; changing the inputs makes older ones stale.
  const requestRef = useRef(0);

  async function evaluate(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;
    const request = ++requestRef.current;
    setPending(true);
    const answer = await evaluateFlag(flagKey, {
      userId,
      cohorts: userCohorts,
    });
    if (request !== requestRef.current) return;
    setResult(answer);
    setPending(false);
  }

  /** Clears the shown answer and discards any in-flight one. */
  function invalidate() {
    requestRef.current++;
    setResult(null);
    setPending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Try it</h2>
        </CardTitle>
        <CardDescription>
          Evaluate this flag for a user, exactly as a client application would.
          {sticky &&
            " This flag is sticky: the first percentage result for a user is stored and reused."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <NoUsersEmpty className="p-4" />
        ) : (
          <form onSubmit={evaluate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="try-user">User</Label>
                <UserSelect
                  id="try-user"
                  users={users}
                  value={userId}
                  className="w-full"
                  onValueChange={(value) => {
                    const user = users.find((u) => u.userId === value);
                    setUserId(user?.userId ?? null);
                    setUserCohorts(user ? [...user.cohorts] : []);
                    invalidate();
                  }}
                />
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
                  invalidate();
                }}
                catalogue={cohorts}
                disabled={!userId}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <PendingButton type="submit" pending={pending} disabled={!userId}>
                Evaluate
              </PendingButton>
              {/* Always mounted, so screen readers announce each new answer. */}
              <div className="flex items-center gap-2" aria-live="polite">
                {result?.ok && (
                  <>
                    <EnabledBadge enabled={result.enabled} />
                    <span className="font-mono text-sm">{result.reason}</span>
                  </>
                )}
              </div>
            </div>
            {result && !result.ok && (
              <ErrorAlert
                title="Evaluation failed"
                description={result.error}
              />
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
