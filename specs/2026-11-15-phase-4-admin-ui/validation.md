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
npm run build           # exits 0; `/`, `/flags/new` and `/flags/[key]` are dynamic (ƒ)
```

## Boundary checks

```sh
# Domain stays pure.
grep -rnE 'from "' src/domain --include=*.ts --exclude-dir=tests | grep -vE 'from "(\./|node:zlib")'  # no output
# UI never imports the data layer or the driver; it reads through src/server.
grep -rnE 'from "(@/data|mongodb)|from "\.\./.*data"' src/app src/components src/lib --include=*.tsx --include=*.ts --exclude-dir=api  # no output
# Client components never import server code.
grep -rl '"use client"' src/components src/app | xargs grep -nE 'from "@/server' # no output
# No new API routes besides Phase 3's four.
find src/app/api -name route.ts | wc -l  # 4
# Nothing outside src/domain/clock.ts reads the wall clock in server code.
grep -rnE 'new Date\(\)|Date\.now\(' src --include=*.ts --exclude-dir=tests | grep -v '^src/domain/clock.ts'  # no output
```

## Required tests

- [ ] `FlagsRepository.list`: empty → `[]`; all flags sorted by key, as domain `Flag`s.
- [ ] `FlagService.get` / `list`; `CatalogService.cohorts` / `users` return the seeded catalogue.
- [ ] `flag-form`: defaults; flag ↔ form ↔ PUT body round-trip; key format and duplicate-key
      (create only) errors; percentage bounds and integer check; include/exclude overlap is a
      warning; `400` issues mapped onto fields.
- [ ] `audit-diff`: create lists every field; changed fields only; array compare by value;
      identical → `[]`; `key` never listed.
- [ ] `api-client`: request shape, `X-User-Id` only with an actor, `200`/`400`/`500`/network
      failure results for `putFlag` and `evaluateFlag`.
- [ ] `actor`: round-trip, clear, unavailable storage tolerated.

## Manual checks

Run against `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` (seeded).

- [ ] **List (28)**: `/` shows the 5 seed flags sorted by key with kill state, percentage, sticky
      and cohort badges; after `POST /api/test/reset` the empty state appears.
- [ ] **Acting as**: pick a seeded user, reload — the choice is kept; "Anonymous" sends no header
      (audit shows "anonymous").
- [ ] **Create (29)**: `/flags/new` creates a flag via the slider, switches and cohort editors
      (catalogue suggestion and a free-text cohort); lands on its detail page; audit shows
      "created" with the acting user.
- [ ] **Validation (29)**: invalid key (`Bad Key`), an existing key, and percentage out of range
      show field errors and send no request (check the network tab).
- [ ] **Edit (29)**: changing percentage and cohorts saves, the page refreshes with new values, and
      the key is read-only.
- [ ] **Kill switch (30)**: on the list and the detail page, turning a live flag off opens the
      confirmation; Cancel changes nothing; Confirm shows "Killed", and Try it returns
      `KILL_SWITCH`; turning it back on applies without a dialog. Each change adds one audit entry.
- [ ] **Try it (31)**: seeded users against seed flags give the reasons in the Phase 2 table; a
      free-text user on a sticky flag gives `PERCENTAGE` then `STICKY`; an unknown cohort is
      accepted.
- [ ] **Audit (32)**: newest first; time, actor, and `field: before → after` rows; a save with no
      changes shows "no changes"; a flag with no history shows the empty state.
- [ ] `/flags/does-not-exist` and `/flags/Bad%20Key` show the not-found page.
- [ ] Browser console and app logs show no errors or hydration warnings during the checks above.
- [ ] Layout works at 375 px width (table scrolls horizontally inside its container, forms stack).

## Review checklist

- [ ] Pages read through `getServices()`; all writes go through `PUT /api/flags/:key`.
- [ ] No new API routes, Server Actions, or `src/data` imports from UI code.
- [ ] Components come from shadcn/ui (`src/components/ui`) with Tailwind utilities only; icons from
      `lucide-react`.
- [ ] The kill-switch dialog appears only when killing.
- [ ] Try it discloses that sticky flags store an assignment.
- [ ] `tech-stack.md` updated; Phase 4 marked complete; `CHANGELOG.md` entry added.
- [ ] Each task group from `plan.md` is its own commit on `feature/phase-4-admin-ui`.
