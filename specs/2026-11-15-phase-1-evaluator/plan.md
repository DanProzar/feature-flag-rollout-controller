# Phase 1 — Pure evaluator: Plan

Each group ends in a working state and can be committed on its own. Write the tests first in each
group, watch them fail, then implement.

## 1. Test tooling
1. Install `fast-check` and `@vitest/coverage-v8` as dev dependencies.
2. Add a `test:coverage` script and configure coverage in `vitest.config.mts`: include
   `src/domain/**`, exclude `src/domain/tests/**`, `index.ts` and `types.ts` (types only, no runtime
   code), thresholds 100% for statements, branches, functions and lines.
3. Ignore `coverage/**` in `eslint.config.mjs` so lint stays clean after a coverage run.
4. Run `npm test`, then commit.

## 2. Domain types (roadmap item 4)
1. Create `src/domain/types.ts` with `Flag`, `EvaluationContext`, `Reason`, `EvaluationResult`
   as in `requirements.md`.
2. Create `src/domain/index.ts` re-exporting the types.
3. Run `typecheck` and `format`, then commit.

## 3. Bucketing (roadmap item 9)
1. `src/domain/tests/bucket.test.ts` (shared helpers in `src/domain/tests/helpers.ts`):
   - CRC32 vector: `zlib.crc32(Buffer.from("123456789"))` is `0xCBF43926`; `bucket` of an input
     whose concatenation is known gives `crc % 100`.
   - A pinned table of `(flagKey, userId) → bucket` values, so any algorithm change fails loudly.
   - Non-ASCII input (e.g. `"прапор"`, `"🚀"`) hashes the UTF-8 bytes.
   - A value whose CRC32 is ≥ `2^31` stays positive (unsigned handling).
   - Pinned rows with uppercase, surrounding spaces and decomposed Unicode, so no normalisation
     (case, trim, NFC) creeps into the hash input.
   - Property tests (`fast-check`, arbitrary Unicode strings): result equals an independent bitwise
     CRC32 reference `% 100`; result is an integer in `[0, 99]`; buckets vary across flag keys.
2. Implement `src/domain/bucket.ts` with `node:zlib` `crc32`.
3. Export from `index.ts`, run tests, commit.

## 4. Evaluator rules (roadmap items 5–8, 10, 11)
Add one rule at a time to `src/domain/evaluate.ts`, each with its own tests in
`src/domain/tests/evaluate.test.ts`:
1. Flag not found → `false` / `FLAG_NOT_FOUND`, `persist: false`.
2. Kill switch → `false` / `KILL_SWITCH`, even for included cohorts and sticky values.
3. Excluded cohort → `false` / `COHORT_EXCLUDED`; a user in both include and exclude is excluded.
4. Included cohort → `true` / `COHORT_INCLUDED`.
5. Percentage → `bucket < percentage`; `0` always off, `100` always on; `persist` is `true` only
   when `flag.sticky`. Use `bucket()` in tests to pick users on either side of a threshold.
6. Sticky → returns `stickyValue` / `STICKY` (both `true` and `false`), ignores percentage,
   `persist: false`; kill/exclude/include still win; a non-sticky flag ignores `stickyValue`.
7. Export `evaluate` from `index.ts`, run tests, commit (one commit per rule is fine too).

## 5. Precedence matrix + properties (roadmap item 12)
1. `src/domain/tests/evaluate.matrix.test.ts`: a literal table (`it.each`) with one readable row
   per precedence case — each rule against every rule below it, plus sticky/non-sticky and
   below/above percentage — with the expected `{ enabled, reason, persist }` written out from
   `mission.md`, not computed.
2. `src/domain/tests/evaluate.properties.test.ts` (`fast-check`, generators built so each property
   hits its target case on every run):
   - `persist` is `true` exactly when the result came from the percentage rule on a sticky flag.
   - `!flag.enabled` ⇒ `KILL_SWITCH`.
   - A cohort in both lists ⇒ `COHORT_EXCLUDED`.
   - With no cohort match and no stored value, `enabled === bucket < percentage` for every
     percentage 0–100; raising the percentage never turns a user off.
   - A stored sticky value is returned whatever the percentage.
3. `src/domain/tests/index.test.ts`: `src/domain/index.ts` exports the public API.
4. Run tests, commit.

## 6. Clock (roadmap item 13)
1. `src/domain/tests/clock.test.ts`: `systemClock.now()` is within a small window of `Date.now()`;
   `frozenClock(at).now()` always equals `at` (compared as a timestamp, not a shared `Date`), returns a
   new `Date` each call, and is unaffected by mutating the input or a returned `Date`.
2. Implement `src/domain/clock.ts`, export from `index.ts`, run tests, commit.

## 7. Wrap-up
1. Remove `src/sanity.test.ts` (superseded by real tests).
2. Run the full validation checklist.
3. Tick Phase 1 in `specs/roadmap.md`, add a `CHANGELOG.md` entry.
4. Open a PR from `feature/phase-1-evaluator` into `main`.
