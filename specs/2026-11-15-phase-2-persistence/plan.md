# Phase 2 — Persistence: Plan

Each group ends in a working state and can be committed on its own. Write the tests first in each
group, watch them fail, then implement. Integration tests need Mongo:
`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo`.

## 1. Tooling and Mongo harness (roadmap item 14)
1. Install `mongodb`, `zod` and `uuid` as dependencies, `tsx` as a dev dependency.
2. Map `27017:27017` on `mongo` in `docker-compose.dev.yml`.
3. Convert `vitest.config.mts` to two projects: `unit` (`src/**/*.test.ts`, excluding
   `src/**/*.int.test.ts`) and `int` (`src/**/*.int.test.ts`, longer `testTimeout`). Extend coverage
   to `src/data/**/*.ts`, excluding `src/data/tests/**`, `src/data/index.ts`, `src/data/seed.cli.ts`,
   keeping the 100% thresholds.
4. Scripts: `test` → `vitest run --project unit`, `test:int` → `vitest run --project int`,
   `test:all` → `vitest run`, `test:coverage` → `vitest run --coverage` (all projects).
5. `src/data/tests/config.test.ts` (unit): valid env parses; missing/empty `MONGODB_URI` or
   `MONGODB_DB` throws naming the variable. Implement `src/data/config.ts`.
6. `src/data/tests/harness.ts`: `useTestDb()` as in `requirements.md` → "Tooling".
7. `src/data/tests/client.int.test.ts`: `getDb()` returns the configured database and can `ping`;
   concurrent calls return the same `Db`; after `closeDb()` the next `getDb()` reconnects.
   Implement `src/data/client.ts` (promise cached on `globalThis`).
8. `src/data/tests/indexes.int.test.ts`: `ensureIndexes` creates the five indexes (unique where
   specified) and is safe to run twice. Implement `src/data/indexes.ts`.
9. Create `src/data/index.ts`, run `test`, `test:int`, `lint`, `typecheck`, commit.

## 2. Flags repository (roadmap item 15)
1. Add the flag document schema to `src/data/schemas.ts`.
2. `src/data/tests/flags.int.test.ts` (with `frozenClock`):
   - `get` of an unknown key → `null`.
   - `upsert` of a new flag → returns `null`; `get` returns exactly the six `Flag` fields.
   - Second `upsert` → returns the previous `Flag`; `get` returns the new one (full replace,
     including emptied cohort arrays).
   - `createdAt` is kept and `updatedAt` advances across upserts (checked on the raw document).
   - Unique index: one document per key after repeated upserts.
   - A malformed stored document (inserted raw) makes `get` throw.
3. Implement `src/data/flags.ts`, export, run tests, commit.

## 3. Assignments repository + concurrency (roadmap items 16–17)
1. Add the assignment document schema.
2. `src/data/tests/assignments.int.test.ts`:
   - `get` with no assignment → `undefined`.
   - `insertIfAbsent(true)` → returns `true`; `get` → `true`; `createdAt` = frozen clock.
   - `insertIfAbsent(false)` afterwards → returns `true` and the stored value is unchanged.
   - Same user on two flags, and two users on one flag, are independent.
   - **Concurrency (item 17)**: 50 parallel `insertIfAbsent` calls for one `(flagKey, userId)` with
     alternating values → every call returns the same value, `get` returns it, and exactly one
     document exists. Repeat the scenario several times in a loop to make the race likely.
   - The `E11000` retry path is covered (e.g. by a stubbed collection that throws a duplicate-key
     error once) so coverage stays at 100%.
3. Implement `src/data/assignments.ts`, export, run tests, commit.

## 4. Audit repository (roadmap item 18)
1. Add the audit document schema (`before`/`after` as `Flag`, `before` nullable).
2. `src/data/tests/audit.int.test.ts`:
   - `listByKey` of an unknown key → `[]`.
   - Appended entries come back field-for-field (`at` as the same instant, `actorId` string and
     `null`, `before: null` and a `Flag`), without `_id`.
   - Entries for other keys are not returned.
   - Ordering: oldest `at` first even when appended out of order; equal `at` keeps insertion order.
3. Implement `src/data/audit.ts`, export, run tests, commit.

