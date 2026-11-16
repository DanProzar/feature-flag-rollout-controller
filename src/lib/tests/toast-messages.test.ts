import { describe, expect, it } from "vitest";
import type { Flag } from "../../domain";
import {
  flagDeletedToast,
  flagSavedToast,
  killSwitchToast,
  resetToast,
  userCohortsToast,
} from "../toast-messages";

const FLAG: Flag = {
  key: "new-checkout",
  enabled: true,
  percentage: 100,
  includeCohorts: [],
  excludeCohorts: [],
  sticky: false,
};

describe("flagSavedToast", () => {
  it("lists every field for a created flag", () => {
    expect(flagSavedToast(null, FLAG)).toStrictEqual({
      title: "Created new-checkout",
      description: "live · 100% · include: none · exclude: none · sticky: no",
    });
  });

  it("formats created values like the audit history", () => {
    const flag = {
      ...FLAG,
      enabled: false,
      percentage: 25,
      includeCohorts: ["beta", "staff"],
      excludeCohorts: ["blocked"],
      sticky: true,
    };
    expect(flagSavedToast(null, flag).description).toBe(
      "killed · 25% · include: beta, staff · exclude: blocked · sticky: yes",
    );
  });

  it("lists only the changed fields, in form order", () => {
    const after = { ...FLAG, sticky: true, percentage: 25 };
    expect(flagSavedToast({ ...FLAG, percentage: 10 }, after)).toStrictEqual({
      title: "Saved new-checkout",
      description: "percentage: 10% → 25%; sticky: no → yes",
    });
  });

  it("labels every field", () => {
    const after = {
      ...FLAG,
      enabled: false,
      includeCohorts: ["beta"],
      excludeCohorts: ["blocked"],
    };
    expect(flagSavedToast(FLAG, after).description).toBe(
      "state: live → killed; include: none → beta; exclude: none → blocked",
    );
  });

  it("says No changes for identical flags", () => {
    expect(flagSavedToast(FLAG, { ...FLAG })).toStrictEqual({
      title: "Saved new-checkout",
      description: "No changes",
    });
  });
});

describe("killSwitchToast", () => {
  it("describes a kill", () => {
    expect(killSwitchToast("demo", false)).toStrictEqual({
      title: "Killed demo",
      description: "Every evaluation returns false (KILL_SWITCH).",
    });
  });

  it("describes a revive", () => {
    expect(killSwitchToast("demo", true)).toStrictEqual({
      title: "demo is live again",
      description: "Rollout rules apply again.",
    });
  });
});

describe("flagDeletedToast", () => {
  it("names the flag and what is kept", () => {
    expect(flagDeletedToast("demo")).toStrictEqual({
      title: "Deleted demo",
      description: "Sticky assignments were removed; its history is kept.",
    });
  });
});

describe("userCohortsToast", () => {
  it.each([
    [["user"], ["user", "tester"], "added: tester"],
    [["user", "beta"], ["beta"], "removed: user"],
    [["user"], ["tester", "staff"], "added: tester, staff; removed: user"],
    [["user", "beta"], ["user", "beta"], "No changes"],
    [["user", "beta"], ["beta", "user"], "No changes"],
    [[], [], "No changes"],
  ])("%j → %j gives %s", (before, after, description) => {
    expect(userCohortsToast("Alice", before, after)).toStrictEqual({
      title: "Saved cohorts for Alice",
      description,
    });
  });
});

describe("resetToast", () => {
  it("names the reset time and what is kept", () => {
    expect(resetToast(new Date("2026-01-01T02:00:00+02:00"))).toStrictEqual({
      title: "Reset complete",
      description:
        "Flags and sticky assignments cleared at 2026-01-01T00:00:00.000Z. Audit history, users and cohorts are kept.",
    });
  });
});
