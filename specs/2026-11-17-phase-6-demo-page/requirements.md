# Phase 6 — Demo page: Requirements

Branch: `feature/phase-6-demo-page`
Roadmap: `specs/roadmap.md` → Phase 6, items 35–37.

## Context

Phases 0–5 delivered the pure evaluator, MongoDB persistence with seed data (4 cohorts, 6 users,
5 flags — one per evaluation reason), the HTTP API and a polished admin UI (`/`, `/flags/new`,
`/flags/[key]`, `/users`) with toasts, alerts, skeletons and a dev-stack Reset. The admin's "Try it"
panel answers one flag for one user at a time; nothing shows what a *client application* sees.

The mission's third user group is client applications calling `POST /api/flags/:key/evaluate`.
This phase adds `/demo`, a page inside the existing app that behaves like such a client: it calls
the public evaluate endpoint over HTTP from the browser and renders a fake storefront whose
features follow the answers. Developers and product managers can flip a kill switch or move a
percentage in the admin, press Refresh on `/demo`, and watch features appear or disappear for a
given user — the "deterministic & explainable" principle made visible. The "Acting as" selector
(`src/components/actor-select.tsx`), removed from the admin header in Phase 4 and unused since,
gets its home here; its `localStorage` persistence (`src/lib/actor.ts`) is replaced by an
`httpOnly` cookie (§2a).

No domain, data or HTTP API changes: the page consumes the existing endpoints and services; the
only server addition is the demo-user cookie helper and its Server Function.

## Scope

### 1. Route and navigation (item 35)

- `src/app/demo/page.tsx` — a server component that loads **every stored flag** (`flags.list()`)
  and **every user** (`catalog.users()`) through `getServices()`, and passes plain
  `{ key }[]` and `{ userId, name, cohorts }[]` props to a client component. It renders nothing
  but data loading; all evaluation happens in the browser.
- `src/app/demo/loading.tsx` — a skeleton (switcher, grid rows, storefront card), like the other
  routes.
- `MainNav` gets a third link, **Demo** (`/demo`, active on `path.startsWith("/demo")`).
- The page's `error.tsx` / `not-found.tsx` handling is the existing root one.

### 2. User switcher (item 36)

- The switcher **is** the reused "Acting as" control (`ActorSelect`). The chosen user is (a) the
  evaluated `userId` and (b) sent as `X-User-Id`. It is **remembered server-side in an `httpOnly`
  cookie, never in Web Storage** (§2a).
- `ActorSelect` becomes a plain controlled component (`users`, `value`, `onValueChange`): the
  `useSyncExternalStore`/`storage`-event code, `useActor`, the "Anonymous" option and
  `src/lib/actor.ts` (`readActor`, `writeActor`, `ACTOR_STORAGE_KEY`) with its tests are
  **deleted** — nothing else uses them.
- The label reads "Acting as"; each option shows the user's name and, as secondary text, their
  cohorts (as in "Try it").
- Switching updates the page's state at once (evaluations start immediately) and calls the
  `selectDemoUser` Server Function in a transition to persist the choice. If that call fails,
  the evaluated user stays switched for this page view and an `ErrorAlert`
  ("Could not remember the selected user") appears under the switcher.

### 2a. Remembering the selected user — `httpOnly` cookie

The previous Phase 4 code kept the actor id in `localStorage`, which any script on the origin can
read and overwrite (an XSS foothold could silently change who every later request is attributed
to) and which never expires. Following OWASP guidance (no identity-bearing values in Web Storage;
server-set cookies with `HttpOnly`, `Secure`, `SameSite`), the demo instead uses:

- **Cookie** `ff_demo_user`, value = the selected `userId` (a UUID, nothing else), set **only** by
  the Server Function `selectDemoUser(userId)` in `src/app/demo/actions.ts` (`"use server"`), with
  options from one constant in `src/server/demo.ts`:
  `{ httpOnly: true, secure: true, sameSite: "strict", path: "/demo" }` and **no `maxAge`/`expires`**
  (a session cookie, gone when the browser closes). Browsers treat `http://localhost` as a secure
  context, so `Secure` cookies work in the local stack.
- **Validation before writing**: `selectDemoUser` parses its argument with Zod (non-empty trimmed
  string) and accepts it only if it is the `userId` of a stored user (`catalog.users()`); otherwise
  it returns `{ ok: false, error }` and leaves the cookie unchanged. It never throws for bad input.
- **CSRF**: Server Functions are POST-only and Next compares `Origin` with `Host`; `SameSite=Strict`
  additionally keeps the cookie off cross-site requests.
