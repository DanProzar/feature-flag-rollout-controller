import { describe, expect, it } from "vitest";
import { bucket } from "./bucket";
import { evaluate } from "./evaluate";
import type { Flag } from "./types";

const KEY = "new-checkout";

function flag(overrides: Partial<Flag> = {}): Flag {
  return {
    key: KEY,
    enabled: true,
    percentage: 50,
    includeCohorts: [],
    excludeCohorts: [],
    sticky: false,
    ...overrides,
  };
}

/** Finds a userId whose bucket for `KEY` satisfies `predicate`. */
function userWhere(predicate: (b: number) => boolean): string {
  for (let i = 0; ; i++) {
    const userId = `user-${i}`;
    if (predicate(bucket(KEY, userId))) return userId;
  }
}

const userIn = userWhere((b) => b < 50);
const userOut = userWhere((b) => b >= 50);

describe("evaluate", () => {
  describe("FLAG_NOT_FOUND", () => {
    it("returns false when the flag does not exist", () => {
      expect(
        evaluate(null, { userId: userIn, cohorts: ["beta"] }, true),
      ).toEqual({
        enabled: false,
        reason: "FLAG_NOT_FOUND",
        persist: false,
      });
    });
  });

  describe("KILL_SWITCH", () => {
    it("returns false when the flag is disabled", () => {
      expect(
        evaluate(flag({ enabled: false, percentage: 100 }), {
          userId: userIn,
          cohorts: [],
        }),
      ).toEqual({
        enabled: false,
        reason: "KILL_SWITCH",
        persist: false,
      });
    });

    it("beats an included cohort and a stored sticky value", () => {
      const f = flag({
        enabled: false,
        includeCohorts: ["beta"],
        sticky: true,
      });
      expect(evaluate(f, { userId: userIn, cohorts: ["beta"] }, true)).toEqual({
        enabled: false,
        reason: "KILL_SWITCH",
        persist: false,
      });
    });
  });

  describe("COHORT_EXCLUDED", () => {
    it("returns false when any user cohort is excluded", () => {
      const f = flag({ percentage: 100, excludeCohorts: ["internal"] });
      expect(
        evaluate(f, { userId: userIn, cohorts: ["beta", "internal"] }),
      ).toEqual({
        enabled: false,
        reason: "COHORT_EXCLUDED",
        persist: false,
      });
    });

    it("beats inclusion when the user is in both", () => {
      const f = flag({
        includeCohorts: ["beta"],
        excludeCohorts: ["internal"],
      });
      expect(
        evaluate(f, { userId: userIn, cohorts: ["beta", "internal"] }).reason,
      ).toBe("COHORT_EXCLUDED");
    });

    it("beats a stored sticky value", () => {
      const f = flag({ excludeCohorts: ["internal"], sticky: true });
      expect(
        evaluate(f, { userId: userIn, cohorts: ["internal"] }, true),
      ).toEqual({
        enabled: false,
        reason: "COHORT_EXCLUDED",
        persist: false,
      });
    });
  });

  describe("COHORT_INCLUDED", () => {
    it("returns true when any user cohort is included, bypassing percentage", () => {
      const f = flag({ percentage: 0, includeCohorts: ["beta"] });
      expect(evaluate(f, { userId: userOut, cohorts: ["beta"] })).toEqual({
        enabled: true,
        reason: "COHORT_INCLUDED",
        persist: false,
      });
    });

    it("beats a stored sticky value", () => {
      const f = flag({ includeCohorts: ["beta"], sticky: true });
      expect(
        evaluate(f, { userId: userOut, cohorts: ["beta"] }, false),
      ).toEqual({
        enabled: true,
        reason: "COHORT_INCLUDED",
        persist: false,
      });
    });
  });

  describe("STICKY", () => {
    it.each([true, false])(
      "returns a stored value of %s, ignoring percentage",
      (stored) => {
        const f = flag({ sticky: true, percentage: stored ? 0 : 100 });
        expect(evaluate(f, { userId: userIn, cohorts: [] }, stored)).toEqual({
          enabled: stored,
          reason: "STICKY",
          persist: false,
        });
      },
    );

    it("ignores a stored value for a non-sticky flag", () => {
      const f = flag({ sticky: false, percentage: 100 });
      expect(evaluate(f, { userId: userOut, cohorts: [] }, false)).toEqual({
        enabled: true,
        reason: "PERCENTAGE",
        persist: false,
      });
    });
  });

  describe("PERCENTAGE", () => {
    it("is on when the bucket is below the percentage", () => {
      expect(evaluate(flag(), { userId: userIn, cohorts: [] })).toEqual({
        enabled: true,
        reason: "PERCENTAGE",
        persist: false,
      });
    });

    it("is off when the bucket is at or above the percentage", () => {
      expect(evaluate(flag(), { userId: userOut, cohorts: [] })).toEqual({
        enabled: false,
        reason: "PERCENTAGE",
        persist: false,
      });
    });

    it("is off exactly at the threshold", () => {
      const b = bucket(KEY, userIn);
      expect(
        evaluate(flag({ percentage: b }), { userId: userIn, cohorts: [] })
          .enabled,
      ).toBe(false);
      expect(
        evaluate(flag({ percentage: b + 1 }), { userId: userIn, cohorts: [] })
          .enabled,
      ).toBe(true);
    });

    it("is always off at 0% and always on at 100%", () => {
      for (const userId of [userIn, userOut]) {
        expect(
          evaluate(flag({ percentage: 0 }), { userId, cohorts: [] }).enabled,
        ).toBe(false);
        expect(
          evaluate(flag({ percentage: 100 }), { userId, cohorts: [] }).enabled,
        ).toBe(true);
      }
    });

    it.each([
      [userIn, true],
      [userOut, false],
    ])(
      "asks to persist the result for a sticky flag (user %s → %s)",
      (userId, enabled) => {
        expect(
          evaluate(flag({ sticky: true }), { userId, cohorts: [] }),
        ).toEqual({
          enabled,
          reason: "PERCENTAGE",
          persist: true,
        });
      },
    );
  });
});
