# Phase 6 — Demo page: Validation

The branch can be merged when every item below is checked.

## Commands

Start Mongo for the integration tests:
`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo`

| Command | Expected |
|---------|----------|
| `npm run lint` | exits 0, no warnings |
| `npm run typecheck` | exits 0 |
| `npm test` | all unit tests pass |
| `npm run test:all` | unit + integration tests pass |
| `npm run test:coverage` | passes the 100% gate on `src/domain`, `src/data`, `src/server` (incl. `demo.ts`), `src/app/api`, `src/lib` (incl. `demo.ts`) |
| `grep -rn -e localStorage -e sessionStorage src` | no matches |
| `git ls-files src/lib/actor.ts src/lib/tests/actor.test.ts` | prints nothing (both deleted) |
| `npm run build` | succeeds; `/demo` listed as a dynamic route |
| `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` | `seed` completes, `app` serves `/demo` at `http://localhost:3000/demo` |

## Required tests

- [ ] `src/lib/tests/demo.test.ts`: `storefrontModel` — all on (`legacy: false`); `enabled: false`
      off; `loading` off; `error` off; missing key off; non-seed keys ignored.
- [ ] `src/lib/tests/demo.test.ts`: `storefrontModel` — empty input and all-off input give every
      feature off and `legacy: true`; exactly one feature on gives `legacy: false`.
- [ ] `src/lib/tests/demo.test.ts`: `sortFlagKeys` sorts and does not mutate its input.
- [ ] `src/lib/tests/demo.test.ts`: `DEMO_FEATURES` keys equal the `SEED_FLAGS` keys.
- [ ] `src/server/tests/demo.test.ts`: `resolveDemoUser` — known id → that user; unknown id →
      first user; `undefined` → first user; no users → `null`.
- [ ] `src/server/tests/demo.test.ts`: `DemoUserIdSchema` trims, rejects empty and non-string input.
- [ ] `src/server/tests/demo.test.ts`: `DEMO_USER_COOKIE_OPTIONS` is exactly
      `{ httpOnly: true, secure: true, sameSite: "strict", path: "/demo" }` (no `maxAge`/`expires`).
- [ ] `src/server/tests/demo.int.test.ts`: selecting a stored user sets `ff_demo_user` with those
      options and returns `{ ok: true }`; an unknown, empty or non-string id returns
      `{ ok: false, error }` and sets nothing.

## Expected results on a fresh seed

After a Reset (header button) and `npm run seed` (or a fresh `docker compose up`). Buckets are
`crc32("<flagKey>:<userId>") % 100`. `new-checkout` is sticky: the first evaluation reports
`PERCENTAGE` and stores the value; every later one (Refresh) reports `STICKY` with the same value.

| User (cohorts) | `new-checkout` | `dark-mode` | `beta-search` | `legacy-banner` | `ai-assistant` |
|----------------|----------------|-------------|---------------|-----------------|----------------|
| Alice (admin, developer) | off · PERCENTAGE | on · COHORT_INCLUDED | on · PERCENTAGE | off · KILL_SWITCH | on · COHORT_INCLUDED |
| Bob (tester) | on · PERCENTAGE | on · COHORT_INCLUDED | on · PERCENTAGE | off · KILL_SWITCH | on · PERCENTAGE |
| Carol (user) | on · PERCENTAGE | off · PERCENTAGE | off · COHORT_EXCLUDED | off · KILL_SWITCH | on · PERCENTAGE |
| Dan (developer) | on · PERCENTAGE | on · COHORT_INCLUDED | on · PERCENTAGE | off · KILL_SWITCH | off · PERCENTAGE |
| Eve (user, tester) | on · PERCENTAGE | on · COHORT_INCLUDED | off · COHORT_EXCLUDED | off · KILL_SWITCH | off · PERCENTAGE |
| Frank (user) | off · PERCENTAGE | off · PERCENTAGE | off · COHORT_EXCLUDED | off · KILL_SWITCH | off · PERCENTAGE |

