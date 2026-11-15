# Phase 4 — Admin UI: Plan

Each group ends in a working state and can be committed on its own. For `src/data`, `src/server`
and `src/lib`, write the tests first, watch them fail, then implement. Components are checked with
`npm run build` and the manual checks in `validation.md`. Integration tests need Mongo:
`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo`.

## 1. Read side: repository and services (supports items 28, 29, 31, 32)
1. `src/data/tests/flags.int.test.ts`: `list()` → `[]` on an empty collection; returns all flags
   sorted by key, as domain `Flag`s (no `_id`, timestamps).
2. Implement `FlagsRepository.list()`.
3. `src/server/tests/flags.int.test.ts`: `get` returns the flag / `null`; `list` returns all,
   sorted.
4. `src/server/tests/catalog.int.test.ts` (after `seed`): `cohorts()` and `users()` return the seeded
   catalogue.
5. Implement `FlagService.get/list`, `src/server/catalog.ts`, add `catalog` to `createServices`;
   export from `src/server/index.ts`. Update `container.int.test.ts` if it asserts the shape.
6. Run `test:all`, `test:coverage`, `lint`, `typecheck`; commit.

## 2. Pure UI helpers (items 29, 31, 32)
1. `src/lib/tests/flag-form.test.ts`: `emptyFlagForm` defaults; `flagToForm` ↔ `formToPutBody`
   round-trip; `validateFlagForm` — bad key formats, existing key in create mode (allowed in edit),
   percentage `-1`/`101`/`50.5` rejected, `0`/`100` accepted, cohort in both lists → warning only;
   `issuesToFieldErrors` maps `percentage`/`includeCohorts` issues and ignores unknown fields.
2. `src/lib/tests/audit-diff.test.ts`: create (`before: null`) lists every field; single field
   change; cohort array reorder vs. change; identical flags → `[]`; `key` never listed.
3. `src/lib/tests/api-client.test.ts` (stubbed `fetch`): `putFlag` sends method, URL, JSON body and
   `X-User-Id` only when an actor is set; `200` → `{ ok: true, flag }`; `400` → `{ ok: false,
   error, issues }`; network error / `500` → `{ ok: false, error }`. `evaluateFlag` likewise.
4. `src/lib/tests/actor.test.ts`: read/write round-trip on a stubbed `localStorage`; `null` clears;
   a throwing storage → `readActor()` returns `null`, `writeActor` doesn't throw.
5. Implement the four modules; add `src/lib/**/*.ts` to coverage (excluding `src/lib/utils.ts` and
   tests); run tests + coverage; commit.

## 3. shadcn components and app shell
1. `npx shadcn@latest add table badge switch slider input label card alert-dialog select separator`.
2. `src/app/layout.tsx`: header with title link and `ActorSelect` (client; seeded users from
   `getServices().catalog.users()`, "Anonymous" option, persisted via `writeActor`).
3. Run `lint`, `typecheck`, `build`; commit.

## 4. Flags list page (item 28)
1. `src/app/page.tsx` (`dynamic = "force-dynamic"`): `Table` of `flags.list()` with key link,
   kill state `Badge`, percentage, sticky `Badge`, include/exclude cohort `Badge`s; "New flag"
   button; empty state.
2. Leave a placeholder cell for the row kill switch (wired in group 6).
3. Manual check against the seeded data; `build`; commit.

## 5. Create/edit flag form (item 29)
1. `src/components/cohort-editor.tsx`: chips + suggestion input over catalogue cohorts, free text
   allowed, trimmed and de-duplicated.
2. `src/components/flag-form.tsx`: fields as in requirements §3; client validation via
   `validateFlagForm`; save via `putFlag(key, formToPutBody(values), readActor())`; server issues
   via `issuesToFieldErrors`; navigate/refresh on success.
3. `src/app/flags/new/page.tsx` (existing keys + cohorts from services) and
   `src/app/flags/[key]/page.tsx` (validate key with `FlagKeySchema`, `notFound()` when invalid or
   missing; render the edit form).
4. Manual check: create, edit, invalid input, duplicate key; `build`; commit.

## 6. Kill switch (item 30)
1. `src/components/kill-switch.tsx`: `Switch` + `AlertDialog` on kill only; PUT the full current
   flag with `enabled` flipped; pending state; `router.refresh()`.
2. Use it in the detail page header and in each list row (replacing the placeholder).
3. Manual check: kill → confirm/cancel; re-enable without dialog; audit gets an entry with the
   acting user; `build`; commit.

## 7. Try it panel (item 31)
1. `src/components/try-it.tsx`: seeded-user `Select` filling userId + cohorts, free-text userId,
   cohort editor, "Evaluate" via `evaluateFlag`, result `Badge` + reason; sticky note.
2. Add to the detail page.
3. Manual check: a seeded user per seed flag gives the reason in the Phase 2 table; sticky flag
   gives `PERCENTAGE` then `STICKY`; `build`; commit.

## 8. Audit history (item 32)
1. `src/components/audit-history.tsx` (server): `flags.audit(key)` newest first, time, actor or
   "anonymous", `diffFlags` rows, "created"/"no changes" labels, empty state.
2. Add to the detail page.
3. Manual check after a few edits with different actors; `build`; commit.

## 9. Docs and wrap-up
1. Update `specs/tech-stack.md`: `src/lib` helpers in the architecture tree, `FlagsRepository.list`,
   `CatalogService`, the UI section (routes, read/write split, acting-as header, coverage of
   `src/lib`).
2. Tick Phase 4 in `specs/roadmap.md`.
3. Run the full validation checklist.
4. Add a `CHANGELOG.md` entry (changelog skill).
5. Open a PR from `feature/phase-4-admin-ui` into `main`.
