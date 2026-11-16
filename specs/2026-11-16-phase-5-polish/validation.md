# Phase 5 — Polish: Validation

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
# No new API routes.
find src/app/api -name route.ts | wc -l  # 5
# Nothing outside src/domain/clock.ts reads the wall clock in server code.
grep -rnE 'new Date\(\)|Date\.now\(' src --include=*.ts --exclude-dir=tests | grep -v '^src/domain/clock.ts'  # no output
# The ad-hoc inline failure texts are gone (errors use Alert).
grep -rnE '(Save|Delete|Evaluation) failed:|text-destructive' src/components --include=*.tsx --exclude-dir=ui  # no output
# Errors are never toasted.
grep -rn 'toast.error' src --include=*.tsx  # no output
# No theme dependency was pulled in by the sonner component.
grep -n 'next-themes' package.json src -r  # no output
# White theme only: no dark variant, no dark: utilities, no .dark block.
grep -rnE 'dark:|\.dark|custom-variant dark|theme="(dark|system)"' src  # no output
# Reset never freezes the clock.
grep -rnE 'freezeClock|unfreezeClock' src  # no output
# The four route skeletons and the three error/not-found files exist.
ls src/app/loading.tsx src/app/flags/\[key\]/loading.tsx src/app/flags/new/loading.tsx src/app/users/loading.tsx \
   src/app/error.tsx src/app/global-error.tsx src/app/not-found.tsx  # all listed
