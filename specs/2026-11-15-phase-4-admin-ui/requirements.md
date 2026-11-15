# Phase 4 — Admin UI: Requirements

Branch: `feature/phase-4-admin-ui`
Roadmap: `specs/roadmap.md` → Phase 4, items 28–32.

## Context

Phases 1–3 delivered the pure evaluator (`src/domain`), MongoDB persistence with seed data
(`src/data`) and the HTTP API (`src/server` services + `src/app/api` route handlers): `PUT
/api/flags/:key`, `POST /api/flags/:key/evaluate`, `GET /api/flags/:key/audit` and the test reset.
The only page today is a placeholder at `/`, and shadcn/ui is initialised with just `Button`.

The mission's users — developers and product managers — should be able to tune rollouts, flip the
kill switch during an incident and read a flag's history without `curl`. This phase builds that
admin UI on top of the Phase 3 contract. Reads go through the existing services from Server
Components; every write goes through the audited `PUT` endpoint, so the UI cannot bypass the audit
trail ("Deterministic & explainable"). Phase 3 deferred list/read-one endpoints to this phase; we
decided not to add them publicly.

## Scope

### 1. Read side: repository and services

- `FlagsRepository.list(): Promise<Flag[]>` in `src/data/flags.ts` — all flags, sorted by `key`
  ascending, each parsed with `FlagSchema`.
- `FlagService` gains `get(key): Promise<Flag | null>` and `list(): Promise<Flag[]>` (thin pass-
  throughs).
- New `CatalogService` in `src/server/catalog.ts`: `cohorts(): Promise<Cohort[]>` and
  `users(): Promise<User[]>` over the existing repositories. `Services` becomes
  `{ flags, reset, catalog }`.
- No new HTTP endpoints: pages read via `getServices()` in Server Components (`dynamic =
  "force-dynamic"`).

### 2. Pure UI helpers (`src/lib/`, unit-tested)

- `src/lib/flag-form.ts`
  - `FlagFormValues` — `{ key, enabled, percentage, includeCohorts, excludeCohorts, sticky }`.
  - `emptyFlagForm()` (defaults for a new flag: `enabled: true`, `percentage: 0`, empty cohorts,
    `sticky: false`) and `flagToForm(flag)`.
  - `formToPutBody(values)` → the five PUT fields (key omitted).
  - `validateFlagForm(values, existingKeys, mode: "create" | "edit")` → field errors: key must
    match `FlagKeySchema` and, in create mode, not already exist; percentage integer 0–100; a cohort
    in both include and exclude lists is a warning (allowed — exclude wins), not an error.
  - `issuesToFieldErrors(issues)` maps a `400 { error, issues }` body onto form fields.
- `src/lib/audit-diff.ts` — `diffFlags(before: Flag | null, after: Flag)` →
  `{ field, before, after }[]` for changed fields only (key excluded; arrays compared by value);
  `before === null` → every field listed with `before: undefined` ("created"); identical flags →
  `[]` ("no changes").
- `src/lib/api-client.ts` — browser calls to the API, `fetch` injected for tests:
  - `putFlag(key, body, actorId | null)` → `{ ok: true, flag }` or `{ ok: false, error, issues }`;
    sends `X-User-Id` only when `actorId` is set.
  - `evaluateFlag(key, { userId, cohorts })` → `{ enabled, reason }` or an error result.
- `src/lib/actor.ts` — `readActor()` / `writeActor(id | null)` over `localStorage` key
  `feature-flags.actorId`, wrapped in try/catch (storage may be unavailable).

### 3. Pages and components (`src/app`, `src/components`)

| Route | Item | Content |
|-------|------|---------|
| `/` | 28 | Flags `Table`: key (link to detail), kill state (`Badge` "Live"/"Killed" + kill `Switch`), percentage, sticky `Badge`, include/exclude cohorts as `Badge`s; "New flag" button; empty state text when there are no flags |
| `/flags/new` | 29 | Create form |
| `/flags/[key]` | 29–32 | Edit form, kill switch, "Try it" panel, audit history; `notFound()` for an unknown or invalid key |

- **Layout header** (`src/app/layout.tsx`): app title linking to `/` and an "Acting as" `Select`
  of seeded users (plus "Anonymous"); the choice is stored with `writeActor` and sent as
  `X-User-Id` on every PUT. Rendered by a client component fed the user list from the layout.
- **Flag form** (`src/components/flag-form.tsx`, client, item 29): key `Input` (editable on create,
  read-only on edit), enabled `Switch`, percentage `Slider` with a numeric readout/`Input`, sticky
  `Switch` with a hint that existing assignments are kept, include/exclude **cohort editors**.
  Saves via `putFlag`, then `router.push("/flags/<key>")` (create) or `router.refresh()` (edit).
  Client-side `validateFlagForm` errors and server `400` issues show under their fields.