- **Reading**: `src/app/demo/page.tsx` reads the cookie with `(await cookies()).get(...)` and
  resolves it with `resolveDemoUser(users, cookieValue)` (`src/server/demo.ts`): a known id → that
  user; missing or unknown (e.g. after a user was removed) → the first user; no users → `null`.
  The page passes `selectedUserId` to the client component. Rendering never writes the cookie.
- The cookie is a UI preference, not a credential: it grants nothing, `X-User-Id` stays trusted
  as-is (mission: no auth/RBAC), and a user editing their own cookie can only pick a stored user,
  which the switcher allows anyway — so it is not signed.
- Other open tabs pick up a new selection on their next load (no live cross-tab sync).
- `src/server/demo.ts` (`DEMO_USER_COOKIE`, `DEMO_USER_COOKIE_OPTIONS`, `resolveDemoUser`,
  `DemoUserIdSchema`) is unit-tested and inside the 100% `src/server` coverage gate; the thin
  Server Function in `src/app/demo/actions.ts` delegates to it.
- The selected user's **stored cohorts** are sent with every evaluation and shown read-only as
  `Badge`s beside the switcher, with a link to `/users` to change them. They are not editable on
  `/demo`.

### 3. Flag grid (item 36)

- For the selected user, the browser calls `POST /api/flags/:key/evaluate` with
  `{ userId, cohorts }` and `X-User-Id: userId` **once per stored flag, in parallel**, through the
  existing `evaluateFlag` API client.
- Evaluations run on mount, whenever the selected user changes, and when the **Refresh** button is
  pressed (a `PendingButton`, spinning while any call is in flight). No polling. Responses for a
  user that is no longer selected are discarded (no stale rows after a quick switch).
- A shadcn `Table` with columns **Flag** (key, linking to `/flags/[key]`), **Enabled** (green
  `on` / red `off` badge, as in "Try it") and **Reason** (the reason code). Rows are sorted by key.
- While a row is loading it shows a `Skeleton` in the Enabled/Reason cells.
- **Per-row failure**: a failed call shows a destructive `Error` badge and the API client's error
  text in that row; the rest of the grid is unaffected and no page-level Alert is raised. A failed
  flag counts as **off** for the storefront (fail safe, like `FLAG_NOT_FOUND`).
- With no stored flags, the grid shows `Empty` ("No flags — create one or run the seed") and the
  storefront renders fully legacy (§4).

### 4. Mock storefront (item 37)

A `Card` titled with a fake shop name (e.g. "Acme Store") whose features are driven by the five
seed flag keys. Each flag-driven element carries a small muted caption with its flag key (e.g.
`beta-search`) so the link between flag and feature is obvious.

**The storefront always renders a complete default structure** — header with the shop name and a
navigation/search slot, an optional banner slot, a product grid (a few static tiles: name, price,
an inert "Add to cart"), a checkout panel and a footer with a help slot. Every flag only swaps what
fills a slot; nothing leaves a hole. A feature that is off (including `FLAG_NOT_FOUND`, an error or
a still-loading row) shows its **legacy** variant:

| Flag key | On (new) | Off (legacy default) |
|----------|----------|----------------------|
| `new-checkout` | "New checkout" panel: one page, express pay | "Classic checkout" panel: cart → shipping → payment steps |
| `dark-mode` | storefront card renders dark | storefront card renders light |
| `beta-search` | search bar in the header slot | classic category menu in the header slot (e.g. Shoes · Bags · Sale) |
| `legacy-banner` | promo banner in the banner slot | banner slot empty (the store reads normally without it) |
| `ai-assistant` | floating "Ask our assistant" bubble in the card's corner | "Contact support" link in the footer help slot |

- **Fully legacy**: when all five features are off — no flags stored, every flag killed or off for
  the user, or every call failed — the storefront is the all-legacy layout above, captioned with a
  muted `Legacy storefront` badge in its header, so an empty or fully-off result still looks like
  a real, working store rather than an empty card. The badge disappears as soon as any feature is on.
- Nothing in the storefront is interactive beyond visuals.
- **Dark mode is scoped to the storefront container**: explicit utility classes on the card
  (e.g. `bg-zinc-900 text-zinc-50 border-zinc-800`) chosen by the model, never the `dark:` variant,
  `.dark` tokens or a change to `globals.css`. The rest of the app stays light-only.
- The storefront only reads these five keys. Other stored flags appear in the grid but do not
  affect the storefront.

### 5. Pure helper `src/lib/demo.ts` (100% unit-tested)