# error.tsx recovers with retry(), not reset().
grep -n 'retry' src/app/error.tsx src/app/global-error.tsx  # matches in both
```

## Required tests

Reset (API change)
- [ ] `ResetService.reset(now)`: clears flags and assignments; audit, users and cohorts kept;
      `appClock` still follows real time afterwards.
- [ ] `POST /api/test/reset`: `200 { now }` (normalised ISO); missing / invalid `now` → `400`;
      `404` unless `ENABLE_TEST_ENDPOINTS` is `"true"`; an audit entry written after a reset with a
      past `now` has an `at` later than that `now`.
- [ ] Tests asserting exact audit `at` values get them from a `frozenClock` injected via
      `setServicesForTesting`, not from the reset.
- [ ] `resetData(now)`: `POST /api/test/reset` with `{ now: <ISO> }` and no `X-User-Id`;
      `200` / `400` / `404` / `500` / network failure results.

Toast messages (`src/lib/tests/toast-messages.test.ts`)
- [ ] `flagSavedToast(null, flag)`: title `Created <key>`; description lists every field with
      `formatFieldValue` values.
- [ ] `flagSavedToast(before, after)`: title `Saved <key>`; only changed fields as
      `field: before → after`, in form order, joined with `; `; identical flags → `No changes`.
- [ ] `killSwitchToast`: kill → `Killed <key>` + KILL_SWITCH description; revive →
      `<key> is live again` + description.
- [ ] `flagDeletedToast`: title and description.
- [ ] `userCohortsToast`: added only; removed only; both; none and reorder-only → `No changes`.
- [ ] `resetToast(now)`: `Reset complete` with the ISO time and what was kept.

MongoDB timeout
- [ ] `loadConfig`: `MONGODB_SERVER_SELECTION_TIMEOUT_MS` defaults to `5000`; a positive integer
      string is parsed; `0`, negative, non-numeric and fractional values throw naming the variable.
- [ ] `getDb()` with an unreachable URI and a short timeout rejects within roughly that timeout,
      and a later call retries (no stuck cached failure).

Regression
- [ ] All Phase 1–4 tests still pass unchanged (other than the extended config test).

## Manual checks

Run against `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` (seeded).
Restart the dev `app` container after server-side changes (`docker restart feature-flags-app-1`).

Success toasts (detailed)
- [ ] **Create**: creating a flag returns to `/` and shows `Created <key>` with every field.
- [ ] **Save rules**: changing percentage 10 → 25 shows `Saved <key>` / `percentage: 10% → 25%`;
      saving without changes shows `No changes`.
- [ ] **Kill / revive**: on the list and the detail page, killing shows `Killed <key>`; turning it
      back on shows `<key> is live again`.
- [ ] **Delete**: shows `Deleted <key>` after the row disappears.
- [ ] **Users**: adding `tester` and removing `user` shows `Saved cohorts for <name>` /
      `added: tester; removed: user`.
- [ ] Toasts appear bottom-right, auto-dismiss, are white, and survive the navigation/refresh after
      the write. Try it shows no toast.

Reset button
- [ ] Dev stack (`ENABLE_TEST_ENDPOINTS=true`): the header shows "Reset" on every page; it opens a
      confirmation; Cancel changes nothing; Reset shows a spinner at the same width, then
      `Reset complete` with the time, lands on `/` with the empty state.
- [ ] After a reset, audit history is kept, users and cohorts are unchanged, and creating or
      editing flags a few seconds apart gives audit entries with **different, current** times.
- [ ] Production compose (`docker compose up --build`, `ENABLE_TEST_ENDPOINTS=false`): no Reset
      button in the header.
- [ ] A failing reset (e.g. Mongo stopped) closes the dialog and shows the page-level Alert
      `Could not reset`.

White theme
- [ ] With the OS (or DevTools "Emulate prefers-color-scheme: dark") set to dark, every page,
      dialog, select popup, toast, skeleton, error and not-found page stays white; native controls
      and scrollbars are light.

Error Alerts (simulate by stopping `mongo`, or by blocking the request in DevTools)
- [ ] **Flag form**: a failed save shows a destructive Alert above the button with the API error;
      submitting again clears it; no toast appears.
- [ ] **Kill switch**: a failed kill closes the dialog and shows the page-level Alert
      `Could not kill <key>` at the top of the page; it can be dismissed; it disappears on
      navigation and when the next kill-switch write starts. Same for a failed revive.
- [ ] **Delete**: a failed delete shows the Alert inside the dialog, which stays open.
- [ ] **Users**: a failed save shows the Alert below that row's editor.
- [ ] **Try it**: a failed evaluation shows `Evaluation failed` in the card.

Loading
- [ ] With DevTools throttling ("Slow 4G") each of `/`, `/flags/[key]`, `/flags/new`, `/users`
      shows its skeleton, shaped like the page, with no layout jump when content arrives.

Errors and not found
- [ ] **Mongo down**: `docker compose stop mongo`; loading `/` shows the skeleton, then within
      ~5 s the error Alert with Try again (header still visible); `docker compose start mongo`;
      Try again renders the page without a full reload. Repeat for `/flags/<key>` and `/users`.
- [ ] `MONGODB_SERVER_SELECTION_TIMEOUT_MS=2000` (in `.env` for host `npm run dev`) makes the
      error appear after ~2 s.
- [ ] `/flags/does-not-exist`, `/flags/Bad%20Key` and `/no-such-page` show the styled not-found
      page with a working "Back to flags" link.
- [ ] `global-error.tsx` renders (temporarily throw in `layout.tsx` in dev, then revert) with
      styles applied and a working Try again.

Empty states
- [ ] After `POST /api/test/reset`, `/` shows the `Empty` "No flags yet" with a working "New flag"
      button.
- [ ] A newly created flag's audit shows one entry; a flag key with no history (e.g. via a fresh
      DB) shows the `Empty` "No changes recorded yet".
- [ ] With the `users` collection emptied (`mongosh` `db.users.deleteMany({})`, then re-seed),
      `/users` and Try it show their empty states.

README
- [ ] Following "Quick start" from a fresh clone brings up the stack at `http://localhost:3000`
      with seed data.
- [ ] Every `curl` example, run in order against the dev stack, returns the documented status and
      body (timestamps aside).
- [ ] Every npm script and env variable in `package.json` / the code is documented; links to
      `specs/*.md` resolve.

General
- [ ] Browser console and app logs show no errors or hydration warnings during the checks above
      (other than the deliberately triggered ones).
- [ ] Layout works at 375 px width: toasts, Alerts, skeletons and empty states fit without
      horizontal page scroll.

## Review checklist

- [ ] Success → toast with details; error → Alert; never the other way round.
- [ ] Toast texts come from `src/lib/toast-messages.ts` only; components contain no ad-hoc text
      building for them.
- [ ] Components come from shadcn/ui (`src/components/ui`) with Tailwind utilities only; icons from
      `lucide-react`.
- [ ] No domain, API contract or data-model changes beyond the non-freezing reset and the timeout
      option.
- [ ] The Reset button is rendered only when `testEndpointsEnabled()`; it always confirms first.
- [ ] `tech-stack.md` updated (reset, clock, theme, UI); roadmap item 22 reworded and Phase 5
      follow-ups listed and marked complete; `CHANGELOG.md` entry added.
- [ ] Each task group from `plan.md` is its own commit on `feature/phase-5-polish`.