- **Cohort editor** (`src/components/cohort-editor.tsx`, client): chips (`Badge` with remove
  button) plus an input that suggests catalogue cohorts (key + name) and also accepts free text
  (trimmed, de-duplicated). Cohorts are not validated against the catalogue (as in
  `tech-stack.md`).
- **Kill switch** (`src/components/kill-switch.tsx`, client, item 30): a prominent `Switch`
  ("Live" / "Killed") on the detail page header and on each list row. Turning a live flag **off**
  opens an `AlertDialog` ("Kill `<key>`? Every evaluation will return false with reason
  KILL_SWITCH.") and PUTs the current flag with `enabled: false` only on confirm. Turning it back
  on PUTs immediately. Disabled while the request is in flight; `router.refresh()` afterwards.
- **Try it panel** (`src/components/try-it.tsx`, client `Card`, item 31): a seeded-user `Select`
  that fills `userId` + cohorts, or free-text `userId` and a cohort editor; "Evaluate" calls
  `evaluateFlag` and shows `enabled` (`Badge`) and `reason`. A note states that evaluating a sticky
  flag stores the user's assignment, like a real client call.
- **Audit history** (`src/components/audit-history.tsx`, server, item 32): newest first, each
  entry showing time (ISO, plus locale string), actor (`actorId` or "anonymous"), and the
  `diffFlags` rows as `field: before → after`; "created" and "no changes" labels; empty state
  "No changes recorded yet".
- shadcn components added with `npx shadcn@latest add`: `table`, `badge`, `switch`, `slider`,
  `input`, `label`, `card`, `alert-dialog`, `select`, `separator`. (`skeleton`, `alert`, `sonner`
  stay in Phase 5.)
- Minimal inline error text for failed requests (e.g. "Save failed: …"); richer error/loading/empty
  states are Phase 5.

### 4. Tooling

- Vitest coverage `include` gains `src/lib/**/*.ts` (excluding `src/lib/utils.ts`, generated by
  shadcn, and `src/lib/tests/**`), keeping the 100% thresholds. React components (`*.tsx`) are not
  in the coverage gate.
- Unit tests in `src/lib/tests/*.test.ts` (node environment; `fetch` and storage are stubbed).

## Out of scope

- Public `GET /api/flags` / `GET /api/flags/:key`, users or cohorts endpoints.
- Server Actions as a second write path.
- Deleting or renaming flags; editing users or cohorts; managing the cohort catalogue.
- Auth/RBAC — "Acting as" is attribution only, trusted as-is.
- Skeletons, toasts, `Alert` error states, README (Phase 5); the `/demo` page (Phase 6).
- Component tests (React Testing Library) and browser e2e tests.
- Pagination, search or sorting controls on the list; audit paging.
- Clearing a single user's sticky assignment.

## Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Reads | **Server Components call `getServices()`**; add `list`/`get` to flags and a `CatalogService` | No public read API to design and secure now; pages render with fresh data on each request. |
| Writes | **Client components `fetch` the existing `PUT` endpoint**, then `router.refresh()` | One write path, already audited and validated; the UI shows the same `400 { error, issues }` as API clients. |
| Cohort choices | **Seeded catalogue suggestions + free text** | Helpful defaults without blocking cohorts that exist only in client apps (the catalogue is reference-only). |
| Actor | **"Acting as" seeded-user select** stored in `localStorage`, sent as `X-User-Id` | Makes the audit trail meaningful in demos without adding auth. |
| Routing | `/` list, `/flags/new`, `/flags/[key]` detail | Shareable URLs per flag; detail page holds edit, kill, try-it and history together. |
| Create with existing key | Client-side check against listed keys → field error | `PUT` is an upsert; the create form must not silently overwrite a flag. |
| Key on edit | Read-only | Renames are out of scope (no delete). |
| Kill switch | `AlertDialog` **only when killing**; on list rows and detail page | Killing is the dangerous, incident-time action; re-enabling should be fast. |
| Try it | Seed-user select **or** free text; real evaluate endpoint | Shows exactly what clients get; the sticky side effect is disclosed in the panel. |
| Audit diff | **Field-level** `field: before → after`, newest first | Easier to scan than JSON; creation and no-op PUTs labelled explicitly. |
| Testing | Pure helpers + services at **100% coverage**; components verified manually + `build` | Logic is where bugs hide; keeps the toolchain free of jsdom/RTL for now. |
| Workflow | Test-first for helpers/services, one commit per task group | As in Phases 1–3. |
