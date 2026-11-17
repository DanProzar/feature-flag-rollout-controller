# Feature-flag rollout controller

A small service and admin UI for rolling features out safely, without a deploy:

- **Percentage rollout** — turn a flag on for N% of users through stable, hash-based bucketing.
- **Cohort include / exclude** — force a flag on or off for named cohorts (`beta`, `admin`, …).
- **Kill switch** — force a flag off for everyone, instantly, overriding every other rule.
- **Sticky assignments** — per flag, remember each user's first percentage result so later
  percentage changes never flip users who were already assigned.

Every evaluation answers the boolean **and the reason**, and every change is written to an
append-only audit log.

More detail:

- [`specs/mission.md`](specs/mission.md) — users, capabilities and the evaluation rules (source of
  truth).
- [`specs/tech-stack.md`](specs/tech-stack.md) — architecture, layers and conventions.
- [`specs/roadmap.md`](specs/roadmap.md) — phases and what each delivered.

## Quick start

Requires Docker with Compose.

```sh
docker compose up --build
```

Open <http://localhost:3000>. Compose starts three services:

| Service | What it does                                                                                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mongo` | MongoDB 8, data in the `mongo-data` volume                                                                                                                                                                                    |
| `seed`  | One-shot: fills each empty collection with demo data — 4 cohorts (`admin`, `developer`, `tester`, `user`), 6 users (Alice … Frank) and 5 flags, one per evaluation reason. Collections that already hold data are left alone. |
| `app`   | The Next.js app (API + admin UI) on port 3000, started once `seed` has finished                                                                                                                                               |

This stack is production-like: the test reset endpoint is off and the header has no **Reset**
button.

## Development

### Setup

- Node.js 24 (`package.json` `engines`), npm.
- Docker, for MongoDB.

```sh
npm ci
cp .env.example .env
```

### Dev stack

`docker-compose.dev.yml` overrides the base file for development: MongoDB's port `27017` is exposed
to the host, and `app` runs `next dev` from a bind mount with test endpoints enabled.

```sh
# Everything in containers, with hot reload, on http://localhost:3000:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Or only MongoDB in a container, and the app on the host:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo
npm run seed
npm run dev
```

Run **either** the compose `app` **or** a host `npm run dev`, not both: they share `.next`.

### Environment variables

Read from the process environment; `npm run dev` and `npm run seed` also load `.env`.

| Variable                              | Required | Default | Meaning                                                                            |
| ------------------------------------- | -------- | ------- | ---------------------------------------------------------------------------------- |
| `MONGODB_URI`                         | yes      | —       | MongoDB connection string, e.g. `mongodb://localhost:27017`                        |
| `MONGODB_DB`                          | yes      | —       | Database name, e.g. `feature_flags`                                                |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | no       | `5000`  | How long a request waits for MongoDB before failing (positive integer, ms)         |
| `ENABLE_TEST_ENDPOINTS`               | no       | off     | Exactly `true` serves `POST /api/test/reset` and shows the header **Reset** button |

### npm scripts

| Script                                    | What it does                                                   |
| ----------------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                             | Next.js dev server on port 3000                                |
| `npm run build`                           | Production build (standalone output, used by the Docker image) |
| `npm start`                               | Serves the production build                                    |
| `npm run seed`                            | Seeds the configured database (each collection only if empty)  |
| `npm run lint`                            | ESLint                                                         |
| `npm run typecheck`                       | Generates Next's route types, then `tsc --noEmit`              |
| `npm run format` / `npm run format:check` | Prettier write / check                                         |
| `npm test`                                | Unit tests (`*.test.ts`); no MongoDB needed                    |
| `npm run test:int`                        | Integration tests (`*.int.test.ts`) against MongoDB            |
| `npm run test:all`                        | Both                                                           |
| `npm run test:coverage`                   | Both, with coverage                                            |

### Tests

- **Unit tests** cover the pure evaluator (`src/domain`), the UI helpers (`src/lib`) and config
  parsing; they run anywhere.
