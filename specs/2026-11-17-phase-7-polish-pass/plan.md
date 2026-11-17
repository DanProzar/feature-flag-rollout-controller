# Phase 7 — Polish pass: Plan

Each group ends in a working, committed state. `src/data`, `src/server` and `src/lib` changes are
written test-first: change or add the tests, watch them fail, then implement. UI changes are checked
with `npm run build` and the manual checks in `validation.md`. Integration tests need Mongo:
`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo`.

## 1. Spec (R7.1–R7.30)
1. Write `requirements.md`, `plan.md` and `validation.md` in this directory; commit.

## 2. Data and service hardening (item 38, R7.1–R7.8)
1. Tests first:
   - `src/server/tests/flags.int.test.ts`:
     - re-creating a flag after a delete clears an assignment stored after the delete (R7.1);
     - a killed, excluded or included sticky flag never calls `assignments.get` (R7.3);
     - a returning sticky user still answers `STICKY`.
   - `src/data/tests/assignments.int.test.ts`: the duplicate-key fallback answers `value` when the
     re-read finds nothing (R7.2).
   - `src/data/tests/indexes.int.test.ts`: the audit index is `{ key: 1, at: 1, _id: 1 }` (R7.4).
   - `src/server/tests/schemas.test.ts`: the 200-character and 100-cohort limits, and
     `UserIdSchema` (R7.5, R7.7).
   - `src/server/tests/http.test.ts`:
     - a non-object body gives `issues.body` (R7.6);
     - an over-long `X-User-Id` throws `BadRequestError`;
     - `parseUserId` (R7.7).
   - `src/app/api/tests/users.int.test.ts`: a malformed id answers 400 (R7.7).
   - `src/server/tests/catalog.int.test.ts`: `user(id)` returns the user or `null`.
   - `src/server/tests/demo.int.test.ts`: `selectDemoUser` still accepts and rejects the same ids
     (R7.8).
2. Implement in `src/data/assignments.ts`, `src/data/indexes.ts`, `src/server/flags.ts`,
   `src/server/schemas.ts`, `src/server/http.ts`, `src/server/catalog.ts`, `src/server/demo.ts`
   and the users route handler. Export the new names from `src/server/index.ts`.
3. Run `npm run test:coverage` (100%), `lint` and `typecheck`; commit.

## 3. Docker and tooling (item 39, R7.9–R7.12)
1. `.dockerignore` additions; cache mounts in the `Dockerfile` and `USER node` in its `seed`
   stage.
2. `/app/.next` anonymous volume in `docker-compose.dev.yml`.
3. Move `shadcn` and `tw-animate-css` to `devDependencies` with `npm install -D`, so the lockfile
   is updated.
4. `npx prettier --write docker-compose.yml`.
5. `docker compose build` and `npm run build`; commit.

## 4. UI correctness (item 40, R7.13–R7.18)
1. `FlagForm` `enabled` prop and the flag page's key without `enabled` (R7.13).
2. `KillSwitch` refresh in a transition (R7.14).
3. `TryIt` request counter (R7.15).
4. `DemoPage`:
   - a run starts from a `useEffect` keyed on a signature of the user id, the user's cohorts and
     the flag keys, using `useEffectEvent` for the start;
   - Refresh and the switcher reuse the same run logic;
   - storefront skeleton until the first run (R7.16–R7.17).
5. `UserCohortsRow` set comparison, `LinkRow` selection guard and `ResetButton` navigation
   (R7.18).
6. `npm run build`, `lint`, `typecheck`; commit.

## 5. Accessibility, metadata and cleanup (items 41–42, R7.19–R7.26)
1. Titles: template in the layout, `metadata` on the static pages, `generateMetadata` on
   `/flags/[key]`, `<title>` in `not-found.tsx` (R7.19).
2. `FlagForm` `Field` ids, `aria-describedby`, `role="alert"` and focus on the first error
   (R7.20).
3. Contrast classes, `<h2>` card titles, always-mounted live regions and the cart label
   (R7.21–R7.23).
4. Extract the shared pieces:
   - `EnabledBadge` and `NoUsersEmpty` in `src/components`;
   - `UserSelect` and `UserOption` in `src/components/user-select.tsx`;
   - `cohortOptions` in `src/lib/cohort-options.ts`, with unit tests (R7.24).
5. Remove `showLabel`, the unused CSS tokens and the per-page `dynamic` exports (R7.25).
6. Responsive columns on `/` and `/users`, and in their skeletons (R7.26).
7. `npm run build`, `lint`, `typecheck`, `test:coverage`; commit.

## 6. Specs and docs (item 43, R7.27–R7.30)
1. Update `mission.md`, `tech-stack.md` and `roadmap.md` (R7.27).
2. Add a `Status:` line to each earlier phase's `requirements.md` and fix their markdown
   defects (R7.28).
3. Update the `feature-spec` skill (R7.29).
4. Update the README (R7.30).
5. Run the full gate in `validation.md`, set Status to Complete and commit. Run the changelog
   skill, which commits on its own.
