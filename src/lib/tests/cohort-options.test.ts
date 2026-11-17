import { describe, expect, it } from "vitest";
import {
  cohortItems,
  cohortOptions,
  createdCohort,
  createItem,
  itemsToCohorts,
} from "../cohort-options";

describe("createItem / createdCohort", () => {
  it("round-trips the typed cohort", () => {
    expect(createdCohort(createItem("beta"))).toBe("beta");
  });

  it("is null for an ordinary item", () => {
    expect(createdCohort("beta")).toBeNull();
  });
});

describe("cohortItems", () => {
  it("lists catalogue then selected cohorts, once each", () => {
    expect(cohortItems(["admin", "user"], ["user", "beta"], "")).toEqual([
      "admin",
      "user",
      "beta",
    ]);
  });

  it("adds a create item for new typed text, trimmed", () => {
    expect(cohortItems(["admin"], [], "  beta ")).toEqual([
      "admin",
      createItem("beta"),
    ]);
  });

  it("adds no create item for blank or known text", () => {
    expect(cohortItems(["admin"], ["beta"], "   ")).toEqual(["admin", "beta"]);
    expect(cohortItems(["admin"], ["beta"], "admin")).toEqual([
      "admin",
      "beta",
    ]);
    expect(cohortItems(["admin"], ["beta"], " beta ")).toEqual([
      "admin",
      "beta",
    ]);
  });
});

describe("itemsToCohorts", () => {
  it("unwraps create items, trims, and drops blanks and repeats", () => {
    expect(
      itemsToCohorts(["admin", createItem(" beta "), "beta", "admin", " "]),
    ).toEqual(["admin", "beta"]);
  });
});

describe("cohortOptions", () => {
  it("keeps only key and name, in order", () => {
    const catalogue = [
      { key: "admin", name: "Admins", description: "Staff" },
      { key: "tester", name: "Testers", description: "QA" },
    ];
    expect(cohortOptions(catalogue)).toStrictEqual([
      { key: "admin", name: "Admins" },
      { key: "tester", name: "Testers" },
    ]);
  });
});
