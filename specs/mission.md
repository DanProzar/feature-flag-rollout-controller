# Mission

## Purpose

The Feature-flag Rollout Controller is an **internal tool for developers and product managers** to
release features safely and gradually. Admins define flags and their rollout rules in a web UI;
applications ask an evaluation API "is flag X on for user Y?" and get a deterministic, explainable
answer.

## Users

- **Developers** — create flags, wire the evaluation API into services, flip the kill switch during
  incidents.
- **Product managers** — tune rollout percentage and target cohorts without a deploy.
- **Client applications** — call `POST /api/flags/:key/evaluate` with `{ userId, cohorts }`.
- **Auditors / on-call** — read a flag's change history (who changed what, when, before/after).

## Core capabilities (from README input)

1. **Percentage rollout** — enable a flag for N% of users via stable hash-based bucketing.
2. **Cohort include/exclude** — force a flag on for included cohorts, off for excluded cohorts.
3. **Kill switch** — instantly force a flag off for everyone, overriding everything else.
4. **Sticky assignments** — per-flag opt-in (`sticky: true`): a user's first percentage-based result
   for a flag is persisted and reused, so later percentage changes never flip users who were already
   assigned.

## Flag

| Field | Type | Meaning |
|-------|------|---------|
| `key` | string, unique | Flag identifier, also part of the hash input |
| `enabled` | boolean | Kill-switch master: `false` forces the flag off for everyone |
| `percentage` | integer 0–100 | Share of users bucketed on |
| `includeCohorts` | string[] | Cohorts forced on (bypass percentage) |
| `excludeCohorts` | string[] | Cohorts forced off |
| `sticky` | boolean | Persist and reuse each user's percentage result |

## Evaluation rules (source of truth)

For a request `{ userId, cohorts[] }` against a flag, evaluate in this order; the first matching
rule wins:

| # | Rule | Result | Persisted? |
|---|------|--------|------------|
| 1 | Flag does not exist | `false` (reason `FLAG_NOT_FOUND`) | No |
| 2 | `enabled === false` | `false` (reason `KILL_SWITCH`) | No |
| 3 | Any user cohort ∈ `excludeCohorts` | `false` (reason `COHORT_EXCLUDED`) | No |
| 4 | Any user cohort ∈ `includeCohorts` | `true` (reason `COHORT_INCLUDED`) | No |
| 5 | `sticky` and an assignment exists for `(flag, user)` | stored value (reason `STICKY`) | Already |
| 6 | Otherwise | `bucket < percentage` (reason `PERCENTAGE`) | Only if `sticky` |

**Bucket** = `CRC32(UTF-8 bytes of flagKey + ":" + userId)` as an unsigned 32-bit integer, `% 100`,
giving a value in `[0, 99]`. So `percentage: 0` is always off and `percentage: 100` is always on.

Notes:

- Exclude beats include when a user is in both.
- Kill, exclude and include always apply on every evaluation, even if a sticky value exists; they
  do not overwrite the stored sticky value.
- Only rule 6 creates a sticky assignment, and only for flags with `sticky: true`. The stored value
  is reused regardless of later percentage changes.
- For non-sticky flags, rule 5 is skipped and the result simply follows the current percentage.
- Every response returns the boolean **and** the reason, so behaviour is explainable.

## Audit trail

Every flag upsert or delete appends an audit entry `{ at, key, actorId, before, after }` (`before`
is `null` on create, `after` is `null` on delete). `actorId` comes
from the optional `X-User-Id` request header and is `null` when the header is absent. The log is
append-only, readable per flag, and survives the test reset.

## Principles

- **Correctness first** — the evaluator is a pure, exhaustively unit-tested function.
- **Deterministic & explainable** — same inputs and stored state give the same answer and reason.
- **Small, safe steps** — work proceeds in tiny phases, each shippable and tested.
- **Simple to run** — one `docker compose up` starts the whole system locally.

## Non-goals

- **Multiple environments** (dev/staging/prod flag sets).
- **Streaming SDK** — clients call the plain HTTP API; no push or long-lived connections.
- **Experimentation statistics** — no A/B analysis, exposure metrics or significance testing.

Also out of scope for now: multivariate (non-boolean) flags, authentication/RBAC (`X-User-Id` is
trusted as-is, for attribution only), and deleting flags.
