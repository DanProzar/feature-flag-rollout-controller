import { describe, expect, it } from "vitest";
import { loadConfig } from "../config";

const VALID = {
  MONGODB_URI: "mongodb://localhost:27017",
  MONGODB_DB: "feature_flags",
};

describe("loadConfig", () => {
  it("parses a valid environment", () => {
    expect(loadConfig({ ...VALID, OTHER: "ignored" })).toEqual({
      mongodbUri: "mongodb://localhost:27017",
      mongodbDb: "feature_flags",
    });
  });

  it.each(["MONGODB_URI", "MONGODB_DB"])(
    "throws naming %s when it is missing",
    (name) => {
      const env: Record<string, string> = { ...VALID };
      delete env[name];
      expect(() => loadConfig(env)).toThrow(name);
    },
  );

  it.each(["MONGODB_URI", "MONGODB_DB"])(
    "throws naming %s when it is empty",
    (name) => {
      expect(() => loadConfig({ ...VALID, [name]: "" })).toThrow(name);
    },
  );

  it("names both variables when both are missing", () => {
    expect(() => loadConfig({})).toThrow(/MONGODB_URI[\s\S]*MONGODB_DB/);
  });
});