- **Integration tests** cover the data layer, the services and the route handlers against a real
  MongoDB. They connect to `MONGODB_URI` (default `mongodb://localhost:27017`), so start MongoDB with
  the dev override first. Each test file uses its own `feature_flags_test_<random>` database and
  drops it afterwards.
- **Coverage gate:** `npm run test:coverage` fails below 100% statements, branches, functions and
  lines for `src/domain`, `src/data`, `src/server`, `src/app/api` and `src/lib`.

## Evaluation rules

For `{ userId, cohorts }`, the first matching rule wins
([`specs/mission.md`](specs/mission.md#evaluation-rules-source-of-truth) is the source of truth):

| #   | Rule                                            | Result                                                     |
| --- | ----------------------------------------------- | ---------------------------------------------------------- |
| 1   | Flag does not exist                             | `false`, `FLAG_NOT_FOUND`                                  |
| 2   | `enabled` is `false`                            | `false`, `KILL_SWITCH`                                     |
| 3   | A user cohort is in `excludeCohorts`            | `false`, `COHORT_EXCLUDED`                                 |
| 4   | A user cohort is in `includeCohorts`            | `true`, `COHORT_INCLUDED`                                  |
| 5   | `sticky` and the user already has an assignment | the stored value, `STICKY`                                 |
| 6   | Otherwise                                       | `bucket < percentage`, `PERCENTAGE` (stored when `sticky`) |

**Bucket** = `CRC32(UTF-8 of "<flagKey>:<userId>")` as an unsigned 32-bit integer, `% 100` — a
stable value in `0…99`, so `0%` is always off and `100%` always on. Exclude beats include; kill,
exclude and include apply even when a sticky value exists, without overwriting it.

## HTTP API

Bodies are JSON. Flag keys are 1–100 characters of `a-z`, `0-9`, `.`, `_` and `-`, starting with
a letter or digit. The examples were run in this order against the dev stack (seeded); only the `at`
timestamps will differ.

### `PUT /api/flags/:key` — create or replace a flag

All five fields are required. The optional `X-User-Id` header is recorded as the audit `actorId`.

```sh
curl -X PUT http://localhost:3000/api/flags/checkout-v2 \
  -H 'content-type: application/json' -H 'X-User-Id: pm-42' \
  -d '{"enabled":true,"percentage":25,"includeCohorts":["beta"],"excludeCohorts":["blocked"],"sticky":true}'
```

```json
200 {"flag":{"key":"checkout-v2","enabled":true,"percentage":25,"includeCohorts":["beta"],"excludeCohorts":["blocked"],"sticky":true}}
```

Without `X-User-Id` the change is anonymous (`actorId: null`):

```sh
curl -X PUT http://localhost:3000/api/flags/checkout-v2 \
  -H 'content-type: application/json' \
  -d '{"enabled":true,"percentage":50,"includeCohorts":["beta"],"excludeCohorts":["blocked"],"sticky":true}'
```

```json
200 {"flag":{"key":"checkout-v2","enabled":true,"percentage":50,"includeCohorts":["beta"],"excludeCohorts":["blocked"],"sticky":true}}
```

### `POST /api/flags/:key/evaluate` — evaluate for a user

```sh
curl -X POST http://localhost:3000/api/flags/checkout-v2/evaluate \
  -H 'content-type: application/json' -d '{"userId":"u-1","cohorts":["blocked","beta"]}'
# 200 {"enabled":false,"reason":"COHORT_EXCLUDED"}   (exclude beats include)

curl -X POST http://localhost:3000/api/flags/checkout-v2/evaluate \
  -H 'content-type: application/json' -d '{"userId":"u-1","cohorts":["beta"]}'
# 200 {"enabled":true,"reason":"COHORT_INCLUDED"}

curl -X POST http://localhost:3000/api/flags/checkout-v2/evaluate \
  -H 'content-type: application/json' -d '{"userId":"u-1","cohorts":[]}'
# 200 {"enabled":false,"reason":"PERCENTAGE"}        (first time: bucketed, then stored)

curl -X POST http://localhost:3000/api/flags/checkout-v2/evaluate \
  -H 'content-type: application/json' -d '{"userId":"u-1","cohorts":[]}'
# 200 {"enabled":false,"reason":"STICKY"}            (the stored value, whatever the percentage)

curl -X POST http://localhost:3000/api/flags/legacy-banner/evaluate \
  -H 'content-type: application/json' -d '{"userId":"u-1","cohorts":[]}'
# 200 {"enabled":false,"reason":"KILL_SWITCH"}       (seed flag with enabled: false)

curl -X POST http://localhost:3000/api/flags/does-not-exist/evaluate \
  -H 'content-type: application/json' -d '{"userId":"u-1","cohorts":[]}'
# 200 {"enabled":false,"reason":"FLAG_NOT_FOUND"}
```

### `GET /api/flags/:key/audit` — change history, oldest first

```sh
curl http://localhost:3000/api/flags/checkout-v2/audit
```

```json
200 {"entries":[
  {"at":"2026-11-16T22:56:00.510Z","key":"checkout-v2","actorId":"pm-42","before":null,
   "after":{"key":"checkout-v2","enabled":true,"percentage":25,"includeCohorts":["beta"],"excludeCohorts":["blocked"],"sticky":true}},
  {"at":"2026-11-16T22:56:00.587Z","key":"checkout-v2","actorId":null,
   "before":{"key":"checkout-v2","enabled":true,"percentage":25,"includeCohorts":["beta"],"excludeCohorts":["blocked"],"sticky":true},
   "after":{"key":"checkout-v2","enabled":true,"percentage":50,"includeCohorts":["beta"],"excludeCohorts":["blocked"],"sticky":true}}
]}
```

An unknown key answers `200 {"entries":[]}`.

### `DELETE /api/flags/:key` — delete a flag

Removes the flag and its sticky assignments and appends an audit entry with `after: null`; the
history is kept. An unknown key answers `404`.

```sh
curl -X DELETE http://localhost:3000/api/flags/checkout-v2 -H 'X-User-Id: pm-42'
```

```json
200 {"flag":{"key":"checkout-v2","enabled":true,"percentage":50,"includeCohorts":["beta"],"excludeCohorts":["blocked"],"sticky":true}}
```

### `PUT /api/users/:userId/cohorts` — replace a seeded user's cohorts

Using Alice's seeded id:

```sh
curl -X PUT http://localhost:3000/api/users/01a1dc80-f000-7ca2-9842-a25ac04f528a/cohorts \
  -H 'content-type: application/json' -d '{"cohorts":["admin","developer","tester"]}'
```

```json
200 {"user":{"userId":"01a1dc80-f000-7ca2-9842-a25ac04f528a","name":"Alice","cohorts":["admin","developer","tester"]}}
```

### `POST /api/test/reset` — clear flags and sticky assignments (test support)

Served only when `ENABLE_TEST_ENDPOINTS=true` (the dev stack); otherwise Next answers `404`.
Deletes every flag and sticky assignment; the audit log, users and cohorts are kept and seed flags
are not re-inserted (run `npm run seed` for them). `now` is required (ISO-8601) and is recorded as
the reset time: echoed back and logged by the server. **The clock is not frozen** — later audit
entries carry the real time.

```sh
curl -X POST http://localhost:3000/api/test/reset \
  -H 'content-type: application/json' -d '{"now":"2026-01-01T00:00:00Z"}'
```

```json
200 {"now":"2026-01-01T00:00:00.000Z"}
```

### Errors

Invalid input answers `400` with `{ error, issues }`, where `issues` maps each field to its
messages:

```sh
curl -X PUT http://localhost:3000/api/flags/broken \
  -H 'content-type: application/json' \
  -d '{"enabled":true,"percentage":150,"includeCohorts":[],"excludeCohorts":[]}'
```

```json
400 {"error":"Invalid request body","issues":{"percentage":["Too big: expected number to be <=100"],"sticky":["Invalid input: expected boolean, received undefined"]}}
```

## Admin UI

| Page           | What it does                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/`            | All flags: state (kill switch, with confirmation before killing), percentage, sticky, cohorts; delete a flag                          |
| `/flags/new`   | Create a flag                                                                                                                         |
| `/flags/[key]` | Edit the rollout rules, flip the kill switch, **Try it** (evaluate for a seeded user through the real endpoint) and the audit history |
| `/users`       | The seeded users; edit their cohorts                                                                                                  |

Successful changes show a toast with the details (e.g. `percentage: 10% → 25%`); failures show a
red Alert where the action happened. In the dev stack the header has a **Reset** button that calls
`POST /api/test/reset` after a confirmation.

## Demo page

`/demo` (header link **Demo**) behaves like a client application: for the user picked in
**Acting as** it calls `POST /api/flags/:key/evaluate` from the browser — once per stored flag, in
parallel, with `X-User-Id` and the user's stored cohorts — and shows each answer in a grid (flag,
on/off, reason) next to a mock "Acme Store" whose features follow five seed flags:

| Flag            | On                         | Off (legacy)                         |
| --------------- | -------------------------- | ------------------------------------ |
| `new-checkout`  | one-page checkout          | classic cart → shipping → payment    |
| `dark-mode`     | dark storefront card       | light storefront card                |
| `beta-search`   | search bar in the header   | category menu                        |
| `legacy-banner` | promo banner               | no banner                            |
| `ai-assistant`  | "Ask our assistant" bubble | "Contact support" link in the footer |

A failed or missing flag counts as off; with every feature off the store is the complete legacy
layout, badged `Legacy storefront`. Other flags appear in the grid only.

Walkthrough on a fresh seed: pick **Frank** (every seed flag off → legacy store), then **Bob**
(new checkout, dark mode, search, assistant). Kill `beta-search` in the admin and press
**Refresh** as Bob: the row reads `off · KILL_SWITCH` and the search bar turns back into the menu.
Cohorts are changed on `/users`, not on `/demo`.

Evaluating sticky flags from `/demo` stores assignments exactly as any client would (Refresh then
reports `STICKY`). The selected user is remembered in an `httpOnly` session cookie
(`ff_demo_user`, path `/demo`), set by a Server Function, never in browser storage; it is gone when
the browser closes, and an unknown id falls back to the first user.

## Troubleshooting

- **Port 3000 or 27017 already in use** — stop whatever holds it (another dev server, a local
  `mongod`), or change the host side of the port mapping.
- **Integration tests fail to connect** — MongoDB's port is only exposed by the dev override: start
  it with `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo`.
- **`npm run build` fails or breaks the running app** — the dev compose `app` bind-mounts the
  project and shares `.next`. Stop it first: `docker compose -f docker-compose.yml -f
docker-compose.dev.yml stop app`.
- **`next dev` says another instance is running / `.next/dev` is locked** — a leftover host
  `npm run dev` is still running; stop that Node process before starting the compose `app` (or
  vice versa).
- **Server-side changes don't show up in the dev `app` container** — services and the MongoDB
  connection are cached on `globalThis` across hot reloads. Restart it:
  `docker restart feature-flags-app-1`.
- **`Module not found` in the dev `app` container after adding a dependency** — its
  `node_modules` lives in an anonymous volume. Recreate it:
  `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build --renew-anon-volumes app`.
- **`POST /api/test/reset` answers `404` / no Reset button** — `ENABLE_TEST_ENDPOINTS` must be
  exactly `true` (the dev override sets it; the base `docker-compose.yml` does not).
- **Pages load slowly, then show "Something went wrong"** — MongoDB is unreachable; requests fail
  after `MONGODB_SERVER_SELECTION_TIMEOUT_MS` (5 s by default). Start MongoDB and click
  **Try again**.
