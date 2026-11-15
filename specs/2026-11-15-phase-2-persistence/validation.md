# Phase 2 — Persistence: Validation

The phase is done and can be merged into `main` when every check below passes on a clean checkout.

## Local checks (Node 24)

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo
npm ci
npm run lint            # exits 0, no warnings
npm run typecheck       # exits 0
npm run format:check    # exits 0
npm test                # unit tests only; passes with Mongo stopped, exits 0
npm run test:int        # integration tests against Mongo, exits 0
npm run test:all        # both projects, exits 0
npm run test:coverage   # 100% for src/domain and src/data (exclusions as in requirements.md), exits 0
npm run build           # exits 0
```

After the integration run, no `feature_flags_test_*` databases remain:

```sh
docker compose exec mongo mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.map(d=>d.name).filter(n=>n.startsWith("feature_flags_test_"))'
# prints []
```

## Boundary checks

```sh
# Domain stays pure: no new imports in src/domain.
grep -rnE 'from "' src/domain --include=*.ts --exclude-dir=tests | grep -vE 'from "(\./|node:zlib")'  # no output
# Only the data layer imports the MongoDB driver.
grep -rln 'from "mongodb"' src --include=*.ts | grep -v '^src/data/'  # no output
# Data code never reads the wall clock directly.
grep -rnE 'new Date\(|Date\.now\(' src/data --include=*.ts --exclude-dir=tests  # no output
```

## Required tests

- [ ] `loadConfig`: valid env parses; missing/empty `MONGODB_URI` / `MONGODB_DB` throws.
- [ ] `getDb`: pings; concurrent calls share one `Db`; reconnects after `closeDb`.
- [ ] `ensureIndexes`: five indexes with correct uniqueness; idempotent.
- [ ] Flags: unknown → `null`; create returns `null`; update returns previous `Flag`; full replace;
      `createdAt` kept, `updatedAt` advanced; one doc per key; malformed doc throws on read.
- [ ] Assignments: unknown → `undefined`; first value wins; later `insertIfAbsent` returns the stored
      value; pairs independent; duplicate-key retry path covered.
- [ ] **Concurrency**: 50 parallel first writes for one `(flagKey, userId)` → all return the same
      value, exactly one document (repeated several times).
- [ ] Audit: `[]` for unknown key; round-trip of all fields incl. `actorId: null` and
      `before: null`; per-key filtering; oldest-first ordering incl. out-of-order appends and ties.
- [ ] Reset: clears `flags` and `assignments`; `audit` and `users` untouched; indexes kept.
- [ ] Users: `create` generates a UUID v7 `userId` (distinct per call), get round-trips, list
      sorted by `userId` = creation order, non-UUID-v7 stored id throws on read, update (and `null`
      for unknown without creating), delete `true`/`false`, clear.
- [ ] Cohorts: same cases as users, keyed by caller-chosen `key`, `DuplicateCohortError`.
- [ ] Seed data: 4 cohorts; 5–7 users with fixed, unique UUID v7 ids, using every cohort, at least
      one multi-cohort user;
      5 flags as specified; users and flags reference only seed cohort keys; evaluating the seed
      flags against the seed users yields every reason except `FLAG_NOT_FOUND`.
- [ ] Seed: seeds an empty database (4/6/5) without audit entries; second run is a no-op; each
      collection is seeded independently (only flags after reset, only users after `users.clear()`,
      only cohorts after `cohorts.clear()`); non-empty collections are left alone; concurrent runs
      seed each collection exactly once.

## Manual checks

- [ ] `npm run seed` against an empty DB prints `seeded 4 cohorts`, `seeded 6 users`,
      `seeded 5 flags` and exits 0; a second run prints the three skip messages and exits 0.
- [ ] `npm run seed` with Mongo stopped exits non-zero with a readable error.
- [ ] `docker compose down -v && docker compose up --build`: `seed` runs and exits 0, then `app`
      starts and serves `http://localhost:3000`; `cohorts`/`users`/`flags` hold 4/6/5 documents and
      `audit` is empty.
- [ ] `docker compose restart` / a second `docker compose up`: `seed` logs the skip messages, exits
      0, and `app` still starts; counts unchanged.

## Review checklist

- [ ] Repositories are factories taking `Db` (and `Clock` where they write timestamps); only
      `client.ts` touches the singleton.
- [ ] Flags repository speaks domain `Flag` only; metadata never leaks to callers.
- [ ] Every document read is parsed with a Zod schema from `src/data/schemas.ts`.
- [ ] Sticky writes use upsert + `$setOnInsert` on the unique index.
- [ ] `ensureIndexes` is the only place indexes are created.
- [ ] User IDs come only from `uuid`'s `v7()` (in `users.create`) or the fixed seed constants.
- [ ] `mongodb`, `zod` and `uuid` are runtime dependencies, `tsx` a dev dependency; `package-lock.json` updated.
- [ ] Cohort keys on users/flags are not validated against `cohorts`; `src/domain` is unchanged.
- [ ] Seeding writes no audit entries.
- [ ] Nothing from Phase 3+ was added: no route handlers, request schemas, UI or `/demo` page.
- [ ] `tech-stack.md` updated; Phase 2 marked complete; `CHANGELOG.md` entry added.
- [ ] Each task group from `plan.md` is its own commit on `feature/phase-2-persistence`.
