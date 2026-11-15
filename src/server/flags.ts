import type {
  AssignmentsRepository,
  AuditEntry,
  AuditRepository,
  FlagsRepository,
} from "../data";
import type { Clock, Flag } from "../domain";
import type { PutFlagBody } from "./schemas";

export interface FlagService {
  /** Creates or fully replaces the flag `key` and appends one audit entry; returns the new flag. */
  put(key: string, body: PutFlagBody, actorId: string | null): Promise<Flag>;
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
  audit,
  clock,
}: FlagServiceDeps): FlagService {
  return {
    async put(key, body, actorId) {
      const after: Flag = { key, ...body };
      const before = await flags.upsert(after);
      // Every PUT is audited, even when nothing changed.
      await audit.append({ at: clock.now(), key, actorId, before, after });
      return after;
    },

    audit(key) {
      return audit.listByKey(key);
    },
  };
}
