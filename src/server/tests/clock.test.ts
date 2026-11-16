import { describe, expect, it } from "vitest";
import * as clockModule from "../clock";
import { appClock } from "../clock";

describe("appClock", () => {
  it("follows the system clock", () => {
    const before = Date.now();
    const now = appClock.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  it("returns a fresh Date on every call", () => {
    expect(appClock.now()).not.toBe(appClock.now());
  });

  it("cannot be frozen: the module exports only appClock", () => {
    expect(Object.keys(clockModule)).toEqual(["appClock"]);
  });
});
