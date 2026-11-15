# Phase 1 — Pure evaluator: Requirements

Branch: `feature/phase-1-evaluator`
Roadmap: `specs/roadmap.md` → Phase 1, items 4–13.

## Context

Phase 0 delivered a runnable, tested, containerised skeleton. Per the mission's first principle
("Correctness first — the evaluator is a pure, exhaustively unit-tested function"), the evaluator is
built next, before any persistence, API or UI. It lives in `src/domain`, has no I/O, and is the
single source of truth for the rules in `mission.md` → "Evaluation rules". Phases 2–4 only load
inputs for it and act on its output.

## Scope

Strictly roadmap items 4–13:

1. **Types** (`src/domain/types.ts`)
   - `Flag`: `key`, `enabled`, `percentage`, `includeCohorts`, `excludeCohorts`, `sticky` — exactly
     the fields in `mission.md` → "Flag".
   - `EvaluationContext`: `{ userId: string; cohorts: string[] }`.
   - `Reason`: string union `FLAG_NOT_FOUND | KILL_SWITCH | COHORT_EXCLUDED | COHORT_INCLUDED |
     STICKY | PERCENTAGE`.
   - `EvaluationResult`: `{ enabled: boolean; reason: Reason; persist: boolean }`.
2. **Bucketing** (`src/domain/bucket.ts`)
   - `bucket(flagKey, userId): number` = `zlib.crc32(Buffer.from(\`${flagKey}:${userId}\`, "utf8")) % 100`.
   - `node:zlib` is the only Node import allowed in `src/domain` (pure computation, no I/O).
3. **Evaluator** (`src/domain/evaluate.ts`)
   - `evaluate(flag: Flag | null, ctx: EvaluationContext, stickyValue?: boolean): EvaluationResult`.
   - Rules in order, first match wins:
     1. `flag === null` → `false` / `FLAG_NOT_FOUND`
     2. `!flag.enabled` → `false` / `KILL_SWITCH`
     3. any cohort ∈ `excludeCohorts` → `false` / `COHORT_EXCLUDED`
     4. any cohort ∈ `includeCohorts` → `true` / `COHORT_INCLUDED`
     5. `flag.sticky && stickyValue !== undefined` → `stickyValue` / `STICKY`
     6. otherwise → `bucket(key, userId) < percentage` / `PERCENTAGE`
   - `persist` is `true` only for rule 6 on a sticky flag; `false` everywhere else.
   - A `stickyValue` passed for a non-sticky flag is ignored.
4. **Clock** (`src/domain/clock.ts`)
   - `Clock` interface `{ now(): Date }`.
   - `systemClock` (real time) and `frozenClock(at: Date)` (always returns a copy of `at`).
5. **Barrel** `src/domain/index.ts` re-exporting the public API.

## Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Layout | **Split modules**: `types.ts`, `bucket.ts`, `evaluate.ts`, `clock.ts`, `index.ts`, with tests in `src/domain/tests/*.test.ts` | Small focused files map 1:1 to roadmap items and keep tests readable. |
| Signature | `evaluate(flag \| null, ctx, stickyValue?)` | Recorded in `tech-stack.md`; `null` models "not found" so the caller passes the repository result straight through. |
| `persist` | Always present as a boolean | Callers branch on one field with no `undefined` case. |
| `Flag` shape | Mirrors `mission.md` only — no `_id`, `description`, `createdAt`, `updatedAt` | The domain doesn't care about storage metadata; Phase 2 maps documents to `Flag`. |
| Input validation | **None in the domain** | Zod validates at the HTTP boundary in Phase 3. The evaluator trusts its typed inputs. |
| Empty `userId` | Treated like any other string | No special case in the rules; the API decides whether to reject it. |
| Clock | Interface + two implementations; no global mutable clock yet | Phase 3 decides how the reset endpoint swaps the active clock. |
| Testing | Example tests + table-driven precedence matrix + **property-based tests** with `fast-check` | Exhaustive confidence in a small, critical function. |
| Coverage | `@vitest/coverage-v8`, 100% lines/branches on `src/domain` | Cheap to hold for pure code; catches untested rules. |

## Out of scope

- MongoDB, repositories, sticky persistence (Phase 2).
- Zod schemas, route handlers, the test reset endpoint, wiring the clock into the app (Phase 3).
- Any UI (Phase 4).
- Multivariate flags, environments, auth (mission non-goals).
