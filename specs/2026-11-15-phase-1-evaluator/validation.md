# Phase 1 — Pure evaluator: Validation

The phase is done and can be merged into `main` when every check below passes on a clean checkout.

## Local checks (Node 24)

```sh
npm ci
npm run lint            # exits 0, no warnings
npm run typecheck       # exits 0
npm run format:check    # exits 0
npm test                # all tests pass, exits 0
npm run test:coverage   # 100% for src/domain (tests/, index.ts and types.ts excluded), exits 0
npm run build           # exits 0
```

## Purity check

```sh
# Allowlist: domain code imports only sibling modules and node:zlib.
grep -rnE 'from "' src/domain --include=*.ts --exclude-dir=tests | grep -vE 'from "(\./|node:zlib")'  # no output
# Only clock.ts reads the wall clock.
grep -rnE 'new Date\(|Date\.now\(' src/domain --include=*.ts --exclude-dir=tests | grep -v '/clock.ts:'  # no output
```

## Required tests

- [ ] `bucket`: CRC32 vector `"123456789"` → `0xCBF43926`; pinned `(flagKey, userId) → bucket`
      table; non-ASCII input; a hash ≥ `2^31` gives a non-negative bucket.
- [ ] `bucket` properties over arbitrary Unicode: matches an independent CRC32 reference, integer in `[0, 99]`.
- [ ] One describe block per rule (`FLAG_NOT_FOUND`, `KILL_SWITCH`, `COHORT_EXCLUDED`,
      `COHORT_INCLUDED`, `STICKY`, `PERCENTAGE`).
- [ ] Percentage edge cases: `0` always off and `100` always on (property over arbitrary users).
- [ ] `persist` is `true` only for `PERCENTAGE` on a sticky flag.
- [ ] Sticky: stored `true` and `false` both returned; kill/exclude/include win over a stored value;
      non-sticky flags ignore a supplied `stickyValue`.
- [ ] Table-driven precedence matrix matching `mission.md` → "Evaluation rules".
- [ ] Property tests: determinism, exclude beats include, kill switch always wins, monotonic rollout,
      `persist` implications.
- [ ] `frozenClock` returns the frozen instant and is immune to caller mutation.

## Review checklist

- [ ] `evaluate` signature is `(flag: Flag | null, ctx: EvaluationContext, stickyValue?: boolean)
      => EvaluationResult`, and `persist` is always a boolean.
- [ ] `Flag` has exactly the six fields from `mission.md`; no storage metadata.
- [ ] No input validation or throwing in `src/domain`.
- [ ] The bucket algorithm matches `tech-stack.md` → "Hashing" exactly (`flagKey:userId`, UTF-8,
      unsigned CRC32, `% 100`).
- [ ] Public API is exported from `src/domain/index.ts`.
- [ ] `fast-check` and `@vitest/coverage-v8` are dev dependencies only; `package-lock.json` updated.
- [ ] Nothing outside roadmap items 4–13 was added: no `src/data`, no API routes, no UI.
- [ ] Phase 1 marked complete in `specs/roadmap.md` and a `CHANGELOG.md` entry added.
- [ ] Each task group from `plan.md` is its own commit on `feature/phase-1-evaluator`.
