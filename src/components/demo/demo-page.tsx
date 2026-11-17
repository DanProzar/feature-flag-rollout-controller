"use client";

import { RefreshCw } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { selectDemoUser } from "@/app/demo/actions";
import { ActorSelect } from "@/components/actor-select";
import { FlagGrid } from "@/components/demo/flag-grid";
import { Storefront } from "@/components/demo/storefront";
import { ErrorAlert } from "@/components/error-alert";
import { CohortBadges } from "@/components/flag-badges";
import { NoUsersEmpty } from "@/components/no-users-empty";
import { PendingButton } from "@/components/pending-button";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserOption } from "@/components/user-select";
import { evaluateFlag } from "@/lib/api-client";
import {
  type DemoEvaluation,
  storefrontModel,
  toDemoEvaluation,
} from "@/lib/demo";

// Behaves like a client application: every stored flag is evaluated for the selected user through
// the public evaluate endpoint, in parallel. A run starts whenever what it evaluates changes (the
// user, their stored cohorts or the set of flag keys, e.g. on mount, on switch or when fresh props
// bring a new flag) and on Refresh. A run's answers are shown together once all have arrived, so
// the grid and storefront swap in one step instead of flickering through skeletons and the legacy
// store; until then the previous run's answers stay. Answers from an older run are discarded.

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
  users: UserOption[];
  selectedUserId: string | null;
}) {
  const [userId, setUserId] = useState(selectedUserId);
  const [run, setRun] = useState(0);
  const [results, setResults] = useState<Results>({ run: -1, byKey: {} });
  const [rememberFailed, setRememberFailed] = useState(false);
  const [, startTransition] = useTransition();
  const runRef = useRef(0);
  // What the latest run evaluated; a ref, so Strict Mode's effect replay starts no duplicate run.
  const startedForRef = useRef<string | null>(null);

  // The server re-renders after the cookie is set; a user missing from fresh props falls back.
  const user = users.find((u) => u.userId === userId) ?? users[0] ?? null;
  const flagKeys = flags.map(({ key }) => key);
  const inputs = user && JSON.stringify([user.userId, user.cohorts, flagKeys]);
  const evaluations = results.byKey;
  const firstRunDone = results.run !== -1;
  const pending = user !== null && results.run !== run;

  function start(target: UserOption) {
    const forRun = ++runRef.current;
    startedForRef.current = inputs;
    setRun(forRun);
    const ctx = { userId: target.userId, cohorts: target.cohorts };
    // `evaluateFlag` never rejects: a failed call is an `error` row.
    void Promise.all(
      flagKeys.map(async (key) => [
        key,
        toDemoEvaluation(await evaluateFlag(key, ctx)),
      ]),
    ).then((entries) => {
      if (runRef.current !== forRun) return;
      setResults({ run: forRun, byKey: Object.fromEntries(entries) });
    });
  }

  const startForInputs = useEffectEvent(() => {
    if (user && inputs !== startedForRef.current) start(user);
  });
  useEffect(() => startForInputs(), [inputs]);

  function selectUser(nextId: string) {
    const next = users.find((u) => u.userId === nextId);
    if (!next || next.userId === user?.userId) return;
    // The effect above starts the run for the new user.
    setUserId(next.userId);
    setRememberFailed(false);
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
        <NoUsersEmpty />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <ActorSelect
              users={users}
              value={user.userId}
              onValueChange={selectUser}
            />
            <CohortBadges cohorts={user.cohorts} />
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
        {/* Until the first answers arrive, a skeleton: never a flash of the legacy store. */}
        {firstRunDone || user === null ? (
          <Storefront model={storefrontModel(evaluations)} />
        ) : (
          <Skeleton className="h-96 rounded-xl" aria-hidden />
        )}
      </div>
    </div>
  );
}
