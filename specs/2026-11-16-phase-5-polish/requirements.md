# Phase 5 — Polish: Requirements

Branch: `feature/phase-5-polish`
Roadmap: `specs/roadmap.md` → Phase 5, items 33–34 (including the "Rollout rules" save alert
deferred from Phase 4, review item 10), plus the spec-review follow-ups of 2026-11-16: a white-only
theme and a header **Reset** button, with reset no longer freezing the clock (§9–§10).
Status: ✅ Complete — merged 2026-11-16 together with Phase 4. Historical record, frozen at merge; the current truth is `specs/mission.md` and `specs/tech-stack.md`. Not superseded.

## Context

Phases 1–4 delivered the pure evaluator, MongoDB persistence with seed data, the HTTP API and the
admin UI (`/`, `/flags/new`, `/flags/[key]`, `/users`). The admin works, but its edges are rough:
a successful save gives no feedback beyond a refresh, failures are ad-hoc red text
(`Save failed: …`), pages render nothing while MongoDB is slow, an unreachable database ends in
Next's default error page after the driver's 30 s timeout, empty lists are plain dashed boxes, and
the README is the original eight-line task statement.

The mission's users act during incidents ("flip the kill switch during an incident") and tune
rollouts without a deploy, so they need to *see* that a change took effect and *understand* when it
didn't. "Simple to run" also asks for a README that gets a new developer from clone to a working
stack and API calls. This phase adds no new behaviour to the domain; it makes the existing app
explain itself. The one API change is to the test reset: it only clears flags and sticky
assignments and no longer freezes the clock, so it can be offered as a "start over" button in the
dev stack without stopping time for every later audit entry.

## Scope

### 1. shadcn components

`npx shadcn@latest add skeleton alert sonner empty`. The generated `sonner.tsx` imports
`next-themes`; the wrapper is edited to drop that import and use `theme="light"` instead of adding
a dependency.

**White theme only.** The app always renders the light (white) theme: the unused `.dark` block and
`@custom-variant dark` are removed from `src/app/globals.css`, generated components keep no
`dark:` utilities that could apply, `<html>` never gets a `dark` class, and `color-scheme: light`
is set so native controls and scrollbars stay light even when the OS prefers dark. Sonner and
`global-error.tsx` use the light theme explicitly.

### 2. Success toasts with details (item 33)

- `<Toaster />` (Sonner) is mounted once in `src/app/layout.tsx`, bottom-right, auto-dismissing.
- Every successful admin write shows a toast with a **title and a description summarising the
  change**. Toasts are used **only for success**; failures are Alerts (§3).
- The text comes from pure helpers in `src/lib/toast-messages.ts` (unit-tested), each returning
  `{ title, description }`:

| Write | Helper | Title | Description |
|-------|--------|-------|-------------|
| Create flag (`/flags/new`) | `flagSavedToast(null, flag)` | `Created <key>` | every field, e.g. `live · 100% · include: none · exclude: none · sticky: no` |
| Save "Rollout rules" | `flagSavedToast(before, after)` | `Saved <key>` | changed fields as `percentage: 10% → 25%; sticky: no → yes`, or `No changes` |
| Kill | `killSwitchToast(key, false)` | `Killed <key>` | `Every evaluation returns false (KILL_SWITCH).` |
| Revive | `killSwitchToast(key, true)` | `<key> is live again` | `Rollout rules apply again.` |
| Delete | `flagDeletedToast(key)` | `Deleted <key>` | `Sticky assignments were removed; its history is kept.` |
| Save a user's cohorts | `userCohortsToast(name, before, after)` | `Saved cohorts for <name>` | `added: tester; removed: user` (either part omitted when empty), or `No changes` |
| Reset (header) | `resetToast(now)` | `Reset complete` | `Flags and sticky assignments cleared at <ISO now>. Audit history, users and cohorts are kept.` |

- Field values are formatted with the existing `formatFieldValue` from `src/lib/audit-diff.ts`, so
  toasts and the audit history read the same.
- The toast is fired after the write succeeds and survives the following `router.push("/")` /
  `router.refresh()` (the Toaster lives in the root layout).
