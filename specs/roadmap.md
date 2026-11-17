# Roadmap

Evaluator core first, then persistence, API, and UI. Each phase is small, ends with green tests, and
is committed on its own.

**How the specs fit together.** `mission.md` (what and why) and `tech-stack.md` (how) are the
current source of truth and are updated by every phase. Each phase also gets a dated directory
(`specs/YYYY-MM-DD-<phase>/` with `requirements.md`, `plan.md` and `validation.md`), linked from
its heading below. A phase spec is a historical record, frozen at merge: later changes are recorded
here as follow-ups or as a new phase, and in its `Status:` line.

## Phase 0 — Scaffold ✅ Complete ([spec](2026-11-14-phase-0-scaffold/requirements.md))
1. Init Next.js + TypeScript (strict) project, ESLint, Prettier.
2. Add Vitest with one trivial passing test.
3. Add `Dockerfile` (Node 24, `node:24-alpine`) + `docker-compose.yml` (`app`, `mongo`); app boots
   and serves a placeholder page.
   Follow-up: shadcn/ui on Tailwind CSS v4 initialised (`components.json`, `src/components/ui`,
   `src/lib/utils.ts`, theme tokens in `globals.css`).

## Phase 1 — Pure evaluator (`src/domain`) ✅ Complete ([spec](2026-11-15-phase-1-evaluator/requirements.md))
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

## Phase 2 — Persistence (`src/data`) ✅ Complete ([spec](2026-11-15-phase-2-persistence/requirements.md))
14. MongoDB client singleton + env config; integration test harness against the compose `mongo`.
15. Flags repository: get by key, full-replace upsert (returns previous value); unique index on `key`.
16. Assignments repository: get `(flagKey, userId)`; insert-if-absent via upsert + `$setOnInsert`;
    unique compound index.
17. Concurrency test: parallel first evaluations for one user yield a single stored value.
18. Audit repository: append entry, list by key oldest first.
19. Reset function: clear flags and assignments; audit untouched.
20. Users and cohorts repositories (get, list, create, update, delete, clear) and seed data: a seed
    script populating `cohorts` (`admin`, `tester`, `user`, `developer`), `users` (5–7
    `{ userId, name, cohorts }` with UUID v7 `userId`s from the `uuid` library, every cohort used
    at least once, some users in more than one) and 5 demo `flags` (one per evaluation reason, no
    audit entries). Each collection is seeded only when empty. Runnable via an npm script and on
    compose startup; reset leaves cohorts and users untouched (flags return on the next seed run).

## Phase 3 — HTTP API (`src/app/api`) ✅ Complete ([spec](2026-11-15-phase-3-http-api/requirements.md))
21. Zod schemas: PUT body (all five fields required), evaluate body, reset body (`now` required).
22. `POST /api/test/reset { now }`: clears flags + sticky and records `now` as the reset time
    (echoed back and logged; since Phase 5 the clock is not frozen); mounted only when
    `ENABLE_TEST_ENDPOINTS=true`.
23. `PUT /api/flags/:key`: full-replace upsert → `200 { flag }`; `400` on missing/invalid fields.
24. Audit on PUT: append `{ at, key, actorId, before, after }`, `actorId` from `X-User-Id` or `null`.
25. `GET /api/flags/:key/audit` → list of entries.
26. `POST /api/flags/:key/evaluate { userId, cohorts }`: load flag → load sticky (only if
    `flag.sticky`) → evaluate → persist if needed → `200 { enabled, reason }`. Since Phase 7 the
    sticky value is loaded only when the percentage rule applies.
27. API integration tests: reset answers `{ now }` and later audit entries carry the clock's time
    (exact times come from an injected `frozenClock`; until Phase 5 the reset froze the clock);
    reset without `now` → `400`; reset keeps audit; create vs. update audit (`before: null`);
    missing `X-User-Id` → `actorId: null`; PUT missing a field → `400`; sticky flag keeps value
    after percentage drops; non-sticky flag follows new percentage; kill/exclude/include override
    sticky without overwriting it.