## 5. Reset (roadmap item 19)
1. `src/data/tests/reset.int.test.ts`: with flags, assignments, audit entries and users present,
   `resetFlagsAndAssignments` empties `flags` and `assignments`, leaves `audit` and `users` intact,
   and keeps the unique indexes (a second insert of a duplicate key still fails).
2. Implement `src/data/reset.ts`, export, run tests, commit.

## 6. Users repository (roadmap item 20, extension)
1. Add the user document schema.
2. `src/data/tests/users.int.test.ts`:
   - `create({ name, cohorts })` returns a user whose `userId` is a valid UUID v7; `get` round-trips
     it; two creates get different IDs.
   - `list` returns all users sorted by `userId`, which matches creation order; `[]` when empty.
   - A stored document whose `userId` is not a UUID v7 makes reads throw.
   - `update` replaces `name` and `cohorts` and returns the user; unknown `userId` → `null` and no
     document is created.
   - `delete` → `true` then `false`; the user is gone.
   - `clear` removes all users.
3. Implement `src/data/users.ts`, export, run tests, commit.

## 7. Cohorts repository (roadmap item 20, extension)
1. Add the cohort document schema.
2. `src/data/tests/cohorts.int.test.ts`: the same cases as users, keyed by a caller-chosen `key`
   (`create` with an existing `key` throws `DuplicateCohortError`, list sorted by `key`, update
   `null` for unknown without creating).
3. Implement `src/data/cohorts.ts`, export, run tests, commit.

## 8. Seed (roadmap item 20)
1. `src/data/tests/seed.test.ts` (unit):
   - `SEED_COHORTS` has exactly `admin`, `tester`, `user`, `developer`, unique keys.
   - `SEED_USERS` has 5–7 users with unique, valid UUID v7 ids (`uuid` `validate` + `version`),
     uses every seed cohort, has at least one multi-cohort user, and uses only cohort keys from
     `SEED_COHORTS`.
   - `SEED_FLAGS` matches the table in `requirements.md`, uses only seed cohort keys, and —
     evaluated with domain `evaluate` against `SEED_USERS` (no stored values) — produces every
     reason except `FLAG_NOT_FOUND` at least once, including at least one `PERCENTAGE` `true` and
     one `false` for both `new-checkout` and `ai-assistant` (guards against later edits to the seed
     users or percentages silently hiding a case in the demo).
2. `src/data/tests/seed.int.test.ts` (with `frozenClock`):
   - Empty database → each of cohorts/users/flags reports `{ seeded: true, count }` (4/6/5); stored
     data matches the seed constants; flags read back via the flags repository; **no audit entries**
     exist.
   - Second run → all three `{ seeded: false }`, no duplicates, edits made after seeding unchanged.
   - Collections are independent: with users present but flags empty (e.g. after
     `resetFlagsAndAssignments`), only flags are seeded; likewise after `users.clear()` or
     `cohorts.clear()`, only that collection is seeded.
   - A non-empty collection containing non-seed data (e.g. one custom user) is not seeded.
   - Two concurrent `seed` calls → each collection reports `seeded: true` exactly once; counts are
     4/6/5.
3. Implement `src/data/seed.ts` and `src/data/seed.cli.ts`; add `"seed": "tsx --env-file-if-exists=.env src/data/seed.cli.ts"`.
4. Dockerfile: add a `seed` stage (`FROM deps`, copy sources, `CMD ["npm", "run", "seed"]`).
5. `docker-compose.yml`: add the one-shot `seed` service (same `MONGODB_*` env, `depends_on: mongo`
   healthy, `restart: "no"`); make `app` depend on `seed` with
   `condition: service_completed_successfully`.
6. Run tests, run the manual checks from `validation.md` → "Manual checks", commit.

## 9. Wrap-up
1. Update `specs/tech-stack.md`: `users` and `cohorts` collections in "Data model", `src/data`
   layout, test scripts, seed service.
2. Tick Phase 2 in `specs/roadmap.md` (item 20 and the Phase 6 demo entry were already updated
   with this spec).
3. Run the full validation checklist.
4. Add a `CHANGELOG.md` entry (changelog skill).
5. Open a PR from `feature/phase-2-persistence` into `main`.
