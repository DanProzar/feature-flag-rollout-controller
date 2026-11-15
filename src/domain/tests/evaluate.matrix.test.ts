import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluate";
import type { EvaluationResult, Flag, Reason } from "../types";
import { findUser } from "./helpers";

const KEY = "matrix-flag";
const BASE: Flag = {
  key: KEY,
  enabled: true,
  percentage: 50,
  includeCohorts: ["beta"],
  excludeCohorts: ["internal"],
  sticky: false,
};
// Users on either side of the 50% rollout.
const IN = findUser(KEY, (b) => b < 50);
const OUT = findUser(KEY, (b) => b >= 50);

interface Row {
  name: string;
  flag: Partial<Flag> | null;
  userId: string;
  cohorts: string[];
  stored?: boolean;
  expected: EvaluationResult;
}

const off = (reason: Reason): EvaluationResult => ({
  enabled: false,
  reason,
  persist: false,
});
const on = (reason: Reason): EvaluationResult => ({
  enabled: true,
  reason,
  persist: false,
});

// Expected results are written out from specs/mission.md → "Evaluation rules", not computed.
const rows: Row[] = [
  // 1. A missing flag beats everything.
  {
    name: "missing flag",
    flag: null,
    userId: IN,
    cohorts: [],
    expected: off("FLAG_NOT_FOUND"),
  },
  {
    name: "missing flag, included cohort, stored true",
    flag: null,
    userId: IN,
    cohorts: ["beta"],
    stored: true,
    expected: off("FLAG_NOT_FOUND"),
  },

  // 2. The kill switch beats rules 3–6.
  {
    name: "killed, excluded cohort",
    flag: { enabled: false },
    userId: IN,
    cohorts: ["internal"],
    expected: off("KILL_SWITCH"),
  },
  {
    name: "killed, included cohort",
    flag: { enabled: false },
    userId: IN,
    cohorts: ["beta"],
    expected: off("KILL_SWITCH"),
  },
  {
    name: "killed, sticky with stored true",
    flag: { enabled: false, sticky: true },
    userId: IN,
    cohorts: [],
    stored: true,
    expected: off("KILL_SWITCH"),
  },
  {
    name: "killed, 100% rollout",
    flag: { enabled: false, percentage: 100 },
    userId: IN,
    cohorts: [],
    expected: off("KILL_SWITCH"),
  },

  // 3. Exclusion beats rules 4–6.
  {
    name: "excluded and included",
    flag: {},
    userId: IN,
    cohorts: ["beta", "internal"],
    expected: off("COHORT_EXCLUDED"),
  },
  {
    name: "excluded, sticky with stored true",
    flag: { sticky: true },
    userId: IN,
    cohorts: ["internal"],
    stored: true,
    expected: off("COHORT_EXCLUDED"),
  },
  {
    name: "excluded, 100% rollout",
    flag: { percentage: 100 },
    userId: IN,
    cohorts: ["internal"],
    expected: off("COHORT_EXCLUDED"),
  },

  // 4. Inclusion beats rules 5–6.
  {
    name: "included, sticky with stored false",
    flag: { sticky: true },
    userId: OUT,
    cohorts: ["beta"],
    stored: false,
    expected: on("COHORT_INCLUDED"),
  },
  {
    name: "included, 0% rollout",
    flag: { percentage: 0 },
    userId: OUT,
    cohorts: ["beta"],
    expected: on("COHORT_INCLUDED"),
  },

  // 5. A stored value beats the percentage, but only for sticky flags.
  {
    name: "sticky, stored true, user above percentage",
    flag: { sticky: true },
    userId: OUT,
    cohorts: [],
    stored: true,
    expected: on("STICKY"),
  },
  {
    name: "sticky, stored false, user below percentage",
    flag: { sticky: true },
    userId: IN,
    cohorts: [],
    stored: false,
    expected: off("STICKY"),
  },
  {
    name: "non-sticky, stored false, user below percentage",
    flag: {},
    userId: IN,
    cohorts: [],
    stored: false,
    expected: on("PERCENTAGE"),
  },
  {
    name: "non-sticky, stored true, user above percentage",
    flag: {},
    userId: OUT,
    cohorts: [],
    stored: true,
    expected: off("PERCENTAGE"),
  },

  // 6. Percentage; persisted for sticky flags whatever the result.
  {
    name: "sticky, nothing stored, user below percentage",
    flag: { sticky: true },
    userId: IN,
    cohorts: [],
    expected: { enabled: true, reason: "PERCENTAGE", persist: true },
  },
  {
    name: "sticky, nothing stored, user above percentage",
    flag: { sticky: true },
    userId: OUT,
    cohorts: [],
    expected: { enabled: false, reason: "PERCENTAGE", persist: true },
  },
  {
    name: "non-sticky, user below percentage, unrelated cohort",
    flag: {},
    userId: IN,
    cohorts: ["other"],
    expected: on("PERCENTAGE"),
  },
  {
    name: "non-sticky, user above percentage",
    flag: {},
    userId: OUT,
    cohorts: [],
    expected: off("PERCENTAGE"),
  },
  {
    name: "0% rollout, user below 50",
    flag: { percentage: 0 },
    userId: IN,
    cohorts: [],
    expected: off("PERCENTAGE"),
  },
  {
    name: "100% rollout, user above 50",
    flag: { percentage: 100 },
    userId: OUT,
    cohorts: [],
    expected: on("PERCENTAGE"),
  },
];

describe("evaluate precedence matrix", () => {
  it.each(rows)(
    "$name → $expected.reason",
    ({ flag, userId, cohorts, stored, expected }) => {
      const f = flag === null ? null : { ...BASE, ...flag };
      expect(evaluate(f, { userId, cohorts }, stored)).toEqual(expected);
    },
  );
});
