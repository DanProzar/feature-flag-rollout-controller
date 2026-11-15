import type { Flag } from "../domain";

/** The flag fields an audit entry can change; the key never changes. */
export type FlagField = Exclude<keyof Flag, "key">;

export interface FieldChange {
  field: FlagField;
  /** `undefined` when the entry created the flag. */
  before: Flag[FlagField] | undefined;
  after: Flag[FlagField];
}

const FIELDS: readonly FlagField[] = [
  "enabled",
  "percentage",
  "includeCohorts",
  "excludeCohorts",
  "sticky",
];

function same(a: Flag[FlagField], b: Flag[FlagField]): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => item === b[i]);
  }
  return a === b;
}

/**
 * The fields an audit entry changed, in form order. A created flag (`before === null`) lists every
 * field; an unchanged PUT gives `[]`.
 */
export function diffFlags(before: Flag | null, after: Flag): FieldChange[] {
  return FIELDS.filter(
    (field) => before === null || !same(before[field], after[field]),
  ).map((field) => ({ field, before: before?.[field], after: after[field] }));
}

/** A field value as shown in the audit history. */
export function formatFieldValue(
  field: FlagField,
  value: Flag[FlagField] | undefined,
): string {
  if (value === undefined) return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "none";
  if (field === "percentage") return `${value}%`;
  if (field === "enabled") return value ? "live" : "killed";
  return value ? "yes" : "no";
}
