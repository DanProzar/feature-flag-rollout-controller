import { afterEach, describe, expect, it, vi } from "vitest";
import { testEndpointsEnabled } from "../config";

afterEach(() => vi.unstubAllEnvs());

describe("testEndpointsEnabled", () => {
  it('is true only for "true"', () => {
    expect(testEndpointsEnabled({ ENABLE_TEST_ENDPOINTS: "true" })).toBe(true);
  });

  it.each([undefined, "", "false", "TRUE", "1", " true"])(
    "is false for %j",
    (value) => {
      expect(testEndpointsEnabled({ ENABLE_TEST_ENDPOINTS: value })).toBe(
        false,
      );
    },
  );

  it("reads process.env at call time by default", () => {
    vi.stubEnv("ENABLE_TEST_ENDPOINTS", "true");
    expect(testEndpointsEnabled()).toBe(true);
    vi.stubEnv("ENABLE_TEST_ENDPOINTS", "false");
    expect(testEndpointsEnabled()).toBe(false);
  });
});
