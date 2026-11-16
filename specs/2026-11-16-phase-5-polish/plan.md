# Phase 5 — Polish: Plan

Each group ends in a working state and can be committed on its own. For `src/lib` and `src/data`,
write the tests first, watch them fail, then implement. Components are checked with `npm run build`
and the manual checks in `validation.md`. Integration tests need Mongo:
`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo`.

## 1. Reset without freezing the clock (API change, requirements §9)
1. Tests first:
   - `src/server/tests/reset.int.test.ts`: `reset(now)` clears flags and assignments, keeps audit,
     users and cohorts, and leaves `appClock` on real time.
   - `src/app/api/tests/reset.int.test.ts`: `200 { now }` echoes the normalised ISO time; missing
     or invalid `now` → `400`; an audit entry written after a reset with a past `now` has an `at`
     later than that `now` (clock not frozen); `404` when the endpoint is off.
   - `src/server/tests/clock.test.ts`: `appClock` follows the system clock; no freeze exports.
2. Move tests that relied on the reset freeze for exact `at` values (API scenarios, flag audit
   tests) onto services built with `frozenClock(...)` and installed via `setServicesForTesting`
   (extend `src/app/api/tests/helpers.ts` with a helper for this).
3. Implement: `ResetService.reset` without `freezeClock` (logs the reset time); remove
   `freezeClock` / `unfreezeClock` and the `globalThis` delegate from `src/server/clock.ts`; update
   `createServices`, `src/server/index.ts` and the route's doc comment.
4. Run `test:all`, `test:coverage`, `lint`, `typecheck`; commit.

## 2. Components, white theme and pure helpers (item 33)
1. `npx shadcn@latest add skeleton alert sonner empty` (keep our formatted `button.tsx` /
   `input.tsx`; run `npm ci` if the CLI leaves `node_modules` incomplete). Edit
   `src/components/ui/sonner.tsx` to drop `next-themes` and use `theme="light"`; make sure
   `next-themes` is not added to `package.json`.
2. White theme: remove `@custom-variant dark` and the `.dark { … }` block from
   `src/app/globals.css`, add `color-scheme: light` on `:root`, and strip `dark:` utilities from
   `src/components/ui/*` (they would be dead code).
3. `src/lib/tests/toast-messages.test.ts`:
   - `flagSavedToast(null, flag)` → `Created <key>`, description lists every field;
   - `flagSavedToast(before, after)` → `Saved <key>`, only changed fields as `field: a → b`, joined
     with `; `, values via `formatFieldValue`; identical flags → `No changes`;
   - `killSwitchToast(key, false | true)` titles and descriptions;
   - `flagDeletedToast(key)`;
   - `userCohortsToast(name, before, after)` → added only, removed only, both, none (`No changes`),
     reorder only (`No changes`);
   - `resetToast(now)` → `Reset complete` with the ISO time.
4. `src/lib/tests/api-client.test.ts`: `resetData(now)` → `POST /api/test/reset`, JSON
   `{ now: <ISO> }`, no `X-User-Id`; `200` → `{ ok: true, now }`; `400` / `404` / `500` / network
   failure → `{ ok: false, error }`.
5. Implement `src/lib/toast-messages.ts` and `resetData`; run `test`, `test:coverage`, `lint`,
   `typecheck`, `build`; commit.

## 3. Success toasts, error Alerts and the Reset button (item 33, requirements §10)
1. Mount `<Toaster />` in `src/app/layout.tsx`.
2. `src/components/page-alert.tsx`: `PageAlertProvider` + `usePageAlert()` (`show`, `clear`),
   dismissible destructive `Alert`, cleared on pathname change; wrap `<main>` content in the root
   layout.
3. `src/components/form-alert.tsx` (or inline): a small `ErrorAlert({ title, description })` over the
   shadcn `Alert` with the `CircleAlert` icon, reused below.
4. `flag-form.tsx`: success → `toast(flagSavedToast(...))` then navigate/refresh; failure →
   `ErrorAlert` above the submit button (cleared on resubmit). Remove the `Save failed:` text.
