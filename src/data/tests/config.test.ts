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
      serverSelectionTimeoutMs: 5000,
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

  describe("MONGODB_SERVER_SELECTION_TIMEOUT_MS", () => {
    const VAR = "MONGODB_SERVER_SELECTION_TIMEOUT_MS";

    it("defaults to 5000 when absent", () => {
      expect(loadConfig(VALID).serverSelectionTimeoutMs).toBe(5000);
    });

    it("parses a positive integer", () => {
      expect(
        loadConfig({ ...VALID, [VAR]: "2500" }).serverSelectionTimeoutMs,
      ).toBe(2500);
    });

    it.each(["0", "-1", "abc", "1.5", "", " 10"])(
      "throws naming the variable for %j",
      (value) => {
        expect(() => loadConfig({ ...VALID, [VAR]: value })).toThrow(VAR);
      },
    );
  });
});