- `DEMO_FEATURES`: the five keys above, in display order, with a short label each.
- `type DemoEvaluation = { status: "loading" } | { status: "ok"; enabled: boolean; reason: Reason }
  | { status: "error"; error: string }`.
- `storefrontModel(evaluations: Record<string, DemoEvaluation>)` →
  `{ newCheckout, darkMode, search, banner, assistant, legacy }` booleans: a feature is `true`
  only for `status: "ok"` with `enabled: true`; missing, loading and error are `false`. `legacy`
  is `true` exactly when all five features are `false`.
- `sortFlagKeys(keys)` → sorted copy, used by the grid.
- Server-side helpers for the cookie live in `src/server/demo.ts` (§2a), not here.

### 6. Docs

- `README.md`: a "Demo page" section (what `/demo` shows, the seeded-user walkthrough, that
  evaluating sticky flags from `/demo` stores assignments like any client, that the selection is a
  session cookie).
- `specs/tech-stack.md`: `/demo` in the UI section, the `ff_demo_user` cookie and its options,
  `src/lib/demo.ts` and `src/server/demo.ts` entries (and `src/lib/actor.ts` removed);
  `src/app/demo` in the architecture tree; a convention line: client-side Web Storage holds no
  identity or security-relevant values.
- `specs/roadmap.md`: Phase 6 marked `✅ Complete` at merge, with any review follow-ups.

## Out of scope

- Editing cohorts or flags on `/demo` (what-if cohorts, inline kill switch) — the admin does that.
- Polling, server-sent events or any push refresh (mission non-goal: streaming SDK).
- A batch/bulk evaluate endpoint; the page makes one request per flag like a simple client.
- Storefront behaviour for flags other than the five seed keys; a configurable flag→feature map.
- Anonymous evaluation (no user) on `/demo`.
- Live cross-tab sync of the selected user; a persistent (non-session) cookie; signing the cookie.
- Authentication of `X-User-Id` (mission non-goal).
- Component tests (React Testing Library / jsdom); components are verified by build and manual
  checks, as in Phases 4–5.
- A real dark theme for the app.

## Decisions

1. **Grid lists every stored flag**, not a fixed list of seed keys — the page is a client of the
   *current* data, so flags created in the admin show up too. A deleted seed flag simply leaves
   the grid and its storefront feature falls back to off.
2. **One control for user and actor** — reusing `ActorSelect` gives the dormant "Acting as" control
   a purpose and matches how a real client sends the end user's id as `X-User-Id`. No "Anonymous"
   on `/demo`, since evaluation needs a `userId`.
2a. **`httpOnly` session cookie instead of `localStorage`** (review of 2026-11-17) — Web Storage is
   readable and writable by any script on the origin and never expires, so it is no place for a
   value that decides request attribution. A server-set `HttpOnly; Secure; SameSite=Strict;
   Path=/demo` session cookie, written only by a validating Server Function, is out of reach of
   page scripts, is not sent cross-site, is scoped to the one page that needs it, and ends with the
   browser session. The old `localStorage` helpers are deleted rather than left as an unsafe
   option. In-memory-only state was the alternative; the cookie keeps the selection across reloads
   at no security cost.
3. **Browser-side evaluate via HTTP, on switch + Refresh** — "like a real client" means going
   through the public endpoint, not services. Manual Refresh keeps the page deterministic and
   avoids load; polling is not needed for a demo.
4. **Stored cohorts, read-only** — the demo shows what the system *actually* answers for a seeded
   user; changing cohorts belongs on `/users`.
5. **Every feature swaps legacy ↔ new; the default is fully legacy** (review of 2026-11-17) — the
   storefront always has the same complete structure and each off feature shows its legacy
   variant, so "no flags on" reads as the old product, not a broken page. This is how flags are used
   in practice: off means the existing behaviour. `legacy-banner` is the exception that proves the
   rule — it is a flag *adding* an element, so its off state is simply an empty slot.
6. **Dark mode scoped to the mock** — keeps the Phase 5 "white theme only" rule for the app.
7. **Grid + storefront on one page, Demo nav link** — both visible at once so cause (reason) and
   effect (feature) are side by side.
8. **Per-row errors, failed = off** — mirrors the API's fail-safe `FLAG_NOT_FOUND` and keeps one bad
   flag from blanking the page; the `ErrorAlert`/page-alert patterns are for admin writes.
9. **Sticky side effect accepted** — evaluating sticky flags from `/demo` stores assignments, exactly
   as a real client would; the README says so.
