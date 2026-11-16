# Phase 4 — Admin UI: Requirements

Branch: `feature/phase-4-admin-ui`
Roadmap: `specs/roadmap.md` → Phase 4, items 28–32, plus the review follow-ups (see
[Review changes](#review-changes-2026-11-16)).

## Context

Phases 1–3 delivered the pure evaluator (`src/domain`), MongoDB persistence with seed data
(`src/data`) and the HTTP API (`src/server` services + `src/app/api` route handlers): `PUT
/api/flags/:key`, `POST /api/flags/:key/evaluate`, `GET /api/flags/:key/audit` and the test reset.
The only page today is a placeholder at `/`, and shadcn/ui is initialised with just `Button`.

The mission's users — developers and product managers — should be able to tune rollouts, flip the
kill switch during an incident, remove flags, keep the users' cohorts current and read a flag's
history without `curl`. This phase builds that admin UI on top of the Phase 3 contract. Reads go
through the existing services from Server Components; every flag write goes through the audited
flag routes (`PUT` / `DELETE /api/flags/:key`), so the UI cannot bypass the audit trail
("Deterministic & explainable"). Phase 3 deferred list/read-one endpoints to this phase; we decided
not to add them publicly.

## Scope

### 1. Read side: repository and services

- `FlagsRepository.list(): Promise<Flag[]>` in `src/data/flags.ts` — all flags, sorted by `key`
  ascending, each parsed with `FlagSchema`.
- `FlagService` gains `get(key): Promise<Flag | null>` and `list(): Promise<Flag[]>` (thin pass-
  throughs).
- New `CatalogService` in `src/server/catalog.ts`: `cohorts(): Promise<Cohort[]>` and
  `users(): Promise<User[]>` over the existing repositories. `Services` becomes
  `{ flags, reset, catalog }`.
- No public read endpoints: pages read via `getServices()` in Server Components (`dynamic =
  "force-dynamic"`).

### 2. Write side: delete flags, set user cohorts (items 13, 1)

- **Delete a flag**
  - `FlagsRepository.delete(key): Promise<Flag | null>` — removes the flag, returns it (`null` if
    there was none).
  - `AssignmentsRepository.deleteByFlag(flagKey)` — removes every user's sticky value for the flag,
    so a flag re-created under the same key starts fresh.
  - `FlagService.delete(key, actorId): Promise<Flag | null>` — deletes the flag and its assignments
    and appends one audit entry `{ at, key, actorId, before: flag, after: null }`; an unknown key
    returns `null` and writes nothing.
  - `AuditEntrySchema.after` becomes nullable (`null` = deleted), mirroring `before` (`null` =
    created). The audit log stays append-only and keeps a deleted flag's history.
  - `DELETE /api/flags/:key` → `200 { flag }` (the deleted flag); `404 { error: "Flag not found" }`
    for an unknown key; `400` for an invalid key. `actorId` from `X-User-Id`, as for `PUT`.
- **Set a user's cohorts**
  - `UsersRepository.setCohorts(userId, cohorts): Promise<User | null>` — replaces only
    `cohorts`; never creates a user.
  - `CatalogService.setUserCohorts(userId, cohorts)` — pass-through.
  - `UserCohortsBodySchema = { cohorts }` (required; trimmed, non-empty, de-duplicated like flag
    cohorts).
  - `PUT /api/users/:userId/cohorts { cohorts }` → `200 { user }`; `404 { error: "User not found" }`
    for an unknown user; `400 { error, issues }` for an invalid body. Users are not created,
    renamed or deleted through the API.

### 3. Pure UI helpers (`src/lib/`, unit-tested)

- `src/lib/flag-form.ts`
  - `FlagFormValues` — `{ key, enabled, percentage, includeCohorts, excludeCohorts, sticky }`.
  - `emptyFlagForm()` (defaults for a new flag: `enabled: true`, `percentage: 100`, empty cohorts,
    `sticky: false`) and `flagToForm(flag)`.
  - `USER_COHORT = "user"` and `withIncludeCohorts(values, includeCohorts)` — used by the create
    form: adding `user` to the include cohorts sets the percentage to 0 (a gradual rollout starts
    from there and stays editable), removing it sets 100; any other change keeps the percentage.
  - `formToPutBody(values)` → the five PUT fields (key omitted).
  - `validateFlagForm(values, existingKeys, mode: "create" | "edit")` → field errors: key must
    match `FlagKeySchema` and, in create mode, not already exist; percentage integer 0–100; a cohort
    in both include and exclude lists is a warning (allowed — exclude wins), not an error.
  - `issuesToFieldErrors(issues)` maps a `400 { error, issues }` body onto form fields.
- `src/lib/cohort-options.ts` — items for the cohort combobox: `cohortItems(catalogue, selected,
  query)` (catalogue then selected cohorts, once each, plus a "create" item for typed text that
  matches none), `createItem` / `createdCohort`, and `itemsToCohorts(items)` (unwraps create
  items, trims, drops blanks and repeats).
- `src/lib/audit-diff.ts` — `diffFlags(before: Flag | null, after: Flag | null)` →
  `{ field, before, after }[]` for changed fields only (key excluded; arrays compared by value);
  `before === null` → every field with `before: undefined` ("created"); `after === null` → every
  field with `after: undefined` ("deleted"); identical flags → `[]` ("no changes").
- `src/lib/api-client.ts` — browser calls to the API, `fetch` injected for tests. Every call
  returns `{ ok: true, … }` or `{ ok: false, error, issues }` and never throws:
  - `putFlag(key, body, actorId | null)` → `{ flag }`; sends `X-User-Id` only when `actorId` is set.
  - `deleteFlag(key, actorId | null)` → `{ flag }`; same header rule.
  - `evaluateFlag(key, { userId, cohorts })` → `{ enabled, reason }`; sends the evaluated `userId`
    as `X-User-Id` (none when it is blank), as a client application acting for that user would.
  - `setUserCohorts(userId, cohorts)` → `{ user }`.
- `src/lib/actor.ts` — `readActor()` / `writeActor(id | null)` over `localStorage` key
  `feature-flags.actorId`, wrapped in try/catch (storage may be unavailable). Not used by the admin
  pages; kept for the Phase 6 demo page.

### 4. Pages and components (`src/app`, `src/components`)

| Route | Item | Content |
|-------|------|---------|
| `/` | 28 | Flags `Table`: key (link to detail), kill state (`Badge` "Live"/"Killed" + kill `Switch`), percentage, sticky `Badge`, include/exclude cohorts as `Badge`s, trash-bin delete button; clicking a row anywhere outside its controls opens the flag; "New flag" button; empty state text when there are no flags |
| `/flags/new` | 29 | Create form |
| `/flags/[key]` | 29–32 | Edit form ("Rollout rules"), kill switch, "Try it" panel, audit history; `notFound()` for an unknown or invalid key |
| `/users` | review 1 | Users `Table`: name, user id, an editable cohort list and a Save button per row; empty state when there are no users |

- **Layout header** (`src/app/layout.tsx`): app title linking to `/` and `MainNav` links "Flags"
  (`/`, `/flags/*`) and "Users" (`/users`), the current one highlighted. No "Acting as" selector:
  admin writes send no `X-User-Id`, so the audit shows them as "anonymous". The selector is
  reserved for the Phase 6 demo page.
- **Flag form** (`src/components/flag-form.tsx`, client, item 29): key `Input` (editable on create,
  read-only on edit), enabled `Switch` (create only), percentage `Slider` with a numeric `Input`,
  sticky `Switch` with a hint that existing assignments are kept, include/exclude **cohort
  editors**. On create the percentage starts at 100% and follows `withIncludeCohorts`; the include
  hint explains it. Saves via `putFlag(key, body, null)`, then `router.push("/")` (create) or
  `router.refresh()` (edit). Client-side `validateFlagForm` errors and server `400` issues show
  under their fields.
- **Cohort editor** (`src/components/cohort-editor.tsx`, client): a shadcn/base-ui chips
  `Combobox` (`multiple`, `autoHighlight`). Selected cohorts are removable chips; the list offers
  catalogue cohorts (key + name). Clicking an option (or Enter on the highlighted one) adds it at
  once and clears the input — there is no "Add" button. Typed text that matches no option is
  offered as "Add `<text>`", so free-text cohorts are added the same way. Entries are trimmed and
  de-duplicated; cohorts are not validated against the catalogue (as in `tech-stack.md`).
- **Pending buttons** (`src/components/pending-button.tsx`): `PendingButton` and `PendingContent`
  hide the label in place and overlay a spinner while a request — and the navigation or refresh
  after it — is running, so the button never changes width (no "Saving…" / "…" labels). Used by
  Evaluate, Save (flag and user rows), Create flag, Kill flag and Delete flag.
- **Kill switch** (`src/components/kill-switch.tsx`, client, item 30): a prominent `Switch`
  ("Live" / "Killed") on the detail page header and on each list row. Turning a live flag **off**
  opens an `AlertDialog` ("Kill `<key>`? Every evaluation will return false with reason
  KILL_SWITCH.") and PUTs the current flag with `enabled: false` only on confirm. Turning it back
  on PUTs immediately. Disabled while the request is in flight; `router.refresh()` afterwards.
- **Delete button** (`src/components/delete-flag-button.tsx`, client, review 13): a ghost icon
  button with a trash-bin icon in each list row. It opens an `AlertDialog` ("Delete `<key>`? The
  flag and its sticky assignments are removed, and every evaluation will return false with reason
  FLAG_NOT_FOUND. Its history is kept.") and calls `deleteFlag` only on confirm; the list refreshes
  afterwards. A failure is shown inside the dialog.
- **Clickable rows** (`src/components/link-row.tsx`, client, review 14): a `TableRow` that opens
  the flag on click unless the click hit a control (link, button, input, label, switch) or came
  from a portal such as a dialog. The key link stays for keyboard users.
- **Try it panel** (`src/components/try-it.tsx`, client `Card`, item 31): a "User" `Select` of
  seeded users only, each option showing the user's name and cohort badges ("no cohorts" when
  empty); a read-only "User id" field showing the chosen id; a cohort editor that starts with the
  user's cohorts and can be changed for this evaluation only. "Evaluate" (disabled until a user is
  chosen) calls `evaluateFlag`, which sends the user's id as `X-User-Id`, and shows the result as
  a `Badge` — green for `true`, red for `false` — with the `reason`. A note states that evaluating
  a sticky flag stores the user's assignment, like a real client call.
- **Users** (`src/app/users/page.tsx`, `src/components/user-cohorts-row.tsx`, review 1): one row
  per user with a cohort editor; Save is enabled only when the list differs from the stored one,
  calls `setUserCohorts`, then `router.refresh()`. Inline error text on failure.
- **Audit history** (`src/components/audit-history.tsx`, server, item 32): newest first, each
  entry showing time (ISO), actor (seeded user's name, raw `actorId`, or "anonymous"), and the
  `diffFlags` rows as `field: before → after`; "created" and "no changes" labels; a deletion lists
  each field's last value; empty state "No changes recorded yet".
- shadcn components added with `npx shadcn@latest add`: `table`, `badge`, `switch`, `slider`,
  `input`, `label`, `card`, `alert-dialog`, `select`, `separator`, `combobox` (with its
  `input-group` and `textarea` dependencies) and `spinner`. (`skeleton`, `alert`, `sonner` stay in
  Phase 5.)
- Minimal inline error text for failed requests (e.g. "Save failed: …"); success alerts and richer
  error/loading/empty states are Phase 5.

### 5. Tooling

- Vitest coverage `include` gains `src/lib/**/*.ts` (excluding `src/lib/utils.ts`, generated by
  shadcn, and `src/lib/tests/**`), keeping the 100% thresholds. React components (`*.tsx`) are not
  in the coverage gate.
- Unit tests in `src/lib/tests/*.test.ts` (node environment; `fetch` and storage are stubbed).

## Out of scope

- Public `GET /api/flags` / `GET /api/flags/:key`, user or cohort read endpoints.
- Server Actions as a second write path.
- Renaming flags; creating, renaming or deleting users; managing the cohort catalogue.
- Auth/RBAC; the "Acting as" selector (Phase 6 demo page).
- A success alert after saving "Rollout rules" or other forms, skeletons, toasts, `Alert` error
  states, README (Phase 5); the `/demo` page (Phase 6).
- Free-text users in Try it.
- Component tests (React Testing Library) and browser e2e tests.
- Pagination, search or sorting controls on the lists; audit paging.
- Clearing a single user's sticky assignment.

## Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Reads | **Server Components call `getServices()`**; add `list`/`get` to flags and a `CatalogService` | No public read API to design and secure now; pages render with fresh data on each request. |
| Writes | **Client components `fetch` the API routes** (`PUT`/`DELETE /api/flags/:key`, `PUT /api/users/:userId/cohorts`), then `router.refresh()` | One write path per resource, validated like any API client; flag writes are always audited. |
| Delete | **Hard delete** of the flag and its sticky assignments, audited with `after: null`; `404` for an unknown key | Re-creating a key must not revive old sticky results; the history stays readable. |
| Users | **Only cohorts are editable**, via `PUT /api/users/:userId/cohorts` | The demo users are fixed (stable UUID v7 ids); cohort membership is what changes evaluations. |
| Cohort choices | **Combobox: catalogue options + "Add …" for free text**, added on click, input cleared | Fast to pick without a separate button; cohorts that exist only in client apps still work (the catalogue is reference-only). |
| Actor | **No "Acting as" in the admin**; admin writes are anonymous | The header selector was confusing in the admin panel; it belongs to the Phase 6 demo page. |
| Routing | `/` list, `/flags/new`, `/flags/[key]` detail, `/users` | Shareable URLs per flag; detail page holds edit, kill, try-it and history together. |
| Row navigation | Whole row opens the flag; controls in the row keep their own clicks | Larger target than the key link; the link remains for keyboard users. |
| Create with existing key | Client-side check against listed keys → field error | `PUT` is an upsert; the create form must not silently overwrite a flag. |
| New flag percentage | **100% by default; 0% while `user` is included**, editable | A new flag is fully on unless it is a gradual rollout to customers. |
| After create | Return to `/` | The list shows the new flag next to the others. |
| Key on edit | Read-only | Renames are out of scope. |
| Kill switch | `AlertDialog` **only when killing**; on list rows and detail page | Killing is the dangerous, incident-time action; re-enabling should be fast. |
| Try it | **Seeded users only**, cohorts shown per option, read-only id, `X-User-Id` sent; real evaluate endpoint | Shows exactly what a client acting for that user gets; the sticky side effect is disclosed in the panel. |
| Pending state | **Spinner over a hidden label** | Buttons keep their width; no flicker from changing labels. |
| Audit diff | **Field-level** `field: before → after`, newest first | Easier to scan than JSON; creation, deletion and no-op PUTs labelled explicitly. |
| Testing | Pure helpers + services + routes at **100% coverage**; components verified manually + `build` | Logic is where bugs hide; keeps the toolchain free of jsdom/RTL for now. |
| Workflow | Test-first for helpers/services/routes, one commit per task group | As in Phases 1–3. |

## Review changes (2026-11-16)

After reviewing the first implementation, these changes were requested; the sections above already
include them.

| # | Change |
|---|--------|
| 1 | `/users` page to view and edit the users' cohorts (`PUT /api/users/:userId/cohorts`). |
| 2 | "Acting as" removed from the header; kept for the Phase 6 demo page only. |
| 3 | Try it sends the chosen user's id as `X-User-Id`. |
| 4 | Evaluate shows a spinner while pending and keeps its width. |
| 5 | Try it: label "User"; every option shows the user's cohorts. |
| 6 | Try it: the user id is not editable. |
| 7 | Cohort selects add an option on click and clear the input; no "+ Add" buttons. |
| 8 | Evaluation result badge: green for `true`, red for `false`. |
| 9 | Every Save button shows a spinner and keeps its width (as do Create flag, Kill flag, Delete flag). |
| 10 | An alert after saving "Rollout rules" — deferred to Phase 5 (roadmap item 33). |
| 11 | New flags default to 100%, switching to 0% while `user` is included (and back when removed). |
| 12 | Creating a flag returns to `/`. |
| 13 | Delete flags with a trash-bin button in the list row. |
| 14 | Clicking a list row opens the flag. |
