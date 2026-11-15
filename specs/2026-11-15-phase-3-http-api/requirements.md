# Phase 3 — HTTP API: Requirements

Branch: `feature/phase-3-http-api`
Roadmap: `specs/roadmap.md` → Phase 3, items 21–27.

## Context

Phase 1 delivered the pure evaluator in `src/domain` (`evaluate`, `bucket`, `Clock`); Phase 2
delivered `src/data`: the MongoDB client singleton, `ensureIndexes`, repositories for flags,
sticky assignments, audit, users and cohorts, the flags/assignments reset and seed data. Nothing is
reachable over HTTP yet.

This phase exposes the system to its real users: client applications calling
`POST /api/flags/:key/evaluate`, developers and product managers changing flags with
`PUT /api/flags/:key`, auditors reading `GET /api/flags/:key/audit`, and tests driving the
deterministic `POST /api/test/reset`. The admin UI (Phase 4) and the demo page (Phase 6) will be
built on this contract. Per the mission's "Deterministic & explainable" principle every evaluation
returns `{ enabled, reason }`, every PUT is audited, and the reset freezes the clock so audit
timestamps are exact in tests.

## Scope

### 1. Request schemas (`src/server/schemas.ts`, item 21)

Zod schemas; unknown fields are **stripped** (so a `key` in the PUT body is ignored), never
rejected.

- `FlagKeySchema` — path key: `^[a-z0-9][a-z0-9._-]{0,99}$` (lowercase slug, 1–100 chars). Applied
  to the `:key` of every `/api/flags/:key/*` route; an invalid key → `400`.
- `PutFlagBodySchema` — all five fields **required**, no defaults:
  - `enabled: boolean`, `sticky: boolean`
  - `percentage`: integer `0..100`
  - `includeCohorts`, `excludeCohorts`: arrays of strings, each trimmed and non-empty after
    trimming; duplicates removed (first occurrence order kept).
- `EvaluateBodySchema` — `userId`: trimmed, non-empty string; `cohorts`: same element rules as
  above, **optional, defaults to `[]`**.
- `ResetBodySchema` — `now`: required ISO-8601 date-time string (`z.iso.datetime({ offset: true })`),
  converted to a `Date`.

### 2. HTTP helpers (`src/server/http.ts`)

- `parseJson(request, schema)` → parsed value, or a `400` response when the body is not valid JSON
  or fails the schema.
- Error response shape for every `400`:
  `{ error: "Invalid request body" | "Invalid flag key", issues: Record<string, string[]> }`
  (`z.flattenError(...).fieldErrors`; for invalid JSON, `issues: {}` and `error: "Invalid JSON"`).
- Unexpected errors are not caught here: Next returns `500`.

### 3. App clock (`src/server/clock.ts`)

- `appClock: Clock` — delegates to `systemClock` until `freezeClock(at)` is called, then returns
  `frozenClock(at)` values until the next `freezeClock`. The current delegate is held on
  `globalThis` so it survives Next.js dev hot reloads and is shared by all route handlers.
- `freezeClock(at: Date)`, plus `unfreezeClock()` for test teardown.
- No code outside `src/domain/clock.ts` reads the wall clock directly.

### 4. Container (`src/server/container.ts`)

- `createServices(db, clock): Services` — builds the repositories and returns
  `{ flags: FlagService, reset: ResetService }`.
- `getServices(): Promise<Services>` — `getDb()`, runs `ensureIndexes(db)` **once per process**
  (cached promise on `globalThis`), then `createServices(db, appClock)`. A failed setup is not
  cached, so the next request retries.
- `setServicesForTesting(services | null)` — lets integration tests point the route handlers at
  `createServices(testDb, appClock)` built on the per-file test database.

### 5. Services (`src/server/flags.ts`, `src/server/reset.ts`)

`createFlagService({ flags, assignments, audit, clock })`:

- `put(key, body, actorId: string | null): Promise<Flag>` (item 24) — `before = flags.upsert({ key,
  ...body })`; append `{ at: clock.now(), key, actorId, before, after }` where `after` is the flag as
  written; return `after`. Every PUT is audited, even when nothing changed.
- `evaluate(key, { userId, cohorts }): Promise<{ enabled, reason }>` (item 26):
  1. `flag = flags.get(key)`
  2. `stored = flag?.sticky ? assignments.get(key, userId) : undefined` — non-sticky flags never
     touch `assignments`.
  3. `result = evaluate(flag, { userId, cohorts }, stored)`
  4. if `result.persist`: `enabled = assignments.insertIfAbsent(key, userId, result.enabled)` — the
     value actually stored (a concurrent first evaluation may have won); the response returns that
     value with reason `PERCENTAGE`.
  5. return `{ enabled, reason }` (`persist` is never exposed).
- `audit(key): Promise<AuditEntry[]>` (item 25) — `audit.listByKey(key)`.

`createResetService({ db, freezeClock })`:

- `reset(now: Date)` (item 22) — `resetFlagsAndAssignments(db)` then `freezeClock(now)`. Audit,
  users and cohorts are untouched; seed flags are **not** re-inserted.

