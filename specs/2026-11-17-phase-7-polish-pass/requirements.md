# Phase 7 — Polish pass: Requirements

Branch: `fix/polish`
Roadmap: `specs/roadmap.md` → Phase 7, items 38–43.
Status: In progress

## Context

Phases 0–6 are merged: the pure evaluator, MongoDB persistence and seed, the HTTP API, the admin
UI, the Phase 5 polish and the `/demo` client page. Lint, typecheck and the 100% coverage gate are
green. A review of the whole repository on 2026-11-17 (backend, UI and specs read against the code)
found no broken feature, but it did find:

- rare races and extra round trips in the data and service layers;
- UI paths that drop user input or show stale answers (a kill-switch flip discards unsaved rule
  edits; "Try it" can show the previous user's answer; `/demo` rows can stay as skeletons);
- accessibility gaps (one `<title>` for every page, unlinked form errors, low-contrast badges);
- duplicated UI code and dead code;
- specs that drifted from the code: the top-level documents (`mission.md`, `tech-stack.md`,
  `roadmap.md`) are meant to be the current source of truth, but they still list "deleting flags"
  as out of scope, show `after: Flag` for audit entries and require Node ≥ 22.2 where the project
  pins Node 24.

This phase fixes those without changing the product's behaviour or the HTTP contract, except for
the stricter request validation in R7.5–R7.7.

Requirement IDs (`R7.n`) are referenced by `plan.md` and `validation.md` (`V7.n`).

## Scope

### Item 38 — Data and service hardening

- **R7.1 A re-created flag starts fresh.** An evaluation that read a flag just before a delete or
  reset can store a sticky assignment after `deleteByFlag` ran. `FlagService.put` therefore also
  calls `assignments.deleteByFlag(key)` when the upsert *created* the flag (`before === null`).
- **R7.2 `insertIfAbsent` never 500s on a vanished winner.** In the duplicate-key fallback, if the
  re-read finds nothing (a delete or reset ran in between), it answers the caller's `value`.
- **R7.3 Fewer round trips in evaluate.** The service runs the pure `evaluate(flag, ctx)` first
  and reads the sticky assignment only when the result would come from the percentage rule of a
  sticky flag (`persist: true`). It then re-evaluates with the stored value (`STICKY`), or stores the
  result. Killed, excluded and included evaluations of sticky flags no longer read `assignments`.
  The domain function is unchanged.
- **R7.4 Audit index covers the sort.** The `audit` index becomes `{ key: 1, at: 1, _id: 1 }`,
  matching `listByKey`'s sort, so the query needs no in-memory sort.
- **R7.5 Bounded request input.** `userId` and each cohort are at most **200** characters after
  trimming. Each cohort array has at most **100** entries, counted after de-duplication. An
  `X-User-Id` longer than 200 characters answers `400 { error: "Invalid X-User-Id header" }`.
  Otherwise any client could bloat stored assignments and the audit log.
- **R7.6 Non-object bodies explain themselves.** When the body is valid JSON but not an object
  (`"x"`, `null`, `[]`), the 400's `issues` carries the root message under `body`, for example
  `{ body: ["Invalid input: expected object, received string"] }`, instead of `{}`.
- **R7.7 Users route validates the id.** `PUT /api/users/:userId/cohorts` checks `:userId` with
  `UserIdSchema` (a UUID). Anything else answers
  `400 { error: "Invalid user id", issues: { userId } }` before the body is parsed. A well-formed
  but unknown id still answers 404.
- **R7.8 One lookup to select a demo user.** `CatalogService.user(userId)` (backed by
  `users.get`) replaces loading every user in `selectDemoUser`.

### Item 39 — Docker and tooling

- **R7.9 Leaner build context and image.**
  - `.dockerignore` also excludes `coverage`, `tsconfig.tsbuildinfo`, `.claude`, `.vscode`,
    `.idea`, `*.md` and `next-env.d.ts`.
  - `npm ci` and `next build` use BuildKit cache mounts.
  - The `seed` stage runs as the non-root `node` user.
- **R7.10 The dev stack does not share `.next` with the host.** `docker-compose.dev.yml` adds an
  anonymous `/app/.next` volume, so a host `next dev`/`next build` and the container never fight
  over `.next/dev`.
- **R7.11 Build-time-only packages are dev dependencies.** `shadcn` and `tw-animate-css` are only
  `@import`ed by `globals.css` at build time, so they move to `devDependencies`. `cn` stays in
  `dependencies` (runtime).
- **R7.12 Formatting is clean.** `docker-compose.yml` passes `prettier --check`.

### Item 40 — UI correctness

- **R7.13 The kill switch never discards unsaved rule edits.** The flag page keys `FlagForm` on
  the flag *without* `enabled` and passes the stored `enabled` as a prop. In edit mode the form
  sends that prop with its rules, so a save after a kill-switch flip neither revives a killed flag
  nor loses edits.
- **R7.14 The kill switch stays pending until the refresh lands.** `router.refresh()` runs in a
  transition. The switch stays disabled with a spinner, and the dialog stays open, until the new
  state has rendered.
- **R7.15 "Try it" never shows a stale answer.** Only the latest request's result is shown.
  Changing the user or cohorts while a request is in flight discards its answer.
- **R7.16 `/demo` follows fresh props.** A run starts whenever the selected user, that user's
  stored cohorts or the set of stored flag keys changes, for example after the cookie Server
  Function re-renders the page with a newly created flag. No row stays a skeleton indefinitely.
- **R7.17 No legacy flash on the first `/demo` load.** Until the first run has arrived, the
  storefront shows a skeleton instead of the fully legacy store.
- **R7.18 Small behaviour fixes.**
  - The Users page enables Save only when the cohort *set* changed, so the same cohorts in a new
    order count as unchanged.
  - Clicking a list row does nothing while text is selected, so drag-selecting a key does not
    navigate.
  - Reset only refreshes when the current page is `/`; otherwise it navigates to `/`.

### Item 41 — Accessibility and metadata

- **R7.19 Every page has its own title.** The root layout sets the title template
  `%s · Feature flags`, with the default `Flags · Feature flags`. The pages set their own titles:
  `/users` → `Users`, `/flags/new` → `New flag`, `/flags/[key]` → the key, `/demo` → `Demo`,
  not found → `Not found`.
- **R7.20 Form messages are announced and linked.**
  - In `FlagForm`, every hint, error and warning has an id. The control references them with
    `aria-describedby`.
  - Errors use `role="alert"`.
  - After a failed client-side validation, focus moves to the first invalid field.
- **R7.21 AA contrast.**
  - The "on"/"true" badge uses `bg-emerald-700`. The "off"/"false" badge keeps `bg-red-600`, which
    passes AA.
  - The overlap warning uses `text-amber-700`.
- **R7.22 Section headings.** The "Rollout rules", "Try it" and "History" card titles render as
  `<h2>`.
- **R7.23 Live regions exist before their content.**
  - The Try it result and the storefront's order, support and cart messages sit in containers that
    are always rendered.
  - The cart count has an accessible label ("Cart: N items").

### Item 42 — UI cleanup

- **R7.24 One component per repeated piece.**
  - `EnabledBadge` replaces the two copies of the green/red result badge, labelled `on`/`off`
    everywhere.
  - `UserSelect` (the select with cohort badges per option) is shared by `TryIt` and
    `ActorSelect`.
  - One `UserOption` type replaces `TryItUser`, `ActorOption` and `UserRowData`.
  - `NoUsersEmpty` replaces three "no users" empty states, with one text
    ("Run `npm run seed` …").
  - `cohortOptions(cohorts)` replaces three copies of the `{ key, name }` mapping.
- **R7.25 Dead code removed.**
  - `KillSwitch`'s unused `showLabel` prop.
  - The unused sidebar and chart tokens in `globals.css`.
  - The per-page `export const dynamic = "force-dynamic"`, which the root layout already sets.
- **R7.26 Phone-width flags table.** The Sticky, Include and Exclude columns are hidden below
  `sm`, as the list skeleton already does. On `/users`, the user id column is hidden below `md`.

### Item 43 — Specs and docs in sync

- **R7.27 Top-level specs are current.**
  - `mission.md`:
    - deleting flags is in scope;
    - the users, `/users` and `/demo` capabilities are listed;
    - a **Glossary** of the overloaded terms is added (enabled, kill switch, sticky, assignment,
      bucket, cohort, actor, reason, seed, reset, legacy variant).
  - `tech-stack.md`:
    - Node 24 and the framework versions;
    - audit `after: Flag | null`;
    - no `description` field;
    - the audit index;
    - `src/components/demo` and `cohort-options.ts`;
    - the interactive storefront;
    - the input limits and the users-route validation;
    - the one-Server-Function rule;
    - the evaluate read order.
  - `roadmap.md`:
    - the Node version;
    - item 27 rewritten for the non-freezing reset;
    - the item 36 and Phase 4 wording fixed;
    - the Phase 6 follow-ups;
    - a link from every phase to its spec directory;
    - the rule that dated specs are frozen at merge;
    - Phase 7.
- **R7.28 Dated specs are labelled historical records.**
  - Every earlier phase's `requirements.md` gets a `Status:` line: complete, the merge date and
    what was later superseded.
  - Their markdown defects are fixed (Phase 0 scope item placement, Phase 6 `2a.` list item,
    Phase 2 broken sentence).
  - Their content is otherwise left as written. Checkboxes in earlier `validation.md` files are
    not ticked retroactively: the status line records the merge, and the checks were not re-run.
- **R7.29 The spec skill encodes the conventions.**
  - `.claude/skills/feature-spec/SKILL.md` covers non-roadmap work: add a roadmap phase first, and
    use a `fix/<slug>` branch for fixes and polish.
  - It requires the `Status:` line and `R`/`V` IDs.
  - It makes the last plan group sync mission, tech stack and roadmap.
- **R7.30 README and changelog.** The README notes the input limits and fixes its broken inline
  command. `CHANGELOG.md` gets this branch's entries through the changelog skill.

## Out of scope

- **Transactions** for flag write + audit append, or for concurrent PUT ordering. The compose
  `mongo` is a standalone server without transactions. The gap (a failed audit append after a
  successful write) is documented in `tech-stack.md` as a known limitation.
- **Making the `ff_demo_user` cookie non-`Secure` over plain HTTP** on non-localhost hosts. The
  Phase 6 decision stands; the limitation is documented.
- Removing repository methods that only tests use (`users.create`/`update`/`delete`/`clear`,
  `cohorts.*`). Roadmap item 20 specifies them.
- Audit pagination; a back link or Delete on the flag page; a Cancel link on `/flags/new`; focus
  management for the storefront assistant popover.
- Component tests (jsdom). UI changes are verified by build and manual checks, as in Phases 4–6.
- Rewriting earlier `CHANGELOG.md` sections.

## Decisions

| # | Decision | Why |
|---|----------|-----|
| 1 | One phase, items 38–43, on the existing `fix/polish` branch | The fixes are small and independent; numbering them keeps the roadmap → spec → test chain intact |
| 2 | Fix the sticky race (R7.1) by clearing assignments on create, not with a generation field | One extra `deleteMany` on the rare create path; no data-model change |
| 3 | Keep the domain `evaluate` signature; reorder the reads in the service (R7.3) | The domain stays the pure source of truth; only I/O moves |
| 4 | Limits of 200 characters and 100 cohorts (R7.5) | Generous for real ids (UUIDs are 36) and cohort keys, yet they bound storage per request |
| 5 | Root body issues under `body` (R7.6) | Keeps `issues` a field map like every other 400; no flag field is named `body` |
| 6 | Keep `force-dynamic` on the route handlers, drop it from pages | The layout covers the pages; the handlers are documented as `force-dynamic` and a later `cacheComponents` migration would revisit both |
| 7 | Do not tick earlier phases' checkboxes | Ticking boxes nobody re-ran would be false evidence; the status line records the merge instead |
| 8 | Leave the old `{ key, at }` audit index in existing databases | `ensureIndexes` only creates indexes; the old one is harmless, and a fresh volume or `db.audit.dropIndex("key_1_at_1")` removes it |