- "Try it" shows no toast: its result badge already is the feedback.

### 3. Error Alerts (item 33)

The ad-hoc `<p role="alert" class="text-destructive">… failed: …</p>` messages are replaced with
the shadcn `Alert` (`variant="destructive"`, `CircleAlert` icon, title + description):

| Where | Alert placement | Title |
|-------|-----------------|-------|
| Flag form (create and edit) | above the Save / Create button, inside the form | `Could not save <key>` / `Could not create flag` |
| User cohorts row | below the row's cohort editor | `Could not save cohorts for <name>` |
| Try it | inside the card, in place of the result | `Evaluation failed` |
| Delete dialog | inside the `AlertDialog` (dialog stays open) | `Could not delete <key>` |
| Kill switch (list rows and detail header) | **page-level** Alert at the top of `<main>` | `Could not kill <key>` / `Could not turn <key> back on` |
| Reset (header) | **page-level** Alert; the confirmation dialog closes | `Could not reset` |

- The description is the API client's `error` text. Field-level validation errors stay under their
  fields as today.
- **Page-level alert**: `src/components/page-alert.tsx` — a client `PageAlertProvider` (in the root
  layout, wrapping `<main>` content) with a `usePageAlert()` hook exposing `show({ title,
  description })` and `clear()`. It renders one dismissible destructive `Alert` above the page
  content; it is cleared on dismiss, on navigation (pathname change) and when the next kill-switch
  write starts. The kill confirmation dialog closes on failure and the page-level Alert explains
  why.
- An Alert for a form is cleared when that form is submitted again.

### 4. Loading skeletons (item 33)

Route-level `loading.tsx` files built from `Skeleton`, mirroring each page's layout so content does
not jump when it arrives:

| File | Shape |
|------|-------|
| `src/app/loading.tsx` | Flags list: title + button, table header and ~5 rows |
| `src/app/flags/[key]/loading.tsx` | Key heading + switch, "Rollout rules" and "Try it" cards, audit card |
| `src/app/flags/new/loading.tsx` | Create form card |
| `src/app/users/loading.tsx` | Users table with ~5 rows |

Skeletons have `aria-busy="true"` on their container and an `sr-only` "Loading…" label.

### 5. Error pages (item 33)

Following this Next.js version's file conventions (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`):

- `src/app/error.tsx` (client): a destructive `Alert` "Something went wrong" with a short
  explanation ("The page could not be loaded. If MongoDB is unavailable, start it and try again.")
  and a **Try again** button calling the **`retry()`** prop (re-fetches and re-renders the segment;
  not `reset()`). Shows `error.digest` when present, for matching server logs. The header stays
  visible because the root layout is above the boundary.
- `src/app/global-error.tsx` (client): the root-layout fallback; renders its own `<html>`/`<body>`,
  imports `globals.css`, sets `<title>`, uses the light theme, and shows the same message and Try
  again button.
