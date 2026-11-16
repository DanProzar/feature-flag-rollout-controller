import type { Flag } from "../domain";
import { diffFlags, FIELD_LABELS, formatFieldValue } from "./audit-diff";

// Texts of the success toasts. Values are formatted like the audit history, so both read the same.

export interface ToastMessage {
  title: string;
  description: string;
}

const NO_CHANGES = "No changes";

/**
 * A created flag (`before === null`) lists every field; a saved one lists only the changed fields
 * as `label: before → after`, in form order.
 */
export function flagSavedToast(before: Flag | null, after: Flag): ToastMessage {
  if (before === null) {
    const value = (field: keyof typeof FIELD_LABELS) =>
      formatFieldValue(field, after[field]);
    return {
      title: `Created ${after.key}`,
      description: [
        value("enabled"),
        value("percentage"),
        `include: ${value("includeCohorts")}`,
        `exclude: ${value("excludeCohorts")}`,
        `sticky: ${value("sticky")}`,
      ].join(" · "),
    };
  }
  const changes = diffFlags(before, after).map(
    ({ field, before, after }) =>
      `${FIELD_LABELS[field]}: ${formatFieldValue(field, before)} → ${formatFieldValue(field, after)}`,
  );
  return {
    title: `Saved ${after.key}`,
    description: changes.length ? changes.join("; ") : NO_CHANGES,
  };
}

/** `enabled` is the flag's new state: `false` after a kill, `true` after a revive. */
export function killSwitchToast(key: string, enabled: boolean): ToastMessage {
  return enabled
    ? {
        title: `${key} is live again`,
        description: "Rollout rules apply again.",
      }
    : {
        title: `Killed ${key}`,
        description: "Every evaluation returns false (KILL_SWITCH).",
      };
}

export function flagDeletedToast(key: string): ToastMessage {
  return {
    title: `Deleted ${key}`,
    description: "Sticky assignments were removed; its history is kept.",
  };
}

/** The cohorts added and removed; order does not count as a change. */
export function userCohortsToast(
  name: string,
  before: readonly string[],
  after: readonly string[],
): ToastMessage {
  const added = after.filter((cohort) => !before.includes(cohort));
  const removed = before.filter((cohort) => !after.includes(cohort));
  const parts = [
    ...(added.length ? [`added: ${added.join(", ")}`] : []),
    ...(removed.length ? [`removed: ${removed.join(", ")}`] : []),
  ];
  return {
    title: `Saved cohorts for ${name}`,
    description: parts.length ? parts.join("; ") : NO_CHANGES,
  };
}

export function resetToast(now: Date): ToastMessage {
  return {
    title: "Reset complete",
    description: `Flags and sticky assignments cleared at ${now.toISOString()}. Audit history, users and cohorts are kept.`,
  };
}