## Phase 4 — Admin UI (`src/app`, built with shadcn/ui) ✅ Complete ([spec](2026-11-15-phase-4-admin-ui/requirements.md))
28. Flags list page (key, kill state, percentage, sticky, cohorts) using `Table` and `Badge`.
29. Create/edit flag form (percentage `Slider`, include/exclude cohort editors, sticky `Switch`),
    saving via `PUT`.
30. Prominent kill-switch `Switch` with an `AlertDialog` confirmation.
31. "Try it" evaluator panel (`Card`): enter userId + cohorts, see `enabled` + `reason`.
32. Audit history view per flag: time, actor, before → after diff.
    Review follow-ups: `/users` page to edit users' cohorts (`PUT /api/users/:userId/cohorts`);
    delete flags from the list (`DELETE /api/flags/:key`, audited, clears sticky assignments);
    whole list rows open the flag; "Acting as" removed from the header (it moved to the Phase 6
    demo page); Try it picks a seeded user only (cohorts shown per option, read-only id,
    `X-User-Id` sent, green/red result); click-to-add cohort combobox; spinner buttons that keep
    their width; new flags default to 100%, switching to 0% while `user` is included; creating a
    flag returns to the list.

## Phase 5 — Polish ✅ Complete ([spec](2026-11-16-phase-5-polish/requirements.md))
33. Error, loading and empty states (shadcn `Skeleton`, `Alert`, `Sonner` toasts), including a
    success/failure alert after saving the flag's "Rollout rules" (and the other admin saves).
34. README: run instructions (`docker compose up`), API examples with `curl`.
    Follow-ups: white (light) theme only; a header **Reset** button in the dev stack
    (`ENABLE_TEST_ENDPOINTS=true`), with the reset no longer freezing the clock (tests inject
    `frozenClock` instead); `MONGODB_SERVER_SELECTION_TIMEOUT_MS` (default 5 s) so a down database
    shows the error page quickly.

## Phase 6 — Demo page (`src/app/demo`) ✅ Complete ([spec](2026-11-17-phase-6-demo-page/requirements.md))
35. `/demo` page in the existing app that calls `POST /api/flags/:key/evaluate` like a real client.
36. User switcher → flag grid: pick a seeded user, see every stored flag's `enabled` + `reason`.
    The "Acting as" selector (`src/components/actor-select.tsx`), removed from the admin header in
    Phase 4, lives here.
37. Mock product UI: a fake storefront whose features (checkout, dark mode, search, banner,
    assistant) appear or disappear according to the seeded flags for the selected user.
    Follow-ups: every off feature shows its legacy variant (all off → the complete legacy store,
    badged); the selected user is kept in an `httpOnly` `ff_demo_user` session cookie set by a
    validating Server Function, replacing the `localStorage` actor (`src/lib/actor.ts` removed);
    a round of answers is swapped in at once (skeletons only on first load); the storefront's
    controls work locally without calling the API (filters, cart, both checkouts, support,
    assistant); no `/users` link on `/demo`.

## Phase 7 — Polish pass (`fix/polish`) ✅ Complete ([spec](2026-11-17-phase-7-polish-pass/requirements.md))
38. Data and service hardening: a re-created flag starts without stale sticky assignments;
    evaluate reads the stored value only for the percentage rule; audit index `{ key, at, _id }`;
    request limits (200-character ids and cohorts, 100 cohorts, `X-User-Id`); non-object bodies
    report `issues.body`; the users route validates `:userId`.
39. Docker and tooling: leaner build context, BuildKit caches, non-root seed, `.next` kept out of
    the host bind mount, build-time packages as dev dependencies, Prettier-clean compose file.
40. UI correctness: the kill switch keeps unsaved rule edits and stays pending until refreshed;
    Try it and `/demo` never show stale or stuck answers.
41. Accessibility and metadata: per-page titles, linked and announced form messages, AA contrast,
    `<h2>` sections, persistent live regions.
42. UI cleanup: shared `EnabledBadge`, `UserSelect`, `NoUsersEmpty`, `cohortOptions`; dead code
    removed; narrow-screen tables.
43. Specs and docs in sync: mission (deletion in scope, glossary), tech stack, roadmap links and
    phase status lines, the `feature-spec` skill, README.
