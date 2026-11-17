"use client";

import { RefreshCw, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { selectDemoUser } from "@/app/demo/actions";
import { type ActorOption, ActorSelect } from "@/components/actor-select";
import { FlagGrid } from "@/components/demo/flag-grid";
import { Storefront } from "@/components/demo/storefront";
import { ErrorAlert } from "@/components/error-alert";
import { CohortBadges } from "@/components/flag-badges";
import { PendingButton } from "@/components/pending-button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { evaluateFlag } from "@/lib/api-client";
import {
  type DemoEvaluation,
  storefrontModel,
  toDemoEvaluation,
} from "@/lib/demo";

// Behaves like a client application: every stored flag is evaluated for the selected user through
// the public evaluate endpoint, in parallel, on mount, on switch and on Refresh. Each round is a
// "run"; answers from an older run (e.g. a user switched away from) are discarded.

interface Results {
  run: number;
  byKey: Record<string, DemoEvaluation>;
}

export function DemoPage({
  flags,
  users,
  selectedUserId,
}: {
  flags: { key: string }[];
  users: ActorOption[];
  selectedUserId: string | null;
}) {
  const [userId, setUserId] = useState(selectedUserId);
  const [run, setRun] = useState(0);
  const [results, setResults] = useState<Results>({ run: -1, byKey: {} });
  const [rememberFailed, setRememberFailed] = useState(false);
  const [, startTransition] = useTransition();
  const runRef = useRef(0);
  const startedRef = useRef(false);

  // The server re-renders after the cookie is set; a user missing from fresh props falls back.
  const user = users.find((u) => u.userId === userId) ?? users[0] ?? null;
  const flagKeys = flags.map(({ key }) => key);
  const evaluations = results.run === run ? results.byKey : {};
  const pending =
    user !== null && flagKeys.some((key) => !(key in evaluations));

  const evaluate = useCallback(
    (target: ActorOption, keys: string[], forRun: number) => {
      const ctx = { userId: target.userId, cohorts: target.cohorts };
      for (const key of keys) {
        void evaluateFlag(key, ctx).then((result) => {
          if (runRef.current !== forRun) return;
          setResults((prev) => ({
            run: forRun,
            byKey: {
              ...(prev.run === forRun ? prev.byKey : {}),
              [key]: toDemoEvaluation(result),
            },
          }));
        });
      }
    },
    [],
  );

  function start(target: ActorOption) {
    const next = runRef.current + 1;
    runRef.current = next;
    setRun(next);
    evaluate(target, flagKeys, next);
  }

  // The first run, once (refs survive Strict Mode's effect replay, so no duplicate requests).
  const initial = useRef({ user, flagKeys });
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const { user: first, flagKeys: keys } = initial.current;
    if (first) evaluate(first, keys, 0);
  }, [evaluate]);

  function selectUser(nextId: string) {
    const next = users.find((u) => u.userId === nextId);
    if (!next || next.userId === user?.userId) return;
    setUserId(next.userId);
    setRememberFailed(false);
    start(next);
    startTransition(async () => {
      const result = await selectDemoUser(next.userId).catch(() => null);
      if (!result?.ok) startTransition(() => setRememberFailed(true));
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Demo</h1>
        <p className="text-sm text-muted-foreground">
          A client application calling the evaluate endpoint for every flag.
          Change a flag in the admin, then Refresh to see the storefront follow.
        </p>
      </div>

      {user === null ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No users</EmptyTitle>
            <EmptyDescription>
              Run <code className="font-mono">npm run seed</code> to add the
              demo users.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <ActorSelect
              users={users}
              value={user.userId}
              onValueChange={selectUser}
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <CohortBadges cohorts={user.cohorts} />
              <Link
                href="/users"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Edit cohorts
              </Link>
            </div>
            <PendingButton
              variant="outline"
              className="ml-auto"
              pending={pending}
              onClick={() => start(user)}
            >
              <RefreshCw />
              Refresh
            </PendingButton>
          </div>
          {rememberFailed && (
            <ErrorAlert
              title="Could not remember the selected user"
              onDismiss={() => setRememberFailed(false)}
            />
          )}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          {user !== null && (
            <FlagGrid flagKeys={flagKeys} evaluations={evaluations} />
          )}
        </div>
        <Storefront model={storefrontModel(evaluations)} />
      </div>
    </div>
  );
}
