# Phase 3 — HTTP API: Plan

Each group ends in a working state and can be committed on its own. Write the tests first in each
group, watch them fail, then implement. Integration tests need Mongo:
`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo`.

## 1. Request schemas and HTTP helpers (roadmap item 21)
1. `src/server/tests/schemas.test.ts` (unit):
   - `FlagKeySchema`: accepts `a`, `new-checkout`, `v2.search_beta`, a 100-char key; rejects `""`,
     `-x`, `.x`, `Upper`, `has space`, `a/b`, a 101-char key.
   - `PutFlagBodySchema`: a full body parses; each of the five fields missing → issue on that field;
     `percentage` `-1`, `101`, `50.5`, `"50"` rejected; `0` and `100` accepted; non-boolean
     `enabled`/`sticky` rejected; cohort entries trimmed, empty/whitespace-only entries rejected,
     duplicates removed in order; a body `key` and other unknown fields are stripped.
   - `EvaluateBodySchema`: `userId` required, trimmed, non-empty; `cohorts` defaults to `[]`; same
     cohort element rules.
   - `ResetBodySchema`: valid ISO date-time (with `Z` and with offset) → `Date` of that instant;
     missing, `""`, `"yesterday"`, a date without time, a number → rejected.
2. `src/server/tests/http.test.ts` (unit, with `NextRequest`): `parseJson` returns the parsed value;
   invalid JSON → throws `BadRequestError`, answered by `handle` as `400 { error: "Invalid JSON",
   issues: {} }`; schema failure → `400 { error: "Invalid request body", issues }` with field
   names; `parseKey` with a bad key → `400 { error: "Invalid flag key", issues: { key } }`;
   `handle` passes arguments and responses through and rethrows other errors and `notFound()`.
3. Implement `src/server/schemas.ts` and `src/server/http.ts`.
4. Extend Vitest coverage `include` to `src/server/**/*.ts` and `src/app/api/**/*.ts` (excluding
   `**/tests/**`), keeping the 100% thresholds.
5. Run `test`, `lint`, `typecheck`, commit.

## 2. App clock and config (roadmap items 13, 22 support)
1. `src/server/tests/clock.test.ts` (unit): `appClock` follows the system clock by default (within a
   tolerance); after `freezeClock(t)` returns `t` repeatedly, as fresh `Date` copies; a second
   `freezeClock(t2)` moves it to `t2`; `unfreezeClock()` restores the system clock; the state is
   shared through `globalThis` (re-importing the module with `vi.resetModules()` sees the same
   frozen time).
2. `src/server/tests/config.test.ts` (unit): `testEndpointsEnabled` is `true` only for `"true"`;
   `undefined`, `""`, `"false"`, `"TRUE"`, `"1"` → `false`.
3. Implement `src/server/clock.ts` and `src/server/config.ts`; run tests, commit.

## 3. Flag service: PUT + audit (roadmap items 23–25)
1. `src/server/tests/flags.int.test.ts` (with `useTestDb()` and `frozenClock`):
   - `put` of a new key → returns the flag; the stored flag equals it; one audit entry with
     `before: null`, `after` = flag, `at` = clock time, given `actorId`.
   - `put` again with changed fields → returns the new flag; second audit entry with `before` = the
     first flag; entries oldest first.
   - `put` with identical fields still appends an entry (`before` deep-equals `after`).
   - `actorId: null` is stored as `null`.
   - `audit(key)` → entries for that key only; `[]` for an unknown key.
2. Implement `createFlagService` (`put`, `audit`) in `src/server/flags.ts`; run tests, commit.

## 4. Flag service: evaluate (roadmap item 26)
1. Extend `flags.int.test.ts`:
   - Unknown key → `{ enabled: false, reason: "FLAG_NOT_FOUND" }`, nothing stored.
   - Non-sticky flag → `PERCENTAGE` result equals domain `evaluate`; `assignments` stays empty.
   - Sticky flag, first evaluation → `PERCENTAGE`, assignment stored with that value; second
     evaluation → `STICKY` with the same value.
   - Sticky flag where an assignment already exists with the *opposite* of the bucket result
     (inserted directly) → `STICKY` with the stored value.
   - Race: an assignment inserted between `get` and `insertIfAbsent` (stubbed assignments repo) → the
     response returns the stored value, not the computed one.
   - Kill / exclude / include on a sticky flag with a stored value → `KILL_SWITCH` /
     `COHORT_EXCLUDED` / `COHORT_INCLUDED`, stored value unchanged afterwards.
   - The response never contains `persist`.
