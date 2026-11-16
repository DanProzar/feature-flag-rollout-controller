# Phase 4 — Admin UI: Validation

The phase is done and can be merged into `main` when every check below passes on a clean checkout.

## Local checks (Node 24)

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo
npm ci
npm run lint            # exits 0, no warnings
npm run typecheck       # exits 0
npm run format:check    # exits 0
npm test                # unit tests only; passes with Mongo stopped, exits 0
npm run test:int        # exits 0
npm run test:all        # exits 0
npm run test:coverage   # 100% for src/domain, src/data, src/server, src/app/api, src/lib (excl. utils.ts); exits 0
npm run build           # exits 0; `/`, `/users`, `/flags/new` and `/flags/[key]` are dynamic (ƒ)
```

Run `npm run build` with the compose `app` stopped: it shares `.next` with the host through the
bind mount.

## Boundary checks

```sh
# Domain stays pure.
grep -rnE 'from "' src/domain --include=*.ts --exclude-dir=tests | grep -vE 'from "(\./|node:zlib")'  # no output
# UI never imports the data layer or the driver; it reads through src/server.
grep -rnE 'from "(@/data|mongodb)|from "\.\./.*data"' src/app src/components src/lib --include=*.tsx --include=*.ts --exclude-dir=api  # no output
# Client components never import server code.
grep -rl '"use client"' src/components src/app | xargs grep -nE 'from "@/server' # no output
# Phase 3's four routes plus the users cohorts route (DELETE shares the flag route file).
find src/app/api -name route.ts | wc -l  # 5
# Nothing outside src/domain/clock.ts reads the wall clock in server code.
grep -rnE 'new Date\(\)|Date\.now\(' src --include=*.ts --exclude-dir=tests | grep -v '^src/domain/clock.ts'  # no output
# The admin no longer uses the "Acting as" actor (kept for the Phase 6 demo page).
grep -rnE 'ActorSelect|readActor' src/app src/components --include=*.tsx | grep -v 'src/components/actor-select.tsx'  # no output
```

## Required tests

Read side
- [ ] `FlagsRepository.list`: empty → `[]`; all flags sorted by key, as domain `Flag`s.
- [ ] `FlagService.get` / `list`; `CatalogService.cohorts` / `users` return the seeded catalogue.

Delete a flag (review 13)
- [ ] `FlagsRepository.delete`: returns the deleted flag; `null` when there is none; other flags
      untouched.
- [ ] `AssignmentsRepository.deleteByFlag`: removes every user's value for that flag only.
- [ ] Audit repository round-trips an entry with `after: null`.
- [ ] `FlagService.delete`: deletes the flag and its assignments and audits
      `{ before: flag, after: null }` with the actor; unknown key → `null`, no audit entry.
- [ ] `DELETE /api/flags/:key`: `200 { flag }`, flag and assignments gone, audit entry with the
      `X-User-Id` actor; unknown key → `404 { error: "Flag not found" }` with nothing written;
      invalid key → `400`.

User cohorts (review 1)
- [ ] `UsersRepository.setCohorts`: replaces only cohorts; unknown user → `null`, nothing created.
- [ ] `CatalogService.setUserCohorts`: updates the user; unknown user → `null`.
- [ ] `UserCohortsBodySchema`: trims and de-duplicates; rejects a missing, non-array or blank-entry
      `cohorts`.
- [ ] `PUT /api/users/:userId/cohorts`: `200 { user }` (trimmed, de-duplicated); empty list
      allowed; unknown user → `404 { error: "User not found" }`; invalid body → `400` with the user
      unchanged.

UI helpers
- [ ] `flag-form`: defaults (live, **100%**, non-sticky, no cohorts); flag ↔ form ↔ PUT body
      round-trip; key format and duplicate-key (create only) errors; percentage bounds and integer
      check; include/exclude overlap is a warning; `400` issues mapped onto fields.
- [ ] `withIncludeCohorts`: adding `user` → 0%; removing `user` → 100%; other changes keep the
      percentage.
- [ ] `cohort-options`: catalogue then selected items, once each; a "create" item only for new,
      non-blank typed text; `createItem` ↔ `createdCohort`; `itemsToCohorts` unwraps, trims and
      de-duplicates.
- [ ] `audit-diff`: create and delete list every field; changed fields only; array compare by
      value; identical → `[]`; `key` never listed.
- [ ] `api-client`: request method, URL, headers and body for `putFlag`, `deleteFlag`,
      `evaluateFlag` and `setUserCohorts`; `X-User-Id` only with an actor for put/delete, the
      trimmed `userId` for evaluate (none when blank), never for `setUserCohorts`;
      `200`/`400`/`404`/`500`/network failure results.
- [ ] `actor`: round-trip, clear, unavailable storage tolerated.

## Manual checks

Run against `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` (seeded).
After pulling server-side changes into a running dev container, restart it
(`docker restart feature-flags-app-1`): the services are cached on `globalThis` across hot reloads.

- [ ] **Header (review 2)**: no "Acting as"; "Flags" / "Users" links highlight the current
      section.
- [ ] **List (28)**: `/` shows the seed flags sorted by key with kill state, percentage, sticky and
      cohort badges and a trash-bin button per row; after `POST /api/test/reset` the empty state
      appears.
- [ ] **Row click (review 14)**: clicking a row outside its controls opens the flag; the switch,
      its label, the trash button and clicks inside the dialogs do not navigate; the key link still
      works from the keyboard.
- [ ] **Delete (review 13)**: the trash button opens a confirmation; Cancel changes nothing; Delete
      shows a spinner without the button changing width, the row disappears; evaluating the key
      gives `FLAG_NOT_FOUND`; re-creating the key shows the deletion in its history and does not
      reuse old sticky results.
- [ ] **Create (29, review 7, 11, 12)**: `/flags/new` starts at 100%; adding `user` to Include
      cohorts drops it to 0% (still editable), removing `user` returns it to 100%; picking a
      catalogue option or the "Add …" option for free text adds the chip at once and clears the
      input, with no "+ Add" button; Create flag shows a spinner at the same width and returns to
      `/`, where the new flag is listed; its history shows "created" by "anonymous".
- [ ] **Validation (29)**: invalid key (`Bad Key`), an existing key, and percentage out of range
      show field errors and send no request (check the network tab).
- [ ] **Edit (29, review 9)**: changing percentage and cohorts saves; Save shows a spinner at the
      same width; the page refreshes with the new values; the key is read-only.
- [ ] **Kill switch (30)**: on the list and the detail page, turning a live flag off opens the
      confirmation; Cancel changes nothing; Kill flag shows a spinner at the same width, then
      "Killed", and Try it returns `KILL_SWITCH`; turning it back on applies without a dialog. Each
      change adds one audit entry.
- [ ] **Try it (31, review 3–8)**: the label reads "User"; each option shows the user's cohort
      badges; there is no free-text user and the "User id" field is read-only; choosing a user
      fills the id and cohorts; adding a cohort works like the other cohort editors; Evaluate is
      disabled until a user is chosen and keeps its width while pending; the request carries
      `X-User-Id: <userId>` (network tab); seeded users against seed flags give the reasons in the
      Phase 2 table; a seeded user on a sticky flag gives `PERCENTAGE` then `STICKY`; the result
      badge is green for `true` and red for `false`.
- [ ] **Users (review 1, 9)**: `/users` lists the seeded users with name, id and cohorts; Save is
      enabled only after a change; saving shows a spinner at the same width, persists (reload), and
      Try it then starts from the new cohorts; an empty cohort list can be saved.
- [ ] **Audit (32)**: newest first; time, actor, and `field: before → after` rows; a save with no
      changes shows "no changes"; a flag with no history shows the empty state.
- [ ] `/flags/does-not-exist` and `/flags/Bad%20Key` show the not-found page.
- [ ] Browser console and app logs show no errors or hydration warnings during the checks above.
- [ ] Layout works at 375 px width (tables scroll horizontally inside their container, forms
      stack).

## Review checklist

- [ ] Pages read through `getServices()`; all writes go through `PUT`/`DELETE /api/flags/:key`
      (audited) or `PUT /api/users/:userId/cohorts`.
- [ ] No Server Actions, and no `src/data` imports from UI code.
- [ ] Components come from shadcn/ui (`src/components/ui`) with Tailwind utilities only; icons from
      `lucide-react`.
- [ ] The kill-switch dialog appears only when killing; deleting always asks first.
- [ ] No button changes width while pending; no "…" labels remain.
- [ ] Try it discloses that sticky flags store an assignment.
- [ ] The "Rollout rules" save alert is listed under Phase 5 in `roadmap.md`; "Acting as" under
      Phase 6.
- [ ] `tech-stack.md` and `mission.md` updated; Phase 4 marked complete; `CHANGELOG.md` entry added.
- [ ] Each task group from `plan.md` is its own commit on `feature/phase-4-admin-ui`.
