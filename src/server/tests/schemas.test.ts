import { describe, expect, it } from "vitest";
import {
  EvaluateBodySchema,
  FlagKeySchema,
  PutFlagBodySchema,
  ResetBodySchema,
} from "../schemas";

const BODY = {
  enabled: true,
  percentage: 50,
  includeCohorts: ["beta"],
  excludeCohorts: ["internal"],
  sticky: false,
};

/** The field names that failed, as `z.flattenError(...).fieldErrors` would report them. */
function failedFields(result: {
  error?: { issues: { path: PropertyKey[] }[] };
}) {
  return [...new Set(result.error?.issues.map((i) => String(i.path[0])))];
}

describe("FlagKeySchema", () => {
  it.each(["a", "new-checkout", "v2.search_beta", "0", "a".repeat(100)])(
    "accepts %j",
    (key) => {
      expect(FlagKeySchema.parse(key)).toBe(key);
    },
  );

  it.each(["", "-x", ".x", "_x", "Upper", "has space", "a/b", "a".repeat(101)])(
    "rejects %j",
    (key) => {
      expect(FlagKeySchema.safeParse(key).success).toBe(false);
    },
  );
});

describe("PutFlagBodySchema", () => {
  it("parses a full body", () => {
    expect(PutFlagBodySchema.parse(BODY)).toStrictEqual(BODY);
  });

  it.each(Object.keys(BODY))("reports a missing %s on that field", (field) => {
    const body: Record<string, unknown> = { ...BODY };
    delete body[field];
    const result = PutFlagBodySchema.safeParse(body);
    expect(result.success).toBe(false);
    expect(failedFields(result)).toEqual([field]);
  });

  it.each([-1, 101, 50.5, "50", null])(
    "rejects percentage %j",
    (percentage) => {
      const result = PutFlagBodySchema.safeParse({ ...BODY, percentage });
      expect(failedFields(result)).toEqual(["percentage"]);
    },
  );

  it.each([0, 100])("accepts percentage %j", (percentage) => {
    expect(PutFlagBodySchema.parse({ ...BODY, percentage }).percentage).toBe(
      percentage,
    );
  });

  it.each(["enabled", "sticky"])("rejects a non-boolean %s", (field) => {
    for (const value of ["true", 1, null]) {
      const result = PutFlagBodySchema.safeParse({ ...BODY, [field]: value });
      expect(failedFields(result)).toEqual([field]);
    }
  });

  it.each(["includeCohorts", "excludeCohorts"])(
    "trims, de-duplicates and validates %s",
    (field) => {
      const parsed = PutFlagBodySchema.parse({
        ...BODY,
        [field]: [" b ", "a", "b", "a ", "c"],
      });
      expect(parsed[field as keyof typeof parsed]).toEqual(["b", "a", "c"]);

      for (const bad of [[""], ["   "], ["ok", " "], [1], "admin"]) {
        const result = PutFlagBodySchema.safeParse({ ...BODY, [field]: bad });
        expect(failedFields(result)).toEqual([field]);
      }
    },
  );

  it("strips a body key and other unknown fields", () => {
    expect(
      PutFlagBodySchema.parse({ ...BODY, key: "other", description: "x" }),
    ).toStrictEqual(BODY);
  });
});

describe("EvaluateBodySchema", () => {
  it("trims userId and keeps cohorts", () => {
    expect(
      EvaluateBodySchema.parse({ userId: " u1 ", cohorts: ["a", " a", "b"] }),
    ).toStrictEqual({ userId: "u1", cohorts: ["a", "b"] });
  });

  it("defaults cohorts to []", () => {
    expect(EvaluateBodySchema.parse({ userId: "u1" })).toStrictEqual({
      userId: "u1",
      cohorts: [],
    });
  });

  it.each([{}, { userId: "" }, { userId: "  " }, { userId: 1 }])(
    "rejects userId in %j",
    (body) => {
      expect(failedFields(EvaluateBodySchema.safeParse(body))).toEqual([
        "userId",
      ]);
    },
  );

  it.each([[[""]], [[" "]], [[1]], ["admin"]])(
    "rejects cohorts %j",
    (cohorts) => {
      const result = EvaluateBodySchema.safeParse({ userId: "u1", cohorts });
      expect(failedFields(result)).toEqual(["cohorts"]);
    },
  );

  it("strips unknown fields", () => {
    expect(
      EvaluateBodySchema.parse({ userId: "u1", cohorts: [], extra: 1 }),
    ).toStrictEqual({ userId: "u1", cohorts: [] });
  });
});

describe("ResetBodySchema", () => {
  it.each([
    ["2026-01-01T00:00:00Z", "2026-01-01T00:00:00.000Z"],
    ["2026-01-01T00:00:00.123Z", "2026-01-01T00:00:00.123Z"],
    ["2026-01-01T02:00:00+02:00", "2026-01-01T00:00:00.000Z"],
  ])("converts %j to a Date of that instant", (now, iso) => {
    const parsed = ResetBodySchema.parse({ now });
    expect(parsed.now).toBeInstanceOf(Date);
    expect(parsed.now.toISOString()).toBe(iso);
  });

  it.each([
    {},
    { now: "" },
    { now: "yesterday" },
    { now: "2026-01-01" },
    { now: 1767225600000 },
    { now: null },
  ])("rejects %j", (body) => {
    expect(failedFields(ResetBodySchema.safeParse(body))).toEqual(["now"]);
  });
});