2. Implement `evaluate` in `src/server/flags.ts`; run tests, commit.

## 5. Reset service and container (roadmap items 19, 22)
1. `src/server/tests/reset.int.test.ts`: `reset(now)` empties `flags` and `assignments`, keeps
   `audit`, `users` and `cohorts`, does not re-seed flags, and freezes the injected clock at `now`.
2. `src/server/tests/container.int.test.ts`: `getServices()` returns the same services on concurrent
   calls and creates the indexes once; after a failing setup (e.g. stubbed `ensureIndexes` throwing
   once) the next call succeeds; `setServicesForTesting` overrides and `null` clears the override.
3. Implement `src/server/reset.ts` and `src/server/container.ts`, plus `src/server/index.ts`; run
   tests, commit.

## 6. Route handlers (roadmap items 22–26)
1. `src/app/api/tests/helpers.ts`: `useApi()` — `useTestDb()`, `setServicesForTesting(
   createServices(db, appClock))` before each file, `unfreezeClock()` + override cleared after;
   request builders `put(key, body, headers?)`, `evaluate(key, body)`, `audit(key)`,
   `reset(body)` that call the exported handlers with `new NextRequest(...)` and
   `{ params: Promise.resolve({ key }) }`, returning `{ status, body }`; a thrown `notFound()`
   error becomes `{ status: 404, body: null }`.
2. `src/app/api/tests/flags.int.test.ts`:
   - PUT valid → `200 { flag }` with `key` from the path (a body `key` is ignored).
   - PUT invalid key, invalid JSON, each missing field, out-of-range percentage → `400` with
     `error` and `issues`; nothing stored, no audit entry.
   - Evaluate invalid key / invalid JSON / missing `userId` → `400`; without `cohorts` → `200`.
   - Evaluate unknown flag → `200 { enabled: false, reason: "FLAG_NOT_FOUND" }`.
   - GET audit invalid key → `400`; unknown key → `200 { entries: [] }`; `at` values are ISO strings.
3. `src/app/api/tests/reset.int.test.ts`:
   - `ENABLE_TEST_ENDPOINTS` unset or `"false"` → `404` (also with an invalid body); `"true"` →
     `200 { now }`.
   - Missing / invalid `now` → `400`.
4. Implement the four `route.ts` files (`dynamic = "force-dynamic"`) as
   `handle(async (request: NextRequest, ctx: RouteContext<…>) => NextResponse.json(…))`, reading
   `X-User-Id` (trimmed, empty → `null`); the disabled reset calls `notFound()`. Make `typecheck`
   run `next typegen` first so `RouteContext` exists on a clean checkout; run tests, commit.

## 7. API scenario tests (roadmap item 27)
1. `src/app/api/tests/scenarios.int.test.ts`, each test starting with `reset({ now })`:
   - Reset with `now` → audit `at` values equal exactly `now` (ISO string).
   - Reset without `now` → `400`.
   - Reset keeps audit: PUT, reset, GET audit → entry still there; re-PUT → new entry with
     `before: null`.
   - Create vs. update: first PUT audit `before: null`, second `before` = first flag.
   - Missing `X-User-Id` → `actorId: null`; present → that value.
   - PUT missing any one field → `400` (table-driven over the five fields).
   - Sticky flag keeps value after percentage drops: `percentage: 100` → user gets `true`
     (`PERCENTAGE`); PUT `percentage: 0` → same user `true` (`STICKY`); a new user → `false`.
   - Non-sticky flag follows the new percentage: `100` → `true`, `0` → `false`, both `PERCENTAGE`.
   - Kill / exclude / include override sticky without overwriting it: after a stored `true`, each
     override returns its reason; restoring the flag returns `true` / `STICKY` again.
   - Seed flags against seed users through the API (after `seed`) match the expectations in the
     Phase 2 requirements table.
2. Run `test:all`, `test:coverage`, commit.

## 8. Compose, docs and wrap-up
1. `docker-compose.dev.yml`: `ENABLE_TEST_ENDPOINTS: "true"` on `app`.
2. Run the manual curl checks from `validation.md` against `docker compose up --build`.
3. Update `specs/tech-stack.md`: `src/server` in the architecture tree, request validation rules
   (key format, trimming, de-duplication, stripped fields), `400` shape, `{ entries }` audit
   response, optional `cohorts`, app clock.
4. Tick Phase 3 in `specs/roadmap.md`.
5. Run the full validation checklist.
6. Add a `CHANGELOG.md` entry (changelog skill).
7. Open a PR from `feature/phase-3-http-api` into `main`.
