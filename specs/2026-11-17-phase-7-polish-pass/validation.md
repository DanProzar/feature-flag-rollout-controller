# Phase 7 — Polish pass: Validation

The branch can be merged into `main` when every check below passes on a clean checkout.

## Local checks (Node 24)

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo
npm ci
npm run lint            # exits 0, no warnings
npm run typecheck       # exits 0
npm run format:check    # exits 0 (R7.12)
npm test                # unit tests only; passes with Mongo stopped, exits 0
npm run test:all        # exits 0
npm run test:coverage   # 100% for src/domain, src/data, src/server, src/app/api, src/lib (excl. utils.ts)
npm run build           # exits 0; every page and route is dynamic (ƒ)
docker compose build    # exits 0 (R7.9)
```

## Boundary checks

```sh
# Domain unchanged by this phase (R7.3 keeps the evaluator as is).
git diff main --stat -- src/domain   # no output
# Build-time packages are dev dependencies (R7.11).
node -e "const p=require('./package.json');process.exit(p.dependencies.shadcn||p.dependencies['tw-animate-css']?1:0)"  # exits 0
# Pages no longer repeat the layout's dynamic export (R7.25).
grep -rn 'export const dynamic' src/app --include=page.tsx  # no output
# No unused shadcn tokens (R7.25).
grep -nE -- '--(sidebar|chart)' src/app/globals.css  # no output
# One result badge (R7.24).
grep -rn 'bg-emerald-' src/components --include=*.tsx | grep -v enabled-badge.tsx  # no output
# Top-level specs no longer contradict the code (R7.27).
grep -n 'deleting flags' specs/mission.md        # no output
grep -n '22.2' specs/roadmap.md                  # no output
grep -n 'description?: string' specs/tech-stack.md  # no output
# Every earlier phase has a status line (R7.28).
grep -L '^Status:' specs/2026-*/requirements.md  # no output
```

## Required tests

- [ ] V7.1 (R7.1) `src/server/tests/flags.int.test.ts`: an assignment stored after a delete is
      gone when the flag is re-created, and the first evaluation answers `PERCENTAGE`.
- [ ] V7.2 (R7.2) `src/data/tests/assignments.int.test.ts`: the duplicate-key fallback answers the
      caller's value when the winner was removed.
- [ ] V7.3 (R7.3) `src/server/tests/flags.int.test.ts`: killed, excluded and included sticky
      evaluations never call `assignments.get`; existing sticky, race and override tests pass
      unchanged.
- [ ] V7.4 (R7.4) `src/data/tests/indexes.int.test.ts`: the audit index is
      `{ key: 1, at: 1, _id: 1 }`.
- [ ] V7.5 (R7.5) `src/server/tests/schemas.test.ts`:
      - a 200-character `userId` or cohort passes and 201 fails;
      - 100 distinct cohorts pass and 101 fail;
      - 101 entries that de-duplicate to 100 pass.
- [ ] V7.5b (R7.5) `src/server/tests/http.test.ts`: `actorIdFrom` rejects a 201-character header
      and accepts 200.
- [ ] V7.6 (R7.6) `src/server/tests/http.test.ts`: a JSON string, `null` and an array body give
      `issues.body`.
- [ ] V7.7 (R7.7) `src/app/api/tests/users.int.test.ts`: `PUT /api/users/not-a-uuid/cohorts`
      answers 400 `Invalid user id`; an unknown, well-formed UUID still answers 404.
- [ ] V7.8 (R7.8) `src/server/tests/catalog.int.test.ts` and `demo.int.test.ts`: `catalog.user`
      returns the user or `null`; `selectDemoUser` behaves as before.

## Manual checks (dev stack, browser)

- [ ] V7.13 (R7.13) On `/flags/new-checkout`:
      1. Change the percentage without saving.
      2. Kill the flag with the header switch: the unsaved percentage is still in the form.
      3. Save: the flag stays killed, and History shows only the percentage change.
- [ ] V7.14 (R7.14) Killing a flag with the network throttled ("Slow 3G"): the dialog button keeps
      spinning until the switch shows Killed; the switch never jumps back.
- [ ] V7.15 (R7.15) Try it with "Slow 3G":
      1. Press Evaluate.
      2. Switch the user before the answer arrives: no result is shown for the new user.
- [ ] V7.16 (R7.16) `/demo` open in tab A; create a flag in tab B. In tab A, switch user: the new
      flag's row gets an answer (no stuck skeleton).
- [ ] V7.17 (R7.17) A hard reload of `/demo` never shows the `Legacy storefront` badge for a user
      with any feature on.
- [ ] V7.18 (R7.18)
      - On `/users`, remove and re-add the same cohort: Save stays disabled.
      - Drag-selecting a flag key in the list does not open the flag.
      - Reset from `/users` lands on `/`.
- [ ] V7.19 (R7.19) Browser tabs read `Flags · Feature flags`, `Users · Feature flags`,
      `New flag · Feature flags`, `new-checkout · Feature flags`, `Demo · Feature flags`, and
      `Not found · Feature flags` for an unknown URL.
- [ ] V7.20 (R7.20) Creating a flag with an invalid key moves focus to the Key input; a screen
      reader (or the Accessibility tree in DevTools) announces the error as the input's
      description.
- [ ] V7.22 (R7.22) The DevTools Accessibility tree of `/flags/new-checkout` shows h1 (the key)
      and h2 Rollout rules, Try it and History.
- [ ] V7.26 (R7.26) At 375 px wide, `/` shows Key, State, Rollout and the delete button without
      horizontal scrolling inside the table.
- [ ] V7.10 (R7.10) With the dev stack running, `npm run build` on the host succeeds and does not
      disturb the container's dev server.

## Merge criteria

- [ ] All commands above pass and every checkbox is ticked.
- [ ] `specs/roadmap.md` Phase 7 is marked `✅ Complete`; `mission.md`, `tech-stack.md` and
      `README.md` are updated; `CHANGELOG.md` has this branch's entries.
- [ ] No HTTP contract change beyond R7.5–R7.7.
