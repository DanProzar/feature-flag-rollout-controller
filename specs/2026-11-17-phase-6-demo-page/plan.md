# Phase 6 — Demo page: Plan

Each group ends in a working state and is committed on its own. `src/lib` and `src/server` are
written test-first: write the tests, watch them fail, then implement. Components are checked with
`npm run build` and the manual checks in `validation.md`. Integration tests need Mongo:
`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo`.

## 1. Pure helpers and the demo-user cookie (requirements §2a, §5)
1. Tests first:
   - `src/lib/tests/demo.test.ts` — `storefrontModel`: all five keys `ok`/`enabled: true` → all
     features on, `legacy: false`; `enabled: false`, `loading`, `error` and a missing key → off;
     empty input and all-off input → every feature off and `legacy: true`; a single feature on →
     `legacy: false`; extra non-seed keys are ignored. `sortFlagKeys` sorts without mutating.
     `DEMO_FEATURES` lists exactly the `SEED_FLAGS` keys.
   - `src/server/tests/demo.test.ts` — `resolveDemoUser`: known id → that user; unknown id,
     `undefined` → first user; no users → `null`. `DemoUserIdSchema` trims and rejects empty /
     non-string input. `DEMO_USER_COOKIE_OPTIONS` equals
     `{ httpOnly: true, secure: true, sameSite: "strict", path: "/demo" }` with no `maxAge` /
     `expires`.
   - `src/server/tests/demo.int.test.ts` — a `selectDemoUser`-style service function (taking the
     catalog and a cookie setter, so it is testable without Next): a stored user's id → sets the
     cookie with the options above and returns `{ ok: true }`; an unknown or invalid id →
     `{ ok: false, error }` and the setter is not called.
2. Implement `src/lib/demo.ts` and `src/server/demo.ts` (export from `src/server/index.ts`).
3. Delete `src/lib/actor.ts` and `src/lib/tests/actor.test.ts`; remove `useActor` and the
   `storage`-event code from `src/components/actor-select.tsx`, making it a controlled component
   without the "Anonymous" option (it is not rendered anywhere yet, so nothing breaks).
4. Run `npm test`, `test:all`, `test:coverage` (100% on `src/lib` and `src/server`), `lint`,
   `typecheck`, `build`; commit.

## 2. `/demo` page, user switcher and flag grid (items 35–36, requirements §1–§3)
1. `npx shadcn@latest add <component>` for anything missing (likely none: `Table`, `Badge`,
   `Card`, `Select`, `Skeleton`, `Empty` exist).
2. `src/app/demo/actions.ts` (`"use server"`): `selectDemoUser(userId)` — `cookies()` from
   `next/headers`, delegating to the service in `src/server/demo.ts`.
3. `src/app/demo/page.tsx` (server: flags + users via `getServices()`, cookie read with
   `(await cookies()).get(DEMO_USER_COOKIE)`, resolved with `resolveDemoUser`) and
   `src/app/demo/loading.tsx` (skeleton).
4. `src/components/demo/demo-page.tsx` (client): selected user state seeded from
   `selectedUserId`; switching updates state, then calls `selectDemoUser` in a transition
   (`ErrorAlert` on failure); read-only cohort badges with a `/users` link; Refresh
   `PendingButton`; parallel `evaluateFlag` calls with `X-User-Id`; stale responses discarded.
5. `src/components/demo/flag-grid.tsx`: `Table` with key link, on/off badge, reason, per-row
   `Skeleton` and per-row `Error` badge; `Empty` when there are no flags.
6. Add the **Demo** link to `MainNav`.
7. `npm run build`, `lint`, `typecheck`, `test:all`; manual check of the grid and the cookie
   (DevTools → Application → Cookies); commit.

## 3. Mock storefront and docs (item 37, requirements §4, §6)
1. `src/components/demo/storefront.tsx`: a `Card` with the fixed structure (header nav/search slot,
   banner slot, product tiles, checkout panel, footer help slot) filled from `storefrontModel(...)`
   — new variant when on, legacy variant when off; `Legacy storefront` badge when `legacy`; each
   flag-driven element captioned with its key; dark styling scoped to the card (no `dark:`
   utilities).
2. Place it beside/below the grid in `demo-page.tsx` (stacked on narrow screens).
3. README "Demo page" section; `specs/tech-stack.md` (UI section, cookie, `src/lib/demo.ts`,
   `src/server/demo.ts`, `src/app/demo`, `actor.ts` removed, Web Storage convention); roadmap
   Phase 6 marked complete with any review follow-ups.
4. Run the full gate in `validation.md`, the manual checks, commit.
