# Changelog

## 2026-11-15

- Added the HTTP API as Next.js Route Handlers (`NextRequest`/`NextResponse`, typed `RouteContext`): `PUT /api/flags/:key`, `POST /api/flags/:key/evaluate` and `GET /api/flags/:key/audit`, with Zod-validated keys and bodies and `{ error, issues }` 400 responses
- Added audited flag upserts recording the actor from `X-User-Id` and the previous flag
- Added evaluation with sticky persistence that always answers the value actually stored
- Added `POST /api/test/reset { now }`, served only when `ENABLE_TEST_ENDPOINTS=true` (on in dev compose, otherwise Next's `notFound()`), which clears flags and assignments and freezes the app clock
- Added a service container that ensures indexes once per process and retries a failed setup
- Added API scenario tests through the route handlers and extended the 100% coverage gate to `src/server` and `src/app/api`
- Added Phase 3 HTTP API spec, documented the API layer and marked Phase 3 complete
- Added the MongoDB data layer: env config, shared client, indexes and Zod-validated documents
- Added flags, audit, users (UUID v7 ids) and cohorts repositories
- Added race-safe sticky assignments, proven with a parallel first-write test
- Added a reset that clears flags and sticky assignments while keeping the audit log
- Added seed cohorts, users and flags, runnable with `npm run seed` and as a one-shot compose service
- Split tests into unit and integration projects, with integration tests against a real MongoDB and a 100% coverage gate on `src/data`
- Added Phase 2 persistence spec and moved seed data into Phase 2 on the roadmap
- Marked Phase 2 complete and documented the data layer in the tech stack
- Added the pure flag evaluator: kill switch, cohort exclude/include, sticky and percentage rules
- Added CRC32 user bucketing with pinned reference values
- Added an injectable clock with real and frozen implementations
- Added precedence-matrix and property-based tests with a 100% domain coverage gate
- Strengthened evaluator tests: independent CRC32 reference over arbitrary Unicode, a written-out precedence table and targeted property tests
- Adopted shadcn/ui on Tailwind CSS v4 as the UI framework
- Fixed hydration warning caused by browser-extension body attributes
- Fixed frozen-clock tests that could not detect a clock sharing its Date with callers
- Fixed lint warnings from the generated coverage report
- Added user and cohort seeding to the Phase 3 roadmap
- Added Phase 1 evaluator spec (requirements, plan, validation)
- Marked Phase 1 complete in the roadmap
- Moved domain tests into `src/domain/tests` and made per-module `tests/` folders the project convention
- Synced the tech stack and Phase 1 specs with the built evaluator

## 2026-11-14

- Scaffolded Next.js + TypeScript project
- Added Vitest with a sanity test
- Added Dockerfile and Docker Compose setup
- Created project constitution: mission, roadmap, and tech stack specs
- Added Phase 0 scaffold spec (requirements, plan, validation)
- Marked Phase 0 complete in the roadmap