### 6. Route handlers (`src/app/api`)

All handlers are thin: validate path key → parse body → call a service → `Response.json(...)`.
`export const dynamic = "force-dynamic"`; Node.js runtime (default).

| Method & path | File | Success | Errors |
|---------------|------|---------|--------|
| `PUT /api/flags/:key` | `flags/[key]/route.ts` | `200 { flag }` | `400` invalid key / JSON / body |
| `GET /api/flags/:key/audit` | `flags/[key]/audit/route.ts` | `200 { entries }`, oldest first; `[]` for unknown key | `400` invalid key |
| `POST /api/flags/:key/evaluate` | `flags/[key]/evaluate/route.ts` | `200 { enabled, reason }`; unknown flag → `200 { enabled: false, reason: "FLAG_NOT_FOUND" }` | `400` invalid key / JSON / body |
| `POST /api/test/reset` | `test/reset/route.ts` | `200 { now }` (ISO string) | `404` unless `ENABLE_TEST_ENDPOINTS === "true"` (checked per request, before body parsing); `400` missing/invalid `now` |

- `actorId` = the `X-User-Id` header if present and non-empty after trimming, else `null`.
- Audit entries serialise `at` as an ISO-8601 string; `before`/`after` are domain `Flag`s
  (`before: null` on create).
- Methods not listed get Next's default `405`.

### 7. Config and compose

- `ENABLE_TEST_ENDPOINTS` is read at request time by `testEndpointsEnabled(env = process.env)` in
  `src/server/config.ts`; only the exact string `"true"` enables it. It stays out of the data
  layer's `loadConfig`, which only knows about MongoDB.
- `docker-compose.dev.yml` sets `ENABLE_TEST_ENDPOINTS: "true"` on `app`; `docker-compose.yml` keeps
  `"false"`.

### 8. Tests and tooling

- Unit tests (`src/server/tests/*.test.ts`): request schemas, `parseJson`, app clock,
  `testEndpointsEnabled`.
- Integration tests (`*.int.test.ts`) call the exported route handlers directly with
  `new Request(...)` and `{ params: Promise.resolve({ key }) }`, against the per-file test database
  from `useTestDb()`, wired in with `setServicesForTesting`. Service tests use repositories on the
  test database and `frozenClock`.
- Coverage: extend the 100% gate to `src/server/**/*.ts` and `src/app/api/**/*.ts` (excluding test
  folders).

## Out of scope

- `GET /api/flags` (list) and `GET /api/flags/:key` — deferred to Phase 4, which decides how the UI
  reads flags.
- Users and cohorts endpoints; validating cohort keys against the `cohorts` collection.
- Deleting flags, environments, auth/RBAC (`X-User-Id` is trusted as-is), rate limiting, CORS.
- Re-running the seed on reset.
- Any UI (Phase 4) or the `/demo` page (Phase 6).
- An HTTP-level test suite against a running server (covered by the manual curl checks instead).

## Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Layering | **`src/server/` services + container**; route handlers only parse, call, respond | Orchestration is testable without HTTP; handlers stay trivially thin. |
| Clock across requests | **Settable app clock on `globalThis`**, frozen by reset until the next reset | Single-process app; no extra collection or per-request read. Survives dev hot reloads like the Db singleton. |
| 400 shape | `{ error, issues }` with Zod `fieldErrors`; invalid JSON → `400` | Machine-readable for the UI forms in Phase 4, readable by humans. |
| Unknown fields | **Stripped**, not rejected | Matches tech-stack: a `key` in the PUT body is ignored. |
| Flag key format | Lowercase slug `^[a-z0-9][a-z0-9._-]{0,99}$` on every route | Keys are part of URLs and the hash input; rejecting odd keys early avoids un-addressable flags. |
| String fields | Trimmed, non-empty; cohort arrays de-duplicated | Prevents `" admin"` silently not matching `admin`; duplicates carry no meaning. |
| Evaluate `cohorts` | **Optional, defaults to `[]`** | Clients without cohort data can still call evaluate. |
| Audit response | `200 { entries }`, `at` as ISO strings | Consistent with `{ flag }` wrapping; room for paging later. |
| Read endpoints | **Deferred to Phase 4** | Keep Phase 3 to the roadmap's four endpoints. |
| Indexes | `ensureIndexes` once per process from the container | Phase 2 deferred this to "app startup"; lazy-once avoids a custom server. |
| Sticky persistence | Response uses the value returned by `insertIfAbsent` | A concurrent first evaluation may have stored the other value; every caller must agree with storage. |
| Test endpoint gate | Env checked per request; disabled → `404` before parsing | Indistinguishable from a missing route in production. |
| API tests | **Call route handlers directly** in Vitest `int` tests | Fast, no server lifecycle, counts toward coverage; manual curl smoke test covers the real server. |
| Coverage | 100% on `src/server` and `src/app/api` (plus existing domain + data) | Same bar as Phases 1–2. |
| Workflow | Test-first, one commit per task group | As in Phases 1–2. |