## Manual checks (dev stack, browser)

- [ ] The header shows **Flags · Users · Demo**; Demo is highlighted on `/demo`.
- [ ] `/demo` shows a skeleton while loading, then the "Acting as" switcher, the user's cohorts as
      read-only badges with a link to `/users`, the flag grid and the storefront.
- [ ] The switcher lists the six seeded users with their cohorts and no "Anonymous" option.
- [ ] For each of the six users, the grid matches the table above, and the storefront matches the
      grid: every slot shows the new variant when on and the legacy variant when off (classic
      checkout / light card / category menu / no banner / "Contact support" link).
- [ ] Frank (every seed flag off) sees the complete **fully legacy** storefront — header with the
      category menu, product tiles, classic checkout, footer with "Contact support" — and the
      `Legacy storefront` badge; switching to any other user removes the badge.
- [ ] Pressing Refresh re-evaluates: `new-checkout` now reads `STICKY` with an unchanged value.
- [ ] DevTools Network: one `POST /api/flags/<key>/evaluate` per stored flag, each with
      `X-User-Id` = the selected user's id and body `{ userId, cohorts }` with their stored cohorts.
- [ ] With no `ff_demo_user` cookie (fresh private window), the first user (Alice) is selected and
      no cookie is set until the switcher is changed.
- [ ] After switching to Dan: DevTools → Application → Cookies shows `ff_demo_user` = Dan's id with
      **HttpOnly ✓, Secure ✓, SameSite Strict, Path `/demo`, Expires "Session"**; Local Storage and
      Session Storage hold no actor/user key.
- [ ] In the console, `document.cookie` does not contain `ff_demo_user`.
- [ ] The selection survives a reload and is picked up by a second tab on its next load; after
      closing the browser (session end) it is back to Alice.
- [ ] Editing the cookie to an unknown id (DevTools) and reloading falls back to Alice; no error.
- [ ] Network: switching user sends one Server Action `POST /demo` whose response has the
      `Set-Cookie` with the attributes above; the cookie is not sent on `/`, `/users` or `/api/*`
      requests (path-scoped).
- [ ] Kill `beta-search` in the admin, Refresh `/demo` as Bob: row reads `off · KILL_SWITCH` and the
      search bar is replaced by the category menu; revive it and Refresh: the search bar returns.
- [ ] Create a new flag in the admin: it appears in the grid (sorted by key) without affecting the
      storefront. Delete `ai-assistant`: it leaves the grid and the bubble is replaced by the
      "Contact support" link.
- [ ] Change Eve's cohorts on `/users` (remove `tester`), return to `/demo`: `dark-mode` reads
      `off · PERCENTAGE` (bucket 47 ≥ 0) and the card is light.
- [ ] With every flag deleted (header Reset): the grid shows the `Empty` state and the storefront
      is the complete fully-legacy layout with the `Legacy storefront` badge — no empty card or
      missing sections.
- [ ] With `mongo` stopped, `/demo` shows the existing error page (from `error.tsx`) within a few
      seconds; restart it and Try again recovers.
- [ ] A per-row failure (e.g. block one evaluate request in DevTools) shows an `Error` badge with
      the message in that row only; that storefront feature is off.
- [ ] Dark mode affects only the storefront card; the rest of the page stays light, and
      `grep -rn "dark:" src` finds nothing new.
- [ ] At a narrow (phone) width, grid and storefront stack without horizontal page scroll.

## Merge criteria

- [ ] All commands above pass and every checkbox is ticked.
- [ ] `specs/roadmap.md` Phase 6 marked `✅ Complete`; `specs/tech-stack.md` and `README.md` updated.
- [ ] No changes to `src/domain`, `src/data` or the HTTP API.
- [ ] No identity or security-relevant value is stored in Web Storage anywhere in `src`.