5. `kill-switch.tsx`: success → `killSwitchToast`; failure → `usePageAlert().show(...)`, dialog
   closes; `clear()` when a new write starts. Remove the inline `<p role="alert">`.
6. `delete-flag-button.tsx`: success → `flagDeletedToast`; failure → `ErrorAlert` inside the dialog.
7. `user-cohorts-row.tsx`: success → `userCohortsToast`; failure → `ErrorAlert` below the editor.
8. `try-it.tsx`: failure → `ErrorAlert` "Evaluation failed" in place of the result; no toast.
9. `src/components/reset-button.tsx`: button + `AlertDialog` + `PendingButton`;
   `resetData(systemClock.now())`; success → `resetToast`, `router.push("/")`, `router.refresh()`;
   failure → page-level Alert `Could not reset`. Render it in the header only when
   `testEndpointsEnabled()`.
10. Restart the dev `app` container; run the toast/alert/reset manual checks; `lint`, `typecheck`,
    `build`; commit.

## 4. Loading skeletons (item 33)
1. `src/app/loading.tsx`, `src/app/flags/[key]/loading.tsx`, `src/app/flags/new/loading.tsx`,
   `src/app/users/loading.tsx` from `Skeleton`, mirroring each page; `aria-busy` + `sr-only`
   label.
2. Manual check with network throttling / a slowed Mongo; `build`; commit.

## 5. MongoDB timeout (supports item 33)
1. `src/data/tests/config.test.ts`: `MONGODB_SERVER_SELECTION_TIMEOUT_MS` absent → `5000`; `"2500"`
   → `2500`; `"0"`, `"-1"`, `"abc"`, `"1.5"` → throws naming the variable.
2. Extend `loadConfig` / `DataConfig`; pass `serverSelectionTimeoutMS` in `src/data/client.ts`.
   Cover the option in `src/data/tests/client.int.test.ts` (e.g. an unreachable URI with a short
   timeout rejects within the timeout, and the next `getDb()` retries).
3. Run `test:all`, `test:coverage`, `lint`, `typecheck`; commit.

## 6. Error and not-found pages (item 33)
1. `src/app/error.tsx` (client, `error` + `retry` props): destructive `Alert`, explanation, digest,
   Try again → `retry()`.
2. `src/app/global-error.tsx`: own `<html>`/`<body>`, `globals.css`, `<title>`, light theme, same
   content.
3. `src/app/not-found.tsx`: `Empty` with "Back to flags" link.
4. Manual Mongo-down check (stop `mongo`, load each page, restart, Try again); `/flags/does-not-exist`
   and an unknown URL; `build`; commit.

## 7. Empty states (item 33)
1. Flags list, users page, audit history and Try it use `Empty` as specified in requirements §7.
2. Manual check after `POST /api/test/reset` (no flags, no audit for a new flag) and with an empty
   `users` collection; `build`; commit.

## 8. README (item 34)
1. Rewrite `README.md` per requirements §8.
2. Bring up the dev stack, run every `curl` example in order, paste the real responses; follow the
   Quick start from a clean clone once.
3. `format:check`; commit.

## 9. Docs and wrap-up
1. Update `specs/tech-stack.md`: `MONGODB_SERVER_SELECTION_TIMEOUT_MS` (config + conventions),
   `src/lib/toast-messages.ts` in the architecture tree, the UI section (white theme only, toasts
   for success, Alerts for errors, page-level alert, header Reset button, `loading.tsx` /
   `error.tsx` / `global-error.tsx` / `not-found.tsx`, `Empty`), the shadcn components added, and
   the reset/clock changes (`POST /api/test/reset` no longer freezes; `now` is the recorded reset
   time; `src/server/clock.ts` without freeze; Clock section: tests inject `frozenClock`).
2. Update `specs/roadmap.md`: item 22 wording (reset clears flags + sticky and records `now`; no
   freeze); add the white theme and the header Reset button as Phase 5 follow-ups; tick Phase 5.
3. Run the full validation checklist.
4. Add a `CHANGELOG.md` entry (changelog skill).
5. Open a PR from `feature/phase-5-polish` into `main`.
