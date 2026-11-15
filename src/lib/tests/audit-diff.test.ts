import { describe, expect, it } from "vitest";
import type { Flag } from "../../domain";
import { diffFlags, type FlagField, formatFieldValue } from "../audit-diff";

const FLAG: Flag = {
  key: "demo",
  enabled: true,
  percentage: 25,
  includeCohorts: ["tester"],
  excludeCohorts: [],
  sticky: false,
};

describe("diffFlags", () => {
  it("lists every field except key when the flag was created", () => {
    expect(diffFlags(null, FLAG)).toStrictEqual([
      { field: "enabled", before: undefined, after: true },
      { field: "percentage", before: undefined, after: 25 },
      { field: "includeCohorts", before: undefined, after: ["tester"] },
      { field: "excludeCohorts", before: undefined, after: [] },
      { field: "sticky", before: undefined, after: false },
    ]);
  });

  it("lists only changed fields", () => {
    expect(
      diffFlags(FLAG, { ...FLAG, percentage: 50, sticky: true }),
    ).toStrictEqual([
      { field: "percentage", before: 25, after: 50 },
      { field: "sticky", before: false, after: true },
    ]);
  });

  it("compares cohort arrays by value, in order", () => {
    const before = { ...FLAG, includeCohorts: ["a", "b"] };
    expect(
      diffFlags(before, { ...before, includeCohorts: ["a", "b"] }),
    ).toEqual([]);
    expect(
      diffFlags(before, { ...before, includeCohorts: ["b", "a"] }),
    ).toEqual([
      { field: "includeCohorts", before: ["a", "b"], after: ["b", "a"] },
    ]);
    expect(diffFlags(before, { ...before, includeCohorts: ["a"] })).toEqual([
      { field: "includeCohorts", before: ["a", "b"], after: ["a"] },
    ]);
  });

  it("returns no changes for identical flags", () => {
    expect(diffFlags(FLAG, { ...FLAG })).toEqual([]);
  });

  it("never lists the key", () => {
    expect(diffFlags(FLAG, { ...FLAG, key: "other" })).toEqual([]);
  });
});

describe("formatFieldValue", () => {
  it.each<[FlagField, Flag[FlagField] | undefined, string]>([
    ["percentage", 40, "40%"],
    ["enabled", true, "live"],
    ["enabled", false, "killed"],
    ["sticky", true, "yes"],
    ["sticky", false, "no"],
    ["includeCohorts", ["a", "b"], "a, b"],
    ["excludeCohorts", [], "none"],
    ["percentage", undefined, "—"],
  ])("formats %s %j as %j", (field, value, text) => {
    expect(formatFieldValue(field, value)).toBe(text);
  });
});
