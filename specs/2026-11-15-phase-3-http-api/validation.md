# Phase 3 — HTTP API: Validation

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
npm run test:coverage   # 100% for src/domain, src/data, src/server, src/app/api; exits 0
npm run build           # exits 0; the four API routes are listed as dynamic (ƒ)
```

After the integration run, no `feature_flags_test_*` databases remain:

```sh
docker compose exec mongo mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.map(d=>d.name).filter(n=>n.startsWith("feature_flags_test_"))'
# prints []
```

## Boundary checks

```sh
# Domain stays pure.
grep -rnE 'from "' src/domain --include=*.ts --exclude-dir=tests | grep -vE 'from "(\./|node:zlib")'  # no output
# Only the data layer imports the MongoDB driver (type-only imports in src/server are allowed).
grep -rln 'from "mongodb"' src --include=*.ts | grep -vE '^src/(data|server)/'  # no output
grep -rn '^import {.*} from "mongodb"' src/server --include=*.ts --exclude-dir=tests  # no output (only `import type`)
# Route handlers don't touch repositories or the driver directly.
grep -rnE 'from "@/data|from "mongodb"|create\w+Repository' src/app/api --include=route.ts  # no output
# Nothing outside src/domain/clock.ts reads the wall clock.
grep -rnE 'new Date\(\)|Date\.now\(' src --include=*.ts --exclude-dir=tests | grep -v '^src/domain/clock.ts'  # no output
```

## Required tests

- [ ] Schemas: key format accept/reject list; PUT body requires all five fields, percentage integer
      0–100, cohorts trimmed / non-empty / de-duplicated, body `key` stripped; evaluate `userId`
      required and `cohorts` defaults to `[]`; reset `now` ISO date-time required.
- [ ] `parseJson`: invalid JSON and schema failures → `400 { error, issues }`.
- [ ] App clock: system by default; frozen after `freezeClock`; re-freezable; `unfreezeClock`;
      shared via `globalThis`.
- [ ] `testEndpointsEnabled`: only `"true"` enables.
- [ ] Flag service `put`: create (`before: null`) and update (`before` = previous) audited with
      clock `at` and `actorId` (string and `null`); unchanged PUT still audited.
- [ ] Flag service `evaluate`: `FLAG_NOT_FOUND` without writes; non-sticky never touches
      `assignments`; sticky first `PERCENTAGE` then `STICKY`; pre-stored opposite value wins; race
      returns the stored value; kill/exclude/include override sticky without overwriting it; no
      `persist` in the response.
- [ ] Reset service: clears flags + assignments; keeps audit, users, cohorts; no re-seed; freezes
      the clock.
- [ ] Container: concurrent `getServices` share one instance; indexes ensured once; failed setup
      retried; test override works.
- [ ] Handlers: `200`/`400` paths for PUT, evaluate and audit as in `plan.md` group 6; reset `404`
      when disabled (even with a bad body), `200` when enabled, `400` without/with invalid `now`.
- [ ] **Item 27 scenarios**: exact `at` after reset with `now`; reset without `now` → `400`; reset
      keeps audit and re-create gets `before: null`; create vs. update audit; missing `X-User-Id` →
      `actorId: null`; PUT missing each field → `400`; sticky keeps value after percentage drops;
      non-sticky follows new percentage; kill/exclude/include override sticky without overwriting
      it; seed flags × seed users give the Phase 2 table's results.

## Manual checks

Run against `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` (test
endpoints enabled):

- [ ] ```sh
      curl -s -XPOST localhost:3000/api/test/reset -H 'content-type: application/json' -d '{"now":"2026-01-01T00:00:00Z"}'
      # 200 {"now":"2026-01-01T00:00:00.000Z"}
      curl -s -XPUT localhost:3000/api/flags/demo -H 'content-type: application/json' -H 'X-User-Id: dev-1' \
        -d '{"enabled":true,"percentage":100,"includeCohorts":[],"excludeCohorts":["blocked"],"sticky":true}'
      # 200 {"flag":{"key":"demo",...}}
      curl -s -XPOST localhost:3000/api/flags/demo/evaluate -H 'content-type: application/json' -d '{"userId":"u1"}'
      # 200 {"enabled":true,"reason":"PERCENTAGE"}; repeated → "STICKY"
      curl -s localhost:3000/api/flags/demo/audit
      # 200 {"entries":[{"at":"2026-01-01T00:00:00.000Z","key":"demo","actorId":"dev-1","before":null,"after":{...}}]}
      curl -s -XPOST localhost:3000/api/flags/nope/evaluate -H 'content-type: application/json' -d '{"userId":"u1"}'
      # 200 {"enabled":false,"reason":"FLAG_NOT_FOUND"}
      curl -s -o /dev/null -w '%{http_code}' -XPUT localhost:3000/api/flags/demo -H 'content-type: application/json' -d '{"enabled":true}'
      # 400
      ```
- [ ] With plain `docker compose up --build` (`ENABLE_TEST_ENDPOINTS=false`),
      `POST /api/test/reset` returns `404` and the seeded flags evaluate as in the Phase 2 table
      (e.g. `legacy-banner` → `KILL_SWITCH`).
- [ ] App logs show no unhandled errors during the checks above.

## Review checklist

- [ ] Route handlers only validate, call a service and respond; orchestration lives in
      `src/server`.
- [ ] All request bodies and path keys are validated with Zod; `400` bodies have `error` and
      `issues`.
- [ ] Sticky assignments are read only for sticky flags and written only via `insertIfAbsent`, and
      the response returns the stored value.
- [ ] Every PUT appends exactly one audit entry; `at` comes from the app clock.
- [ ] The reset route returns `404` unless `ENABLE_TEST_ENDPOINTS === "true"`; production compose
      keeps it disabled.
- [ ] `ensureIndexes` runs once per process from the container.
- [ ] No list/read-one flag endpoints, users/cohorts endpoints, UI or `/demo` page were added.
- [ ] `src/domain` and `src/data` APIs unchanged (no new repository methods).
- [ ] `tech-stack.md` updated; Phase 3 marked complete; `CHANGELOG.md` entry added.
- [ ] Each task group from `plan.md` is its own commit on `feature/phase-3-http-api`.
