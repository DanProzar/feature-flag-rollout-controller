# Changelog

## 2026-11-16

- Added the admin UI on shadcn/ui: a flags list with kill state, rollout, sticky and cohort badges, where clicking a row opens the flag
- Added create and edit flag forms with a percentage slider, sticky switch and click-to-add cohort pickers that accept free-text cohorts; new flags default to 100% and switch to 0% while the `user` cohort is included
- Added a kill switch on the list and detail pages that asks for confirmation only when killing a flag
- Added flag deletion from the list via `DELETE /api/flags/:key`, which also clears the flag's sticky assignments and is recorded in its history
- Added a Users page for editing each user's cohorts via `PUT /api/users/:userId/cohorts`
- Added a Try it panel that evaluates a flag for a seeded user (cohorts shown per option, user id sent as `X-User-Id`) and shows the result in green or red with its reason
- Added a per-flag history showing who changed which fields, with before → after values
- Added loading spinners to buttons that keep the button's width while saving or evaluating
- Added flag list/get and a catalog service for server-side page reads, and unit-tested UI helpers under the 100% coverage gate
- Added Phase 4 admin UI spec, documented the UI and new endpoints, and marked Phase 4 complete
- Added success toasts with details of each change (e.g. `percentage: 10% → 25%`, cohorts added/removed) for every admin write
- Replaced inline failure texts with destructive Alerts in the flag form, delete dialog, user rows and Try it, plus a page-level Alert for kill-switch and reset failures
- Added a header Reset button in the dev stack (only with `ENABLE_TEST_ENDPOINTS=true`) that clears flags and sticky assignments after a confirmation
- Changed `POST /api/test/reset` to no longer freeze the clock: `now` is recorded as the reset time, and tests inject a frozen clock instead
- Added loading skeletons for every page, error and global-error pages with Try again, a styled not-found page and `Empty` states for empty lists
- Added `MONGODB_SERVER_SELECTION_TIMEOUT_MS` (default 5 s) so an unreachable database shows the error page within seconds
- Switched the UI to a white-only theme, removing dark-mode styles
- Rewrote the README as a developer guide with verified `curl` examples and troubleshooting, and marked Phase 5 complete

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