- `src/app/not-found.tsx`: an `Empty` "Flag not found" / "Page not found" style page ("This page
  does not exist, or the flag was deleted.") with a "Back to flags" link. Used by `notFound()` for
  unknown or invalid flag keys and for unknown URLs.

### 6. MongoDB server-selection timeout (supports §5)

- `loadConfig` gains `MONGODB_SERVER_SELECTION_TIMEOUT_MS` — optional, positive integer, default
  `5000`; invalid values throw like the other variables. `DataConfig` gains
  `serverSelectionTimeoutMs`.
- `src/data/client.ts` passes it to `new MongoClient(uri, { serverSelectionTimeoutMS })`, so an
  unreachable database fails a request in ~5 s and `error.tsx` appears instead of a 30 s hang.
- Documented in the README and `tech-stack.md`; compose files need no change (the default applies).

### 7. Empty states (item 33)

Replace the dashed text boxes with the shadcn `Empty` component (icon, title, description, optional
action):

| Where | Icon | Title / description | Action |
|-------|------|---------------------|--------|
| `/` with no flags | `Flag` | "No flags yet" / "Create a flag to start a rollout." | "New flag" button |
| `/users` with no users | `Users` | "No users" / "Run `npm run seed` to add the demo users." | — |
| Audit history with no entries | `History` | "No changes recorded yet" / "Every save, kill and delete will appear here." | — |
| Try it with no users | `UserX` | "No users to evaluate" / "Seed the demo users first." | — |

### 8. README (item 34)

Rewrite `README.md` as a full developer guide:

1. **Overview** — what the tool does (four capabilities), links to `specs/mission.md`,
   `specs/tech-stack.md`, `specs/roadmap.md`.
2. **Quick start** — `docker compose up --build`, open `http://localhost:3000`; what the `seed`
   service creates.
3. **Development** — Node ≥ 22.2 (24 recommended), `npm ci`, the dev compose override
   (`docker-compose.dev.yml`: test endpoints on, Mongo port exposed), `npm run dev` against it,
   `.env` variables (`MONGODB_URI`, `MONGODB_DB`, `MONGODB_SERVER_SELECTION_TIMEOUT_MS`,
   `ENABLE_TEST_ENDPOINTS`), every npm script, unit vs. integration tests and the coverage gate.
4. **Evaluation rules** — the precedence table and the bucket formula in brief (link to
   `mission.md` as the source of truth).
5. **HTTP API** — one `curl` example per endpoint with its expected response: `PUT
   /api/flags/:key` (create and update, with and without `X-User-Id`), `POST
   /api/flags/:key/evaluate` (one example per interesting reason), `GET /api/flags/:key/audit`,
   `DELETE /api/flags/:key`, `PUT /api/users/:userId/cohorts` (using a seeded user id),
   `POST /api/test/reset` (clears flags + sticky; `now` is the recorded reset time, the clock is
   not frozen); plus a `400` example and the `{ error, issues }` shape.
6. **Admin UI** — the four pages and what each does, and the header Reset button (dev stack only).
7. **Troubleshooting** — port 3000/27017 already in use; integration tests failing because Mongo's
   port isn't exposed (use the dev override); `npm run build` with the compose `app` running (shared
   `.next`); a leftover host `next dev` locking `.next/dev`; restarting the dev `app` container
   after server-side changes (services cached on `globalThis`); `/api/test/reset` answering `404`
   when `ENABLE_TEST_ENDPOINTS` isn't `true`; slow first page when Mongo is down (the timeout).

Every `curl` example is run once against the dev stack and its documented response copied from the
real output.

### 9. Reset no longer freezes the clock (API change)

Reset is "clear flags + sticky", not pause/resume: time keeps running.

- `POST /api/test/reset { now }`: `now` stays **required** (ISO-8601; missing or invalid → `400`,
  as today) and is **recorded as the reset time**: returned in the response `200 { now }` and logged
  by the server (`console.info("Reset flags and sticky assignments at <now>")`). It has **no effect
  on the clock**. Still served only when `ENABLE_TEST_ENDPOINTS` is `"true"`; audit, users and
  cohorts are kept; seed flags are not re-inserted.
- `ResetService.reset(now)` only calls `resetFlagsAndAssignments(db)` and records `now`;
  `ResetServiceDeps` loses `freezeClock`.
- `src/server/clock.ts` loses `freezeClock` / `unfreezeClock` and the `globalThis` delegate;
  `appClock` is the system clock. `frozenClock` stays in `src/domain` for tests.
- Tests that need exact audit `at` values (Phase 3 API tests, server tests) build their services
  with `frozenClock(...)` and install them with `setServicesForTesting`, instead of relying on the
  reset. The Phase 3 test "reset with `now` gives exact `at` values" becomes "reset answers
  `{ now }` and later audit entries use the real clock" (an entry written after a reset with a past
  `now` has an `at` after that `now`).

### 10. Header Reset button

- `src/components/reset-button.tsx` (client): a `destructive`-outline button with a
  `RotateCcw` icon and the label "Reset", at the right end of the header in `src/app/layout.tsx`.
