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
   * Evaluates the flag `key` for a user, reading the sticky assignment only for sticky flags and
   * storing the first percentage result of a sticky flag.
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
      // Every PUT is audited, even when nothing changed.
      await audit.append({ at: clock.now(), key, actorId, before, after });
      return after;
    },

    async evaluate(key, { userId, cohorts }) {
      const flag = await flags.get(key);
      const stored = flag?.sticky
        ? await assignments.get(key, userId)
        : undefined;
      const result = evaluate(flag, { userId, cohorts }, stored);
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
