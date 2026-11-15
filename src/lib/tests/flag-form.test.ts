import { describe, expect, it } from "vitest";
import type { Flag } from "../../domain";
import {
  emptyFlagForm,
  type FlagFormValues,
  flagToForm,
  formToPutBody,
  issuesToFieldErrors,
  validateFlagForm,
} from "../flag-form";

const FLAG: Flag = {
  key: "new-checkout",
  enabled: true,
  percentage: 25,
  includeCohorts: ["tester"],
  excludeCohorts: ["admin"],
  sticky: true,
};

function values(overrides: Partial<FlagFormValues> = {}): FlagFormValues {
  return { ...flagToForm(FLAG), ...overrides };
}

describe("emptyFlagForm", () => {
  it("defaults to a live, 0%, non-sticky flag with no key or cohorts", () => {
    expect(emptyFlagForm()).toStrictEqual({
      key: "",
      enabled: true,
      percentage: 0,
      includeCohorts: [],
      excludeCohorts: [],
      sticky: false,
    });
  });

  it("returns fresh arrays each time", () => {
    emptyFlagForm().includeCohorts.push("x");
    expect(emptyFlagForm().includeCohorts).toEqual([]);
  });
});

describe("flagToForm / formToPutBody", () => {
  it("round-trips a flag into the five PUT fields, without the key", () => {
    const form = flagToForm(FLAG);
    expect(form).toStrictEqual(FLAG);
    expect(formToPutBody(form)).toStrictEqual({
      enabled: true,
      percentage: 25,
      includeCohorts: ["tester"],
      excludeCohorts: ["admin"],
      sticky: true,
    });
  });

  it("copies the cohort arrays", () => {
    const form = flagToForm(FLAG);
    form.includeCohorts.push("x");
    expect(FLAG.includeCohorts).toEqual(["tester"]);
    formToPutBody(form).excludeCohorts.push("y");
    expect(form.excludeCohorts).toEqual(["admin"]);
  });
});

describe("validateFlagForm", () => {
  it("accepts a valid form", () => {
    expect(validateFlagForm(values(), [], "create")).toStrictEqual({
      valid: true,
      errors: {},
      warnings: {},
    });
  });

  it.each(["", "Bad Key", "-x", ".x", "a/b", "x".repeat(101)])(
    "rejects the key %j",
    (key) => {
      const result = validateFlagForm(values({ key }), [], "create");
      expect(result.valid).toBe(false);
      expect(result.errors.key).toHaveLength(1);
    },
  );

  it("rejects an existing key on create but not on edit", () => {
    const keys = ["new-checkout", "other"];
    const created = validateFlagForm(values(), keys, "create");
    expect(created.valid).toBe(false);
    expect(created.errors.key).toEqual(["A flag with this key already exists"]);
    expect(validateFlagForm(values(), keys, "edit").valid).toBe(true);
  });

  it.each([-1, 101, 50.5, Number.NaN])(
    "rejects the percentage %s",
    (percentage) => {
      const result = validateFlagForm(values({ percentage }), [], "create");
      expect(result.valid).toBe(false);
      expect(result.errors.percentage).toEqual([
        "Must be a whole number from 0 to 100",
      ]);
    },
  );

  it.each([0, 100])("accepts the percentage %s", (percentage) => {
    expect(validateFlagForm(values({ percentage }), [], "create").valid).toBe(
      true,
    );
  });

  it("warns, without failing, when a cohort is both included and excluded", () => {
    const result = validateFlagForm(
      values({ includeCohorts: ["a", "b"], excludeCohorts: ["b", "c", "a"] }),
      [],
      "create",
    );
    expect(result.valid).toBe(true);
    expect(result.warnings).toStrictEqual({
      excludeCohorts: ["Also included: b, a. Exclude wins for these cohorts."],
    });
  });
});

describe("issuesToFieldErrors", () => {
  it("keeps form fields with messages and drops everything else", () => {
    expect(
      issuesToFieldErrors({
        percentage: ["Too big"],
        includeCohorts: ["Too small"],
        sticky: undefined,
        enabled: [],
        bogus: ["ignored"],
      }),
    ).toStrictEqual({
      percentage: ["Too big"],
      includeCohorts: ["Too small"],
    });
  });

  it("maps an empty issues object to no errors", () => {
    expect(issuesToFieldErrors({})).toStrictEqual({});
  });
});