- Rendered **only when `testEndpointsEnabled()`** is true (checked in the layout, a Server
  Component, per request); the production `docker-compose.yml` therefore shows no button.
- Click → `AlertDialog`: "Reset all flags? Every flag and sticky assignment is deleted. Audit
  history, users and cohorts are kept. Seed flags return on the next `npm run seed`." Cancel /
  **Reset** (`PendingButton` spinner, width kept).
- Confirm → `resetData(now)` in `src/lib/api-client.ts`: `POST /api/test/reset` with `{ now:
  now.toISOString() }`; `now` comes from `systemClock.now()` (`src/domain`), so `src/lib` does not
  read the wall clock directly. Result `{ ok: true, now }` or `{ ok: false, error, issues }`, never
  throws.
- Success → `resetToast(now)`, then `router.push("/")` + `router.refresh()`, so the flags list shows
  its empty state. Failure (incl. `404` when the endpoint is off) → dialog closes, page-level Alert
  `Could not reset`.
- Clear only: the demo flags are **not** re-seeded.

## Out of scope

- Error toasts (errors are Alerts by decision) and toasts for "Try it".
- Dark mode of any kind (toggle, OS-preference) / `next-themes`.
- Re-seeding the demo flags from the Reset button; a reset in the production stack.
- Per-section `Suspense` boundaries; streaming parts of the detail page separately.
- Component tests (React Testing Library / jsdom) and browser e2e tests.
- An automated smoke script for the README's `curl` examples.
- Any change to the domain, the data model or the API contract other than the reset no longer
  freezing the clock (§9) and the client timeout option (§6).
- The `/demo` page and the "Acting as" selector (Phase 6).

## Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Feedback channel | **Toasts for success, Alerts for errors** | A success is transient confirmation; an error must stay visible until the user acts on it. |
| Toast content | **Title + description with details** of what changed (diff for saves, cohort adds/removes for users) | Confirms the *right* change was applied, not just that something was saved. |
| Toast text | Pure, unit-tested helpers in `src/lib/toast-messages.ts`, reusing `diffFlags` / `formatFieldValue` | Keeps logic in the 100%-covered layer; consistent wording with the audit history. |
| Kill-switch errors | **Page-level Alert** at the top of the page | Rows and the detail header have no room for an Alert; one place for these failures. |
| Delete errors | Alert inside the confirmation dialog | The dialog is already open and is where the user acted (as in Phase 4). |
| Loading | **Route `loading.tsx` skeletons** per page | Matches the page shape with little code; no Suspense refactoring. |
| Error pages | **`error.tsx` + `global-error.tsx` + `not-found.tsx`**; Try again uses `retry()` | This Next.js version's recommended recovery re-fetches the segment, so a restarted Mongo recovers without a reload. |
| DB timeout | **`MONGODB_SERVER_SELECTION_TIMEOUT_MS`**, default 5000 | The error page should appear within seconds; configurable for slow environments. |
| Empty states | shadcn **`Empty`** component | Consistent, actionable empty states (CTA on the flags list). |
| Theme | **White (light) only**; dark CSS removed, `color-scheme: light`, Sonner `theme="light"` without `next-themes` | One look everywhere, regardless of OS preference; avoids a dependency. |
| Reset semantics | **Clears flags + sticky; never freezes the clock.** `now` stays required and is recorded as the reset time (response + server log) | Reset is "start over", not pause/resume; audit times must keep moving after it. |
| Deterministic test times | Tests inject `frozenClock` via `setServicesForTesting` | Replaces the reset-based freeze. |
| Reset button | In the header, **only when `ENABLE_TEST_ENDPOINTS=true`**, behind an `AlertDialog`; clear only, no re-seed | A destructive dev tool must not appear in production and must not be one click away. |
| README | **Full guide + troubleshooting**; `curl` examples verified manually | New developers need setup *and* the known pitfalls found in Phases 0–4. |
| Testing | Test-first for `src/lib/toast-messages.ts` and the config option; components via `build` + manual checks | Same split as Phase 4; no jsdom/RTL tooling. |
| Workflow | Feature-by-feature task groups, one commit each | As in earlier phases. |
