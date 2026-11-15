# Roadmap

Evaluator core first, then persistence, API, and UI. Each phase is small, ends with green tests, and
is committed on its own.

## Phase 0 — Scaffold ✅ Complete
1. Init Next.js + TypeScript (strict) project, ESLint, Prettier.
2. Add Vitest with one trivial passing test.
3. Add `Dockerfile` (Node ≥ 22.2) + `docker-compose.yml` (`app`, `mongo`); app boots and serves a
   placeholder page.
   Follow-up: shadcn/ui on Tailwind CSS v4 initialised (`components.json`, `src/components/ui`,
   `src/lib/utils.ts`, theme tokens in `globals.css`).

## Phase 1 — Pure evaluator (`src/domain`) ✅ Complete
4. Define types: `Flag`, `EvaluationContext`, `EvaluationResult`, `Reason`.
5. Rule: flag not found → `false` / `FLAG_NOT_FOUND`.
6. Rule: kill switch → `false` / `KILL_SWITCH`.
7. Rule: excluded cohort → `false` / `COHORT_EXCLUDED` (exclude beats include).
8. Rule: included cohort → `true` / `COHORT_INCLUDED`.
9. Bucketing `bucket(flagKey, userId) -> 0..99` via CRC32 of UTF-8 `flagKey:userId`; tests with
   known CRC32 vectors (e.g. `"123456789"` → `0xCBF43926`), non-ASCII input, and unsigned handling.
10. Rule: percentage → `bucket < percentage`; edge cases 0% and 100%; result marked `persist: true`
    only when `flag.sticky`.
11. Rule: sticky flag + stored value supplied → return it / `STICKY`, ignoring percentage;
    kill/exclude/include still win; non-sticky flags ignore any stored value.
12. Table-driven test covering the full precedence matrix from `mission.md`.
13. Injectable `Clock` (`now()`), with real and frozen implementations.

## Phase 2 — Persistence (`src/data`)
14. MongoDB client singleton + env config; integration test harness against the compose `mongo`.
15. Flags repository: get by key, full-replace upsert (returns previous value); unique index on `key`.
16. Assignments repository: get `(flagKey, userId)`; insert-if-absent via upsert + `$setOnInsert`;
    unique compound index.
17. Concurrency test: parallel first evaluations for one user yield a single stored value.
18. Audit repository: append entry, list by key oldest first.
19. Reset function: clear flags and assignments; audit untouched.
20. Seed data: idempotent seed script populating a `users` collection with 5–7 users
    (`{ userId, name, cohorts }`) spread across the cohorts `admin`, `tester`, `user` and
    `developer` (every cohort used at least once; some users in more than one). Runnable via an npm
    script and on compose startup; reset leaves seeded users untouched.

## Phase 3 — HTTP API (`src/app/api`)
21. Zod schemas: PUT body (all five fields required), evaluate body, reset body (`now` required).
22. `POST /api/test/reset { now }`: clears flags + sticky, freezes the clock at `now`; mounted only
    when `ENABLE_TEST_ENDPOINTS=true`.
23. `PUT /api/flags/:key`: full-replace upsert → `200 { flag }`; `400` on missing/invalid fields.
24. Audit on PUT: append `{ at, key, actorId, before, after }`, `actorId` from `X-User-Id` or `null`.
25. `GET /api/flags/:key/audit` → list of entries.
26. `POST /api/flags/:key/evaluate { userId, cohorts }`: load flag → load sticky (only if
    `flag.sticky`) → evaluate → persist if needed → `200 { enabled, reason }`.
27. API integration tests: reset with `now` gives exact `at` values; reset without `now` → `400`;
    reset keeps audit; create vs. update audit (`before: null`); missing `X-User-Id` → `actorId: null`;
    PUT missing a field → `400`; sticky flag keeps value after percentage drops; non-sticky flag
    follows new percentage; kill/exclude/include override sticky without overwriting it.

## Phase 4 — Admin UI (`src/app`, built with shadcn/ui)
28. Flags list page (key, kill state, percentage, sticky, cohorts) using `Table` and `Badge`.
29. Create/edit flag form (percentage `Slider`, include/exclude cohort editors, sticky `Switch`),
    saving via `PUT`.
30. Prominent kill-switch `Switch` with an `AlertDialog` confirmation.
31. "Try it" evaluator panel (`Card`): enter userId + cohorts, see `enabled` + `reason`.
32. Audit history view per flag: time, actor, before → after diff.

## Phase 5 — Polish
33. Error, loading and empty states (shadcn `Skeleton`, `Alert`, `Sonner` toasts).
34. README: run instructions (`docker compose up`), API examples with `curl`.
