import type {
  AssignmentsRepository,
  AuditEntry,
  AuditRepository,
  FlagsRepository,
} from "../data";
import { type Clock, type Flag, type Reason, evaluate } from "../domain";
import type { EvaluateBody, PutFlagBody } from "./schemas";

/** What evaluate answers; the domain's `persist` is handled here and never exposed. */
export interface Evaluation {
  enabled: boolean;
  reason: Reason;
}

export interface FlagService {
  /** The flag `key`, or `null` if there is none. */
  get(key: string): Promise<Flag | null>;
  /** Every flag, sorted by key. */
  list(): Promise<Flag[]>;
  /** Creates or fully replaces the flag `key` and appends one audit entry; returns the new flag. */
  put(key: string, body: PutFlagBody, actorId: string | null): Promise<Flag>;
  /**
   * Deletes the flag `key` with its sticky assignments and appends one audit entry (`after: null`);
   * returns the deleted flag, or `null` (nothing written) when there is none.
   */
  delete(key: string, actorId: string | null): Promise<Flag | null>;
  /**
   * Evaluates the flag `key` for a user. The sticky assignment is read only when a sticky flag
   * reaches the percentage rule, and that rule's first result for a sticky flag is stored.
   */
  evaluate(key: string, ctx: EvaluateBody): Promise<Evaluation>;
  /** The audit entries for `key`, oldest first; `[]` when there are none. */
  audit(key: string): Promise<AuditEntry[]>;
}

export interface FlagServiceDeps {
  flags: FlagsRepository;
  assignments: AssignmentsRepository;
  audit: AuditRepository;
  clock: Clock;
}

export function createFlagService({
  flags,
  assignments,
  audit,
  clock,
}: FlagServiceDeps): FlagService {
  return {
    get(key) {
      return flags.get(key);
    },

    list() {
      return flags.list();
    },

    async put(key, body, actorId) {
      const after: Flag = { key, ...body };
      const before = await flags.upsert(after);
      // A new flag starts fresh, even if an evaluation racing an earlier delete or reset stored
      // an assignment after that delete had cleared them.
      if (!before) await assignments.deleteByFlag(key);
      // Every PUT is audited, even when nothing changed.
      await audit.append({ at: clock.now(), key, actorId, before, after });
      return after;
    },

    async delete(key, actorId) {
      const before = await flags.delete(key);
      if (!before) return null;
      // A flag re-created under this key must not inherit the old flag's sticky results.
      await assignments.deleteByFlag(key);
      await audit.append({
        at: clock.now(),
        key,
        actorId,
        before,
        after: null,
      });
      return before;
    },

    async evaluate(key, { userId, cohorts }) {
      const flag = await flags.get(key);
      const ctx = { userId, cohorts };
      // Kill, exclude and include never use a stored value, so it is read only when a sticky
      // flag's answer would come from the percentage rule (`persist`): one round trip fewer.
      let result = evaluate(flag, ctx);
      if (result.persist) {
        const stored = await assignments.get(key, userId);
        if (stored !== undefined) result = evaluate(flag, ctx, stored);
      }
      if (!result.persist) {
        return { enabled: result.enabled, reason: result.reason };
      }
      // A concurrent first evaluation may have stored the other value; answer what is stored.
      const enabled = await assignments.insertIfAbsent(
        key,
        userId,
        result.enabled,
      );
      return { enabled, reason: result.reason };
    },

    audit(key) {
      return audit.listByKey(key);
    },
  };
}
