# Phase 4 — Admin UI: Plan

Each group ends in a working state and can be committed on its own. For `src/data`, `src/server`
and `src/lib`, write the tests first, watch them fail, then implement. Components are checked with
`npm run build` and the manual checks in `validation.md`. Integration tests need Mongo:
`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo`.

Groups 1–8 built the first version; groups 9–11 apply the review changes of 2026-11-16 (see
`requirements.md` → Review changes), which supersede the earlier groups where they differ.

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
   `getServices().catalog.users()`, "Anonymous" option, persisted via `writeActor`). Replaced by
   `MainNav` in group 11.
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
2. `src/components/flag-form.tsx`: fields as in requirements §4; client validation via
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

## 9. Review changes: write side (review items 1, 13)
1. `src/data/tests`: `FlagsRepository.delete` (returns the flag / `null`, others untouched);
   `AssignmentsRepository.deleteByFlag` (that flag only); audit round-trip with `after: null`;
   `UsersRepository.setCohorts` (cohorts only; unknown user → `null`, nothing created).
2. Implement them; make `AuditEntrySchema.after` nullable.
3. `src/server/tests`: `FlagService.delete` (flag + assignments removed, audit
   `{ before, after: null }` with the actor; unknown → `null`, nothing written);
   `CatalogService.setUserCohorts`; `UserCohortsBodySchema`.
4. Implement `FlagService.delete`, `CatalogService.setUserCohorts`, `UserCohortsBodySchema`; export
   the `User` type from `src/server` for the UI.
5. `src/app/api/tests`: `DELETE /api/flags/:key` (`200`, `404`, `400`) and
   `PUT /api/users/:userId/cohorts` (`200`, empty list, `404`, `400`); add `del` / `putCohorts`
   helpers.
6. Add the `DELETE` handler to `src/app/api/flags/[key]/route.ts` and
   `src/app/api/users/[userId]/cohorts/route.ts`.
7. Run `test:all`, `test:coverage`, `lint`, `typecheck`; commit.

## 10. Review changes: UI helpers (review items 3, 7, 11, 13)
1. `src/lib/tests/flag-form.test.ts`: `emptyFlagForm` defaults to 100%; `withIncludeCohorts`
   (add `user` → 0, remove → 100, otherwise unchanged).
2. `src/lib/tests/cohort-options.test.ts`: `cohortItems`, `createItem` / `createdCohort`,
   `itemsToCohorts`.
3. `src/lib/tests/audit-diff.test.ts`: a deletion (`after: null`) lists every field.
4. `src/lib/tests/api-client.test.ts`: `evaluateFlag` sends the trimmed `userId` as `X-User-Id`
   (none when blank); `deleteFlag` and `setUserCohorts` request shape and results.
5. Implement; run tests + coverage; commit.

## 11. Review changes: UI (review items 1–9, 11–14)
1. `npx shadcn@latest add combobox spinner` (keep our formatted `button.tsx` / `input.tsx`; run
   `npm ci` if the CLI's install leaves `node_modules` incomplete).
2. `src/components/pending-button.tsx` (`PendingButton`, `PendingContent`); use it for Evaluate,
   Save, Create flag, Kill flag and Delete flag, keeping the spinner through the following
   navigation/refresh (`useTransition`).
3. `src/components/cohort-editor.tsx`: chips `Combobox` over `cohort-options` — add on click,
   input cleared, "Add …" for free text, no "+ Add" button.
4. `src/components/try-it.tsx`: "User" select of seeded users with cohort badges per option,
   read-only user id, evaluate with `X-User-Id`, green/red result badge.
5. `src/components/flag-form.tsx`: anonymous `putFlag`; create mode uses `withIncludeCohorts` and
   `router.push("/")`; include hint mentions the `user` rule. `kill-switch.tsx`: anonymous PUT.
6. `src/app/layout.tsx`: drop `ActorSelect` (kept for Phase 6) and the users read; add `MainNav`
   ("Flags" / "Users").
7. `/` list: `LinkRow` (whole-row navigation, controls and portals excluded) and
   `DeleteFlagButton` (trash icon → `AlertDialog` → `deleteFlag` → refresh).
8. `/users`: `src/app/users/page.tsx` + `UserCohortsRow` (cohort editor, Save enabled on change,
   `setUserCohorts` → refresh).
9. Restart the dev `app` container, run the manual checks in `validation.md`; `lint`,
   `typecheck`, `build`; commit.

## 12. Docs and wrap-up
1. Update `specs/tech-stack.md`: `src/lib` helpers in the architecture tree, `FlagsRepository.list`
   / `delete`, `CatalogService` (incl. `setUserCohorts`), the new `DELETE /api/flags/:key` and
   `PUT /api/users/:userId/cohorts` endpoints, the UI section (routes incl. `/users`, read/write
   split, no acting-as header, coverage of `src/lib`). Update `specs/mission.md`: deletions are
   audited (`after: null`).
2. Tick Phase 4 in `specs/roadmap.md`; add the "Rollout rules" save alert to Phase 5 (item 33)
   and the "Acting as" selector to Phase 6 (item 36).
3. Run the full validation checklist.
4. Add a `CHANGELOG.md` entry (changelog skill).
5. Open a PR from `feature/phase-4-admin-ui` into `main`.
